
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export const EmailConfirmationPage: React.FC<{ isLightMode?: boolean }> = ({ isLightMode = false }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your credentials...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleConfirmation = async () => {
      // Supabase automatically handles the hash fragment and sets the session
      // We just need to check if we have a session now
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      if (session) {
        setStatus('success');
        setMessage('Your email has been successfully confirmed. Welcome to the Luno ecosystem.');
      } else {
        // If no session, maybe it's not a confirmation link or it expired
        // Check if there's an error in the URL params (sometimes Supabase puts it there)
        const params = new URLSearchParams(location.hash.replace('#', '?'));
        const errorMsg = params.get('error_description');
        if (errorMsg) {
          setStatus('error');
          setMessage(errorMsg);
        } else {
          setStatus('error');
          setMessage('We could not verify your email. The link may have expired or is invalid.');
        }
      }
    };

    // Small delay to let Supabase process the hash
    const timer = setTimeout(handleConfirmation, 1500);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-center py-20 px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-purple-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-xl glass rounded-[48px] p-10 md:p-16 border border-white/5 shadow-2xl relative z-10 text-center ${isLightMode ? 'bg-white' : ''}`}
      >
        <div className="flex flex-col items-center mb-10">
          {status === 'loading' && (
            <div className="w-20 h-20 rounded-[32px] bg-zinc-800/50 flex items-center justify-center mb-8">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          )}
          
          {status === 'success' && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-[32px] bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-[32px] bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20"
            >
              <Mail className="w-10 h-10 text-red-400" />
            </motion.div>
          )}

          <h2 className={`text-4xl font-bold tracking-tight mb-4 ${isLightMode ? 'text-black' : 'text-white'}`}>
            {status === 'loading' ? 'Confirming Identity' : status === 'success' ? 'Identity Verified' : 'Verification Failed'}
          </h2>
          
          <p className={`text-lg leading-relaxed ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {message}
          </p>
        </div>

        <div className="space-y-4">
          {status === 'success' ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className={`w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white shadow-xl`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Go to Dashboard</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : status === 'error' ? (
            <button 
              onClick={() => navigate('/signin')}
              className={`w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white shadow-xl`}
            >
              <span className="relative z-10">Back to Sign In</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};
