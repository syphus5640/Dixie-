
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarX, ArrowLeft } from 'lucide-react';

interface BookingCanceledPageProps {
  isLightMode?: boolean;
}

export const BookingCanceledPage: React.FC<BookingCanceledPageProps> = ({ isLightMode }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-8"
      >
        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative z-10 ${
          isLightMode ? 'bg-red-50 text-red-500' : 'bg-red-500/10 text-red-400'
        }`}>
          <CalendarX size={48} strokeWidth={1.5} />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          className={`absolute inset-0 rounded-full border-2 ${
            isLightMode ? 'border-red-200' : 'border-red-500/30'
          }`}
        />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-3xl md:text-5xl font-bold mb-4 tracking-tight"
      >
        Booking Canceled
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className={`text-sm md:text-lg max-w-md mx-auto mb-10 font-light leading-relaxed ${
          isLightMode ? 'text-zinc-600' : 'text-zinc-400'
        }`}
      >
        Your consultation booking has been successfully canceled. 
        We're sorry to see you go, but you're welcome to reschedule anytime.
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        onClick={() => navigate('/')}
        className="group flex items-center gap-2 px-8 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-xl"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Return Home
      </motion.button>
    </div>
  );
};
