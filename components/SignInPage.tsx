
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface SignInPageProps {
  isLightMode?: boolean;
}

export const SignInPage: React.FC<SignInPageProps> = ({ isLightMode = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log(`[CLIENT] Fetch result for ${res.url}: ${res.status} ${res.statusText}`);

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text.substring(0, 100));
        throw new Error(`Server returned non-JSON response (${res.status}). Please check server logs.`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in. Please check your credentials.");
      }

      if (data.session) {
        // Store session manually
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        localStorage.setItem('luno_session', JSON.stringify(data.session));
        navigate('/dashboard');
      } else if (data.user) {
        throw new Error("Please verify your email address before signing in.");
      } else {
        throw new Error("Unexpected response from server. Please try again.");
      }
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'BFF Server unreachable. Check terminal for errors.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reset link");
      }
      setError("Check your email for a reset link.");
    } catch (err: any) {
      setError(err.message);
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
          <h2 className={`text-4xl font-bold tracking-tight mb-3 ${isLightMode ? 'text-black' : 'text-white'}`}>Welcome Back</h2>
          <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
            Access your Luno ecosystem and manage your autonomous agents.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-8 p-4 rounded-2xl ${error.includes('Check your email') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-[10px] text-center font-bold uppercase tracking-widest`}
          >
            {error}
          </motion.div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Identity</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
              <input 
                type="email" 
                placeholder="Email address" 
                className={`w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Credentials</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
              <input 
                type="password" 
                placeholder="Password" 
                className={`w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end px-2">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[9px] text-zinc-500 hover:text-purple-400 transition-colors font-bold uppercase tracking-widest"
              >
                Forgot password?
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all mt-6 relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white shadow-xl`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Link 
            to="/signup"
            className="text-xs text-zinc-400 hover:text-white transition-colors font-medium tracking-wide uppercase group flex items-center gap-2"
          >
            <span className={isLightMode ? 'text-zinc-600' : 'text-zinc-400'}>New to the studio?</span>
            <span className="text-purple-400 group-hover:underline font-bold">Create account</span>
          </Link>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
