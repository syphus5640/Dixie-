
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  User, 
  Building, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface SignUpPageProps {
  isLightMode?: boolean;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ isLightMode = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          metadata: {
            first_name: firstName,
            last_name: lastName,
            business_name: businessName,
            business_address: businessAddress,
            phone: phoneNumber
          }
        })
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
        throw new Error(data.error || "Account creation failed. Please try again.");
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        localStorage.setItem('luno_session', JSON.stringify(data.session));
        navigate('/dashboard');
      } else {
        setError("Account created. Please check your email for a verification link.");
      }
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'BFF Server unreachable. Check terminal.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = `w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`;

  return (
    <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center py-12 px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] max-w-[1000px] max-h-[1000px] bg-purple-600/10 blur-[150px] rounded-full -z-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-3xl glass rounded-[48px] p-8 md:p-14 border border-white/5 shadow-2xl relative z-10 ${isLightMode ? 'bg-white' : ''}`}
      >
        <div className="flex flex-col items-center text-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-purple-500 to-blue-600 mb-6 flex items-center justify-center shadow-xl shadow-purple-500/20 relative cursor-pointer"
            onClick={() => navigate('/')}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
            <div className="absolute inset-0 rounded-[24px] border border-white/20 animate-pulse" />
          </motion.div>
          <h2 className={`text-4xl font-bold tracking-tight mb-3 ${isLightMode ? 'text-black' : 'text-white'}`}>Join Luno Studios</h2>
          <p className="text-zinc-500 text-sm max-w-lg leading-relaxed font-light">
            Establish your digital presence within our AI-driven network. Automate, scale, and transform your enterprise.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-8 p-4 rounded-2xl ${error.includes('verification') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-[10px] text-center font-bold uppercase tracking-widest`}
          >
            {error}
          </motion.div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Identity Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 ml-1">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="First Name" 
                  className={inputClasses}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  className={inputClasses}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 ml-1">Communication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className={inputClasses}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className={inputClasses}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Business Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 ml-1">Enterprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Business Name" 
                  className={inputClasses}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Business Address" 
                  className={inputClasses}
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 ml-1">Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  className={inputClasses}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${confirmPassword === password && password !== '' ? 'text-green-500' : 'text-zinc-500'}`} />
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className={`w-full border rounded-2xl pl-12 pr-4 py-4 focus:outline-none transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'} ${confirmPassword === password && password !== '' ? 'border-green-500/50' : 'focus:border-purple-500'}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-5 rounded-3xl flex items-center justify-center gap-3 transition-all mt-10 shadow-xl relative group overflow-hidden ${isLightMode ? 'bg-black text-white' : 'bg-white text-black'} hover:bg-purple-500 hover:text-white`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{loading ? 'Signing up...' : 'Sign up'}</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link 
            to="/signin"
            className="text-xs text-zinc-400 hover:text-white transition-colors font-medium tracking-wide uppercase group flex items-center gap-2"
          >
            <span className={isLightMode ? 'text-zinc-600' : 'text-zinc-400'}>Already a member?</span>
            <span className="text-purple-400 group-hover:underline font-bold">Sign in instead</span>
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
