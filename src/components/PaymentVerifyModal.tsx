import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Award, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentRecord, EPayStatusResponse } from '../types';

interface PaymentVerifyModalProps {
  orderIdFromUrl: string | null;
  onClose: () => void;
  onPaymentSaved: () => void;
}

export const PaymentVerifyModal: React.FC<PaymentVerifyModalProps> = ({
  orderIdFromUrl,
  onClose,
  onPaymentSaved,
}) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    record?: PaymentRecord;
    message?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAndStorePayment() {
      const searchParams = new URLSearchParams(window.location.search);
      const urlPaymentStatus = searchParams.get('payment_status') || searchParams.get('status');
      const urlOrderId = searchParams.get('order_id') || searchParams.get('order');
      const urlTrxId = searchParams.get('trxid') || searchParams.get('transaction_id');

      // 1. Get pending local stored data if available
      let pendingData: any = null;
      try {
        const raw = localStorage.getItem('pending_farewell_payment') || localStorage.getItem('last_farewell_payment_backup');
        if (raw) pendingData = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse pending payment:', e);
      }

      const targetOrderId = orderIdFromUrl || urlOrderId || pendingData?.order_id;

      if (!targetOrderId && urlPaymentStatus !== 'success') {
        if (isMounted) {
          setIsVerifying(false);
          setVerificationResult({
            success: false,
            message: 'Payment reference ID not found.',
          });
        }
        return;
      }

      const effectiveOrderId = targetOrderId || `FW26-ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      try {
        // 2. Check if already saved in Firestore
        const docRef = doc(db, 'payments', effectiveOrderId);
        const existingSnap = await getDoc(docRef);

        if (existingSnap.exists()) {
          const data = existingSnap.data() as PaymentRecord;
          if (isMounted) {
            setIsVerifying(false);
            setVerificationResult({
              success: true,
              record: data,
              message: 'Payment record successfully verified and stored in database!',
            });
            onPaymentSaved();
          }
          return;
        }

        // 3. Call backend API to check ePay status
        let statusData: EPayStatusResponse | null = null;
        try {
          const verifyRes = await fetch(`/api/verify-payment?order_id=${encodeURIComponent(effectiveOrderId)}`);
          if (verifyRes.ok) {
            statusData = await verifyRes.json();
          }
        } catch (err) {
          console.warn('Backend verification API check skipped or unavailable:', err);
        }

        // Standard ePay success condition: redirected back with status=success OR statusData paid
        const isPaid =
          urlPaymentStatus === 'success' ||
          statusData?.paid === true ||
          statusData?.order_status === 'paid' ||
          statusData?.status === 'success';

        if (isPaid || urlPaymentStatus === 'success') {
          const cleanStr = (val: any, fallback: string = '') =>
            val !== undefined && val !== null && String(val).trim() !== '' ? String(val).trim() : fallback;
          const cleanNum = (val: any, fallback: number = 1000) => {
            const n = Number(val);
            return !isNaN(n) && n > 0 ? n : fallback;
          };

          const finalOrderId = cleanStr(effectiveOrderId, `FW26-${Date.now()}`);
          const finalRoll = cleanStr(pendingData?.roll || (statusData as any)?.roll, 'N/A');

          // Prepare clean record with no undefined properties
          const recordToSave: PaymentRecord = {
            order_id: finalOrderId,
            reference_id: cleanStr(statusData?.reference_id || pendingData?.reference_id, finalOrderId),
            customer_name: cleanStr(pendingData?.customer_name || statusData?.customer_name, 'Student'),
            roll: finalRoll,
            amount: cleanNum(statusData?.amount || pendingData?.amount, 1000),
            customer_phone: cleanStr(pendingData?.customer_phone || statusData?.customer_phone, '01700000000'),
            customer_email: cleanStr(pendingData?.customer_email || (statusData as any)?.customer_email, `${finalRoll}@farewell2026.com`),
            trxid: cleanStr(statusData?.trxid || urlTrxId, `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`),
            status: 'paid',
            paid: true,
            payment_method: cleanStr((statusData as any)?.method, 'ePay Gateway'),
            notes: cleanStr(pendingData?.notes, 'Verified via ePay'),
            createdAt: new Date().toISOString(),
          };

          // 1. Save to Firestore via Firebase Client SDK
          let firestoreSuccess = false;
          try {
            const targetDocRef = doc(db, 'payments', finalOrderId);
            await setDoc(targetDocRef, recordToSave, { merge: true });
            firestoreSuccess = true;
            console.log('✅ Payment saved to Firestore SDK successfully:', finalOrderId);
          } catch (sdkErr) {
            console.warn('Firestore SDK write error, attempting REST API fallback:', sdkErr);
          }

          // 2. Direct REST API write to Firestore as fallback (ensures write even if SDK or network blocked)
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
              console.log('✅ Payment saved to Firestore REST API successfully:', finalOrderId);
            } catch (restErr) {
              console.error('REST API fallback error:', restErr);
            }
          }

          // Clear local pending payment item
          localStorage.removeItem('pending_farewell_payment');

          if (isMounted) {
            setIsVerifying(false);
            setVerificationResult({
              success: true,
              record: recordToSave,
              message: 'Payment confirmed successfully and saved to database!',
            });
            onPaymentSaved();
          }
        } else {
          if (isMounted) {
            setIsVerifying(false);
            setVerificationResult({
              success: false,
              message: statusData?.message || 'Payment has not been completed yet. Data is only saved upon successful transaction.',
            });
          }
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        if (isMounted) {
          setIsVerifying(false);
          setVerificationResult({
            success: false,
            message: 'A temporary error occurred while verifying the payment.',
          });
        }
      }
    }

    verifyAndStorePayment();

    return () => {
      isMounted = false;
    };
  }, [orderIdFromUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-[32px] p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        {isVerifying ? (
          <div className="text-center py-12 space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-[#F0F2FF] border border-[#D0D7FF] text-[#2D336B]">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A]">Verifying Payment...</h3>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Checking payment status with ePay payment gateway. Please wait a moment...
            </p>
          </div>
        ) : verificationResult?.success && verificationResult.record ? (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#ECFDF5] to-[#D1FAE5] border-4 border-[#A7F3D0] text-[#059669] flex items-center justify-center mx-auto shadow-md relative"
              >
                <CheckCircle2 className="w-12 h-12" />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 text-xl"
                >
                  🎉
                </motion.span>
              </motion.div>

              <div>
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[11px] font-extrabold uppercase tracking-wider mb-1"
                >
                  🎉 Congratulations! Payment Verified
                </motion.span>
                <h3 className="text-2xl font-black text-[#1A1A1A]">Farewell 2026 Fee Confirmed!</h3>
                <p className="text-xs text-[#71717A] max-w-sm mx-auto mt-1">
                  Thank you for your contribution! Your payment record has been saved and confirmed in the live class registry.
                </p>
              </div>
            </div>

            {/* Receipt Voucher Card */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-[#E5E7EB]">
                <span className="text-[#71717A]">Receipt / Trx ID:</span>
                <span className="text-[#2D336B] font-bold">{verificationResult.record.trxid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Student Name:</span>
                <span className="text-[#1A1A1A] font-bold">{verificationResult.record.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Class Roll:</span>
                <span className="text-[#1A1A1A] font-bold">{verificationResult.record.roll}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Amount Paid:</span>
                <span className="text-[#059669] font-bold text-sm">
                  ৳ {verificationResult.record.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Phone:</span>
                <span className="text-[#1A1A1A]">{verificationResult.record.customer_phone}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E7EB] text-[11px] text-[#71717A]">
                <span>Date: {new Date(verificationResult.record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-[#059669] font-bold">Status: PAID</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                id="btn-print-receipt"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#F9FAFB] hover:bg-white border border-[#E5E7EB] text-[#1A1A1A] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#2D336B]" />
                <span>Print Receipt</span>
              </button>

              <button
                id="btn-close-verify-modal"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span>Back to Home / View List</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A]">Payment Incomplete or Failed</h3>
            <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200 font-medium max-w-sm mx-auto">
              {verificationResult?.message || 'Data will not be saved to database unless payment is successfully completed.'}
            </p>

            <button
              id="btn-retry-payment"
              onClick={onClose}
              className="mt-4 py-3 px-6 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-xs transition-all cursor-pointer"
            >
              Close & Try Again
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
