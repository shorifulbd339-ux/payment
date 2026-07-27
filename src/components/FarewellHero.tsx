import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, MapPin, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

export const FarewellHero: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[32px] bg-white text-[#1A1A1A] p-6 md:p-8 border border-[#E5E7EB] shadow-sm mb-8"
    >
      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0F2FF] border border-[#D0D7FF] text-[#2D336B] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#2D336B]" />
          <span>ব্যাচ ২০২৬ বিদায় অনুষ্ঠান ফি সংগ্রহ</span>
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#1A1A1A] leading-tight">
          আমাদের স্মরণীয় বিদায় অনুষ্ঠান ২০২৬
        </h2>

        <p className="text-[#71717A] text-sm md:text-base leading-relaxed">
          প্রিয় সহপাঠী বন্ধুরা, আগামী বিদায় অনুষ্ঠান সফল করতে দ্রুত আপনার ফি জমা দিন। 
          বিকাশ, নগদ, রকেট বা যেকোনো কার্ড দিয়ে সরাসরি ePay গেটওয়ের মাধ্যমে নিরাপদে ফি পরিশোধ করুন।
        </p>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold">
          <div className="flex items-center gap-2 bg-[#F9FAFB] p-3 rounded-2xl border border-[#E5E7EB] text-[#1A1A1A]">
            <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
            <span>ইনস্ট্যান্ট অটো ভেরিফিকেশন</span>
          </div>

          <div className="flex items-center gap-2 bg-[#F9FAFB] p-3 rounded-2xl border border-[#E5E7EB] text-[#1A1A1A]">
            <CheckCircle2 className="w-4 h-4 text-[#2D336B] shrink-0" />
            <span>সরাসরি ডাটাবেজ এন্ট্রি</span>
          </div>

          <div className="flex items-center gap-2 bg-[#F9FAFB] p-3 rounded-2xl border border-[#E5E7EB] text-[#1A1A1A]">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <span>স্মৃতি স্মারক ও আপ্যায়ন</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
