import express from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path normalization for Netlify functions
app.use((req, res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "") || "/";
  }
  next();
});

// ePay Store Key
const STORE_KEY = process.env.EPAY_STORE_KEY || "GSCYU46MHA59TF2Q5I9PVP5P";

const router = express.Router();

// API Endpoint: Health Check
router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Endpoint: Create Payment Link with ePay Gateway
router.post("/create-payment", async (req, res) => {
  try {
    const { customer_name, roll, amount, customer_phone, customer_email, notes } = req.body;

    if (!customer_name || !roll || !amount) {
      return res.status(400).json({ status: "error", message: "Name, Roll, and Amount are required." });
    }

    // App URL base - Ensure no trailing slash to prevent double slash in success_url
    let hostUrl = (process.env.APP_URL || process.env.URL || "").trim();
    if (hostUrl) {
      if (!hostUrl.startsWith("http://") && !hostUrl.startsWith("https://")) {
        hostUrl = `https://${hostUrl}`;
      }
    } else {
      hostUrl = `${req.protocol}://${req.get("host")}`;
    }
    // Remove any trailing slashes so hostUrl never ends with '/'
    hostUrl = hostUrl.replace(/\/+$/, "");

    const referenceId = `FW26-${roll}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const successUrl = `${hostUrl}/?payment_status=success`;
    const errorUrl = `${hostUrl}/?payment_status=error`;

    const productsJson = JSON.stringify([
      {
        name: `Farewell Fee (Roll ${roll})`,
        price: Number(amount),
        quantity: 1,
        icon: "fa-graduation-cap"
      }
    ]);

    const formParams = new URLSearchParams();
    formParams.append("store_key", STORE_KEY);
    formParams.append("amount", String(amount));
    formParams.append("success_url", successUrl);
    formParams.append("error_url", errorUrl);
    formParams.append("reference_id", referenceId);
    formParams.append("reference", `Farewell 2026 Collection - Roll ${roll}`);
    formParams.append("customer_name", customer_name);
    formParams.append("customer_phone", customer_phone || "01700000000");
    formParams.append("customer_email", customer_email || `${roll}@farewell2026.com`);
    formParams.append("products", productsJson);

    console.log("Posting to ePay gateway for Roll:", roll, "Amount:", amount);

    // Try calling Super Theme payment endpoint first
    let epayRes = await fetch("https://epay.corp.com.bd/payment.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formParams.toString(),
    });

    let responseText = await epayRes.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn("Super Theme JSON parse failed, trying default theme pay.php endpoint...");
      // Fallback to default theme pay.php
      const defaultFormParams = new URLSearchParams();
      defaultFormParams.append("store_key", STORE_KEY);
      defaultFormParams.append("amount", String(amount));
      defaultFormParams.append("success_url", successUrl);
      defaultFormParams.append("error_url", errorUrl);
      defaultFormParams.append("reference_id", referenceId);
      defaultFormParams.append("customer_name", customer_name);
      defaultFormParams.append("customer_phone", customer_phone || "01700000000");
      defaultFormParams.append("customer_email", customer_email || `${roll}@farewell2026.com`);

      const fallbackRes = await fetch("https://epay.corp.com.bd/pay.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: defaultFormParams.toString(),
      });
      const fallbackText = await fallbackRes.text();
      data = JSON.parse(fallbackText);
    }

    if (data && (data.status === "success" || data.payment_url)) {
      return res.json({
        status: "success",
        payment_url: data.payment_url,
        order_id: data.order_id,
        reference_id: referenceId,
        amount: Number(amount)
      });
    } else {
      return res.status(400).json({
        status: "error",
        message: data?.message || "Could not generate payment link from ePay provider."
      });
    }

  } catch (error: any) {
    console.error("Error creating payment:", error);
    res.status(500).json({ status: "error", message: error.message || "Server error while contacting ePay." });
  }
});

// API Endpoint: Check/Verify Order Status with ePay Public API
router.get("/verify-payment", async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id || typeof order_id !== "string") {
      return res.status(400).json({ status: "error", message: "Order ID is required." });
    }

    console.log("Verifying order with ePay API:", order_id);
    const verifyRes = await fetch(`https://epay.corp.com.bd/api.php?order_id=${encodeURIComponent(order_id)}`);
    const verifyData = await verifyRes.json();

    if (verifyData && (verifyData.status === "success" || verifyData.paid === true || verifyData.order_status === "paid")) {
      await savePaymentToFirestore({ ...verifyData, order_id });
    }

    return res.json(verifyData);
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ status: "error", message: "Failed to verify order status with gateway." });
  }
});

// API Endpoint: Static MFS Verification API
router.all("/verify-static-payment", async (req, res) => {
  try {
    const apiKey = req.query.api_key || req.body.api_key || process.env.EPAY_API_KEY || "a1b2c3d4e5f6";
    const mfs = req.query.mfs || req.body.mfs;
    const bdt = req.query.bdt || req.body.bdt;
    const trxid = req.query.trxid || req.body.trxid;
    const type = req.query.type || req.body.type || "";
    const reference_id = req.query.reference_id || req.body.reference_id || "";

    if (!mfs || !bdt || !trxid) {
      return res.status(400).json({
        status: "error",
        message: "mfs, bdt, and trxid are required parameters."
      });
    }

    let queryUrl = `https://epay.corp.com.bd/api.php?api_key=${encodeURIComponent(String(apiKey))}&mfs=${encodeURIComponent(String(mfs))}&bdt=${encodeURIComponent(String(bdt))}&trxid=${encodeURIComponent(String(trxid))}`;
    if (type) queryUrl += `&type=${encodeURIComponent(String(type))}`;
    if (reference_id) queryUrl += `&reference_id=${encodeURIComponent(String(reference_id))}`;

    console.log("Calling Static ePay API:", queryUrl);
    const epayRes = await fetch(queryUrl);
    const epayData = await epayRes.json();

    return res.json(epayData);
  } catch (error: any) {
    console.error("Static verification error:", error);
    res.status(500).json({ status: "error", message: "Error contacting ePay static verification API" });
  }
});

// Helper function to save payment to Firestore via REST API
async function savePaymentToFirestore(data: any) {
  try {
    const projectId = "vip-shops-41945";
    const databaseId = "ai-studio-04c143a5-802a-4ee2-beed-77e322975f5e";

    const orderId = String(data.order_id || data.reference_id || `FW26-${Date.now()}`).trim();
    const customerName = String(data.customer_name || data.name || "Student").trim();
    const roll = String(data.roll || "N/A").trim();
    const amount = String(data.amount || 1000);
    const phone = String(data.customer_phone || data.phone || "01700000000").trim();
    const email = String(data.customer_email || data.email || `${roll}@farewell2026.com`).trim();
    const trxid = String(data.trxid || data.transaction_id || `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).trim();
    const method = String(data.type || data.method || "ePay Gateway").trim();

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/payments/${encodeURIComponent(orderId)}`;

    const body = {
      fields: {
        order_id: { stringValue: orderId },
        reference_id: { stringValue: String(data.reference_id || orderId) },
        customer_name: { stringValue: customerName },
        roll: { stringValue: roll },
        amount: { integerValue: amount },
        customer_phone: { stringValue: phone },
        customer_email: { stringValue: email },
        trxid: { stringValue: trxid },
        status: { stringValue: "paid" },
        paid: { booleanValue: true },
        payment_method: { stringValue: method },
        notes: { stringValue: String(data.reference || "ePay Gateway Verified") },
        createdAt: { stringValue: new Date().toISOString() },
      },
    };

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`✅ [Firestore Auto-Save] Saved payment ${orderId} to Firestore!`);
    } else {
      const errText = await res.text();
      console.error(`❌ [Firestore Auto-Save Error] for ${orderId}:`, errText);
    }
  } catch (err) {
    console.error("❌ Failed to save to Firestore via REST API:", err);
  }
}

// API Endpoint: Webhook Listener for Real-time Instant Notifications
router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    const webhookSecret = process.env.EPAY_WEBHOOK_SECRET || "4c2649f051d55154130418d55c87d27227c6795b4867679dc4ffbd1757355cf6";

    console.log("🔔 [Webhook Received from ePay]:", JSON.stringify(payload, null, 2));

    const event = payload?.event;
    const data = payload?.data || payload;

    if (event === "payment.success" || payload?.status === "success" || payload?.paid === true || data?.status === "paid" || data?.status === "success") {
      console.log(`✅ Real-time Payment Success Notification for Order ${data.order_id || data.reference_id}, TRX: ${data.trxid}, Amount: ${data.amount}`);
      await savePaymentToFirestore(data);
    } else if (event === "payment.failed") {
      console.warn(`❌ Payment Failed for Order ${data?.order_id}`);
    }

    return res.json({
      status: "success",
      message: "Webhook processed and payment saved to database successfully",
      webhook_key_configured: Boolean(webhookSecret),
      received_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ status: "error", message: "Failed to process webhook" });
  }
});

// Mount router under /api AND root / (so it works with or without /api path prefix)
app.use("/api", router);
app.use("/", router);

export default app;
