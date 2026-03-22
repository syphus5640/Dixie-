import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';

export const CancellationPage: React.FC<{ isLightMode?: boolean }> = ({ isLightMode }) => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Are you sure you want to cancel your consultation booking?');
  const navigate = useNavigate();

  const bookingId = searchParams.get('id');
  const email = searchParams.get('email');

  const handleCancel = async () => {
    if (!bookingId) {
      setStatus('error');
      setMessage('Missing booking information. Please use the link provided in your confirmation email.');
      return;
    }

    setStatus('loading');
    setMessage('Processing your cancellation request...');

    try {
      const response = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, email })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your consultation has been successfully cancelled. A confirmation email has been sent.');
      } else {
        setStatus('error');
        setMessage(data.error || 'We encountered an issue while cancelling your booking. Please contact support.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`max-w-md w-full glass p-8 md:p-12 rounded-3xl border ${isLightMode ? 'border-zinc-200 bg-white/50' : 'border-white/10 bg-black/20'} backdrop-blur-xl text-center shadow-2xl`}
      >
        <div className="mb-8 flex justify-center">
          {status === 'idle' && (
            <div className="w-20 h-20 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.1)]">
              <Calendar className="w-10 h-10 text-purple-500" />
            </div>
          )}
          {status === 'loading' && (
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <Calendar className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-500/50" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
          {status === 'idle' && 'Confirm Cancellation'}
          {status === 'loading' && 'Cancelling Booking'}
          {status === 'success' && 'Cancellation Confirmed'}
          {status === 'error' && 'Cancellation Failed'}
        </h1>

        <p className={`text-sm md:text-base mb-10 leading-relaxed font-light ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {message}
        </p>

        <div className="space-y-4">
          {status === 'idle' && (
            <button 
              onClick={handleCancel}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              Confirm Cancellation
            </button>
          )}

          {(status === 'success' || status === 'error' || status === 'idle') && (
            <button 
              onClick={() => navigate('/')}
              className={`w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                status === 'idle' 
                  ? (isLightMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300')
                  : 'theme-button-primary'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {status === 'idle' ? 'No, Keep Booking' : 'Return to Homepage'}
            </button>
          )}
          
          {status === 'error' && (
            <a 
              href="mailto:support@lunostudios.com"
              className={`block text-xs font-bold uppercase tracking-widest hover:text-purple-400 transition-colors ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}
            >
              Contact Support
            </a>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Luno Studios Collective • AI Agency Platform
          </p>
        </div>
      </motion.div>
    </div>
  );
};
