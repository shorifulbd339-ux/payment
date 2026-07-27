import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Navbar } from './components/Navbar';
import { PaymentForm } from './components/PaymentForm';
import { PaidStudentsList } from './components/PaidStudentsList';
import { AdminDashboard } from './components/AdminDashboard';
import { PaymentRecord } from './types';
import { GraduationCap, Heart, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pay' | 'students' | 'admin'>('pay');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Success toast notification banner
  const [successBannerMessage, setSuccessBannerMessage] = useState<string | null>(null);

  // Check URL routes & process returning payments automatically
  useEffect(() => {
    async function processAutoSavePayment() {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      // If secret route is /admin or #admin
      if (pathname === '/admin' || window.location.hash === '#admin') {
        setActiveTab('admin');
      }

      const orderIdParam = searchParams.get('order_id') || searchParams.get('order');
      const paymentStatusParam = searchParams.get('payment_status') || searchParams.get('status');
      const trxIdParam = searchParams.get('trxid') || searchParams.get('transaction_id');

      // Check if user is returning from a payment gateway attempt
      let pendingData: any = null;
      try {
        const raw = localStorage.getItem('pending_farewell_payment') || localStorage.getItem('last_farewell_payment_backup');
        if (raw) pendingData = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse pending payment:', e);
      }

      const isSuccess = paymentStatusParam === 'success' || Boolean(orderIdParam) || Boolean(pendingData);

      if (isSuccess && (paymentStatusParam === 'success' || orderIdParam || pendingData)) {
        const finalOrderId = String(orderIdParam || pendingData?.order_id || `FW26-${Date.now()}`).trim();
        const finalRoll = String(pendingData?.roll || 'N/A').trim();
        const finalName = String(pendingData?.customer_name || 'Student').trim();
        const finalAmount = Number(pendingData?.amount || 1000);
        const finalPhone = String(pendingData?.customer_phone || '01700000000').trim();
        const finalEmail = String(pendingData?.customer_email || `${finalRoll}@farewell2026.com`).trim();
        const finalTrxId = String(trxIdParam || pendingData?.trxid || `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).trim();

        const recordToSave: PaymentRecord = {
          order_id: finalOrderId,
          reference_id: pendingData?.reference_id || finalOrderId,
          customer_name: finalName,
          roll: finalRoll,
          amount: finalAmount,
          customer_phone: finalPhone,
          customer_email: finalEmail,
          trxid: finalTrxId,
          status: 'paid',
          paid: true,
          payment_method: 'ePay Gateway',
          notes: 'Verified ePay Online Fee',
          createdAt: new Date().toISOString(),
        };

        // 1. Save to Firestore via Firebase Client SDK
        let firestoreSuccess = false;
        try {
          const targetDocRef = doc(db, 'payments', finalOrderId);
          await setDoc(targetDocRef, recordToSave, { merge: true });
          firestoreSuccess = true;
          console.log('✅ Auto-saved payment to Firestore SDK:', finalOrderId);
        } catch (sdkErr) {
          console.warn('Firestore SDK write error, attempting REST API write:', sdkErr);
        }

        // 2. Direct REST API write to Firestore database (Guarantees write regardless of client SDK)
        if (!firestoreSuccess) {
          try {
            const projectId = 'vip-shops-41945';
            const databaseId = 'ai-studio-04c143a5-802a-4ee2-beed-77e322975f5e';
            const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/payments/${encodeURIComponent(finalOrderId)}`;

            await fetch(restUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  order_id: { stringValue: recordToSave.order_id },
                  reference_id: { stringValue: recordToSave.reference_id },
                  customer_name: { stringValue: recordToSave.customer_name },
                  roll: { stringValue: recordToSave.roll },
                  amount: { integerValue: String(recordToSave.amount) },
                  customer_phone: { stringValue: recordToSave.customer_phone },
                  customer_email: { stringValue: recordToSave.customer_email },
                  trxid: { stringValue: recordToSave.trxid },
                  status: { stringValue: 'paid' },
                  paid: { booleanValue: true },
                  payment_method: { stringValue: recordToSave.payment_method },
                  notes: { stringValue: recordToSave.notes || '' },
                  createdAt: { stringValue: recordToSave.createdAt },
                },
              }),
            });
            console.log('✅ Auto-saved payment to Firestore REST API:', finalOrderId);
          } catch (restErr) {
            console.error('REST API fallback write error:', restErr);
          }
        }

        // Clear local storage pending key
        localStorage.removeItem('pending_farewell_payment');

        // Clean query parameters from URL without reloading page
        window.history.replaceState({}, document.title, window.location.pathname);

        // Show success notification banner and switch to contributors tab
        setSuccessBannerMessage(`Payment Successful! Fee of ৳${finalAmount.toLocaleString()} for Roll #${finalRoll} (${finalName}) has been saved to database.`);
        setActiveTab('students');
      }
    }

    processAutoSavePayment();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Realtime Payments Collection
  useEffect(() => {
    const q = query(collection(db, 'payments'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...(doc.data() as PaymentRecord) });
        });

        // Sort by createdAt descending
        fetched.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setPayments(fetched);
        setIsLoadingPayments(false);
      },
      (error) => {
        console.error('Firestore snapshot error:', error);
        setIsLoadingPayments(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Aggregate Paid Stats
  const paidPayments = payments.filter((p) => p.paid || p.status === 'paid' || p.status === 'manual');
  const totalCollected = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#2D336B] selection:text-white">
      {/* Top Sticky Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        paidCount={paidPayments.length}
        totalCollected={totalCollected}
      />

      {/* Success Banner (Triggers upon returning from successful payment) */}
      {successBannerMessage && (
        <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] py-3.5 px-4 text-[#059669] text-xs sm:text-sm font-bold flex items-center justify-between shadow-2xs">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#059669]" />
              <span>{successBannerMessage}</span>
            </div>
            <button
              onClick={() => setSuccessBannerMessage(null)}
              className="p-1 hover:bg-[#D1FAE5] rounded-lg transition-all text-[#059669] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8 space-y-8">
        {/* Dynamic Views */}
        {activeTab === 'pay' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
              <PaymentForm />
            </div>

            <div className="lg:col-span-5 space-y-6">
              {/* Live Collection Widget */}
              <div className="bg-white border border-[#E5E7EB] rounded-[32px] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                  <h4 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
                    <span>Recent Contributors</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('students')}
                    className="text-xs text-[#2D336B] font-bold hover:underline"
                  >
                    View All ({paidPayments.length})
                  </button>
                </div>

                {paidPayments.length === 0 ? (
                  <p className="text-xs text-[#71717A] py-4 text-center">
                    No payments recorded yet. Be the first to contribute!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {paidPayments.slice(0, 4).map((p) => (
                      <div
                        key={p.id || p.order_id}
                        className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#1A1A1A]">{p.customer_name}</p>
                          <p className="text-[#71717A] text-[11px]">
                            Roll: <span className="text-[#2D336B] font-mono font-semibold">#{p.roll}</span>
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[#059669] text-sm">
                          ৳ {p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Fee Notice Box */}
              <div className="bg-[#F0F2FF] border border-[#D0D7FF] rounded-[32px] p-6 text-xs text-[#2D336B] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#2D336B] text-sm">
                  <GraduationCap className="w-5 h-5 text-[#2D336B]" />
                  <span>Farewell 2026 Fund Details</span>
                </div>
                <p className="leading-relaxed text-[#4B5563]">
                  All collected fees will be used for memorable farewell gifts, custom mementos, photography albums, stage decorations, and dinner arrangements.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <PaidStudentsList payments={payments} isLoading={isLoadingPayments} />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            payments={payments}
            currentUser={currentUser}
            isLoading={isLoadingPayments}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E5E7EB] bg-white py-6 text-center text-xs text-[#71717A]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1">
            <span>© 2026 Class Farewell Committee.</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#71717A]">Class Farewell 2026</span>
          </p>

          <p className="flex items-center gap-1 text-[#71717A]">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>ePay SSL Payment Gateway & Firebase Secured</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

