import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Users, Banknote, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { PaymentRecord } from '../types';

interface PaidStudentsListProps {
  payments: PaymentRecord[];
  isLoading: boolean;
}

export const PaidStudentsList: React.FC<PaidStudentsListProps> = ({
  payments,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only paid or manual payments
  const paidList = payments.filter((p) => p.paid || p.status === 'paid' || p.status === 'manual');

  const filteredPayments = paidList.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.customer_name.toLowerCase().includes(term) ||
      p.roll.toLowerCase().includes(term) ||
      (p.trxid && p.trxid.toLowerCase().includes(term))
    );
  });

  const totalAmount = paidList.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-[#E5E7EB] rounded-[32px] p-6 md:p-8 shadow-sm space-y-6"
    >
      {/* Title & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F3F4F6]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#2D336B] mb-1">
            <Sparkles className="w-4 h-4 text-[#2D336B]" />
            <span>Class Farewell 2026 Contributor Directory</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#1A1A1A]">Verified Contributors</h3>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-[#ECFDF5] border border-[#D1FAE5] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-[#059669] shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#059669] font-bold uppercase tracking-wider">Total Paid</p>
              <p className="text-base font-bold text-[#059669] font-mono">{paidList.length} Students</p>
            </div>
          </div>

          <div className="bg-[#F5F3FF] border border-[#DDD6FE] px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-[#7C3AED] shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#7C3AED] font-bold uppercase tracking-wider">Total Raised</p>
              <p className="text-base font-bold text-[#7C3AED] font-mono">৳ {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#A1A1AA] absolute left-4 top-3.5" />
        <input
          id="input-search-paid-students"
          type="text"
          placeholder="Search by Student Name, Roll Number, or Transaction ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl pl-11 pr-4 py-3 text-[#1A1A1A] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#2D336B] transition-all text-sm font-medium"
        />
      </div>

      {/* List / Table */}
      {isLoading ? (
        <div className="py-12 text-center text-[#71717A] text-sm">
          Loading records from database...
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="py-12 text-center bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] p-6 space-y-2">
          <ShieldAlert className="w-8 h-8 text-[#A1A1AA] mx-auto" />
          <p className="text-[#1A1A1A] font-bold text-sm">No Records Found</p>
          <p className="text-xs text-[#71717A]">
            {searchTerm ? 'No student records matched your search query.' : 'No fees submitted yet. Be the first to contribute!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((student, idx) => (
            <motion.div
              key={student.id || student.order_id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-[#F9FAFB] hover:bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F0F2FF] border border-[#D0D7FF] flex items-center justify-center text-[#2D336B] font-mono font-bold text-sm shrink-0">
                  #{student.roll}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#1A1A1A] text-base">{student.customer_name}</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#D1FAE5] text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> PAID
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Roll: <strong className="text-[#1A1A1A] font-mono">{student.roll}</strong></span>
                    <span>•</span>
                    <span>Method: {student.payment_method || 'ePay Gateway'}</span>
                    {student.trxid && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[#2D336B] text-[11px]">Trx: {student.trxid}</span>
                      </>
                    )}
                  </p>
                  {student.notes && (
                    <p className="text-xs text-[#2D336B] italic mt-1 bg-[#F0F2FF] px-2.5 py-1 rounded-xl border border-[#D0D7FF] inline-block">
                      "{student.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E7EB]">
                <p className="text-lg font-black text-[#059669] font-mono">
                  ৳ {student.amount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#A1A1AA]">
                  {student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

