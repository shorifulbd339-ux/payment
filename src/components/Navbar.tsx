import React from 'react';
import { GraduationCap, ListOrdered, CreditCard, Heart } from 'lucide-react';

interface NavbarProps {
  activeTab: 'pay' | 'students' | 'admin';
  setActiveTab: (tab: 'pay' | 'students' | 'admin') => void;
  paidCount: number;
  totalCollected: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  paidCount,
  totalCollected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FDFCFB]/90 backdrop-blur-md border-b border-[#E5E7EB] text-[#1A1A1A]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setActiveTab('pay')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#F0F2FF] border border-[#D0D7FF] p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center text-[#2D336B]">
            <GraduationCap className="w-5 h-5 text-[#2D336B]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#2D336B] leading-tight">
              Class Farewell '26
            </h1>
            <p className="text-xs text-[#71717A] font-medium">Fee Collection & Contributor Portal</p>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="hidden md:flex items-center gap-4 bg-[#F0F2FF] px-4 py-2 rounded-full border border-[#D0D7FF] text-xs font-bold text-[#2D336B]">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
            <span>Total Collected: <strong>৳{totalCollected.toLocaleString()}</strong></span>
          </div>
          <div className="h-3 w-px bg-[#D0D7FF]" />
          <div>
            Contributors: <strong>{paidCount} Students</strong>
          </div>
        </div>

        {/* Navigation Tabs (Admin tab is hidden from public header and accessible only via /admin URL) */}
        <nav className="flex items-center gap-1 bg-[#F9FAFB] p-1.5 rounded-2xl border border-[#E5E7EB] text-xs md:text-sm">
          <button
            id="nav-tab-pay"
            onClick={() => setActiveTab('pay')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'pay'
                ? 'bg-[#2D336B] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#1A1A1A] hover:bg-[#E5E7EB]/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Fee</span>
          </button>

          <button
            id="nav-tab-students"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-[#2D336B] text-white shadow-sm'
                : 'text-[#71717A] hover:text-[#1A1A1A] hover:bg-[#E5E7EB]/50'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Contributors ({paidCount})</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

