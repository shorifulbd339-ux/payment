import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Hash, Banknote, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { CreatePaymentPayload, EPayCreateResponse } from '../types';

interface PaymentFormProps {
  onStartPayment?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = () => {
  const [formData, setFormData] = useState<CreatePaymentPayload>({
    customer_name: '',
    roll: '',
    amount: 1000,
    customer_phone: '01700000000',
    customer_email: '',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetAmounts = [500, 1000, 1500, 2000];

  const handlePresetSelect = (amt: number) => {
    setFormData((prev) => ({ ...prev, amount: amt }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.customer_name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.roll.trim()) {
      setError('Please enter your class roll number.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Please select or enter a valid amount.');
      return;
    }

    setIsLoading(true);

    const payload: CreatePaymentPayload = {
      ...formData,
      customer_phone: formData.customer_phone || '01700000000',
      customer_email: formData.customer_email || `${formData.roll.trim()}@farewell2026.com`,
    };

    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: EPayCreateResponse = await res.json();

      if (res.ok && data.status === 'success' && data.payment_url) {
        // Save pending metadata to localStorage so when ePay returns, we verify and save to Firestore
        const pendingPayment = {
          order_id: data.order_id,
          reference_id: data.reference_id,
          customer_name: payload.customer_name,
          roll: payload.roll,
          amount: payload.amount,
          customer_phone: payload.customer_phone,
          customer_email: payload.customer_email,
          notes: '',
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('pending_farewell_payment', JSON.stringify(pendingPayment));

        // Redirect to ePay gateway URL
        window.location.href = data.payment_url;
      } else {
        setError(data.message || 'Failed to generate payment gateway link. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      setError('Could not connect to payment server. Please check your internet connection.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-[#E5E7EB] rounded-[32px] p-6 md:p-8 shadow-sm relative overflow-hidden"
    >
      <div className="flex items-center gap-3 pb-6 mb-6 border-b border-[#F3F4F6]">
        <div className="w-10 h-10 rounded-2xl bg-[#F0F2FF] border border-[#D0D7FF] flex items-center justify-center text-[#2D336B] font-bold">
          <Banknote className="w-5 h-5 text-[#2D336B]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1A1A1A]">Fee Payment Form</h3>
          <p className="text-xs text-[#71717A]">Enter student details and proceed to secure online payment</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 font-medium"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Field 1: Name */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#2D336B]" />
            <span>Student Full Name *</span>
          </label>
          <div className="relative">
            <input
              id="input-customer-name"
              type="text"
              required
              placeholder="e.g. Tanvir Hasan"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] focus:bg-white transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Field 2: Roll */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-[#2D336B]" />
            <span>Class Roll Number *</span>
          </label>
          <div className="relative">
            <input
              id="input-customer-roll"
              type="text"
              required
              placeholder="e.g. 101"
              value={formData.roll}
              onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] focus:bg-white transition-all text-sm font-mono font-semibold"
            />
          </div>
        </div>

        {/* Field 3: Amount */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A1A] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-[#059669]" />
              <span>Payment Amount *</span>
            </span>
            <span className="text-[#059669] font-extrabold font-mono text-xs sm:text-sm bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0] shadow-2xs">
              ৳ {formData.amount ? formData.amount.toLocaleString() : 0}
            </span>
          </label>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-2.5">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handlePresetSelect(amt)}
                className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                  formData.amount === amt
                    ? 'bg-[#2D336B] border-[#2D336B] text-white shadow-xs scale-[1.02]'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:border-[#2D336B] hover:text-[#2D336B]'
                }`}
              >
                ৳{amt}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#059669] font-bold font-mono text-sm select-none">
              ৳
            </span>
            <input
              id="input-customer-amount"
              type="number"
              min="1"
              required
              placeholder="Or enter custom amount manually (e.g. 500, 1000)"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-9 pr-4 py-3.5 text-[#059669] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:bg-white transition-all text-sm font-mono font-bold"
            />
          </div>
          <p className="text-[11px] text-[#71717A] mt-1.5 flex items-center gap-1">
            <span>💡 Select a preset above or type your custom amount in the box manually.</span>
          </p>
        </div>

        {/* Submit Button */}
        <motion.button
          id="btn-submit-payment"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 py-4 px-6 rounded-2xl bg-[#2D336B] hover:bg-[#1E234A] text-white font-bold text-base shadow-sm flex items-center justify-center gap-3 transition-all disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Loading Payment Gateway...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-indigo-200" />
              <span>Proceed to Pay Securely (৳ {formData.amount ? formData.amount.toLocaleString() : 0})</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </form>

      {/* Gateway Support Badges */}
      <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex flex-wrap items-center justify-center gap-4 text-xs text-[#71717A]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          bKash / Nagad / Rocket / Visa / Mastercard
        </span>
        <span className="text-[#E5E7EB]">•</span>
        <span>SSL Secure 256-Bit ePay Gateway</span>
      </div>
    </motion.div>
  );
};

