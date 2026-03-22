
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface ResetPasswordPageProps {
  isLightMode?: boolean;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ isLightMode = false }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      setIsVerifying(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If we don't have a session, check if we have a recovery token in the hash
        // Supabase usually handles this, but we can be explicit
        if (!session) {
          const hash = window.location.hash;
          if (!hash.includes('access_token=') && !hash.includes('type=recovery')) {
            setError("Invalid or expired reset link. Please request a new one.");
          }
        }
      } catch (err) {
        setError("An error occurred while verifying your reset link.");
      } finally {
        setIsVerifying(false);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center py-12 px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-purple-600/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md glass rounded-[48px] p-8 md:p-12 border border-white/5 shadow-2xl relative z-10 ${isLightMode ? 'bg-white' : ''}`}
      >
        <div className="flex flex-col items-center text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-purple-500 to-blue-600 mb-6 flex items-center justify-center shadow-xl shadow-purple-500/20 relative cursor-pointer"
            onClick={() => navigate('/')}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
            <div className="absolute inset-0 rounded-[24px] border border-white/20 animate-pulse" />
          </motion.div>
          <h2 className={`text-4xl font-bold tracking-tight mb-3 ${isLightMode ? 'text-black' : 'text-white'}`}>New Password</h2>
          <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
            Secure your account with a new set of credentials.
          </p>
        </div>

        {isVerifying ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Verifying Link...</p>
          </div>
        ) : (
          <>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] text-center font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Password updated! Redirecting...
              </motion.div>
            )}

            {!success && !error && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className={`w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className={`w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all mt-6 relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white shadow-xl`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">{loading ? 'Updating...' : 'Update Password'}</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {error && !success && (
              <button 
                onClick={() => navigate('/signin')}
                className={`w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all mt-6 relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white shadow-xl`}
              >
                <ArrowLeft className="w-5 h-5 relative z-10 group-hover:-translate-x-1 transition-transform" />
                <span className="relative z-10">Back to Sign In</span>
              </button>
            )}
          </>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <button 
            onClick={() => navigate('/signin')}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
};
