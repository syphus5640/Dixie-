
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Building, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  ArrowLeft, 
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Edit2,
  X,
  Lock,
  Mail,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile } from '../src/App';

interface SettingsPageProps {
  session?: any;
  isLightMode?: boolean;
}

interface EditableFieldProps {
  label: string;
  value: string;
  icon: React.ElementType;
  onSave: (newValue: string) => Promise<void>;
  type?: string;
  isLightMode?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, icon: Icon, onSave, type = "text", isLightMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(tempValue);
      setIsEditing(false);
    } catch (e) {
      setTempValue(value);
    } finally {
      setLoading(false);
    }
  };

  const labelColor = isLightMode ? 'text-zinc-700' : 'text-zinc-500';
  const valueColor = isLightMode ? 'text-zinc-900' : 'text-zinc-300';
  const iconBg = isLightMode ? 'bg-zinc-100' : 'bg-white/5';
  const iconColor = isLightMode ? 'text-zinc-600' : 'text-zinc-500';

  return (
    <div className={`group relative py-6 border-b last:border-0 ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:text-purple-400 transition-colors ${iconBg} ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>{label}</p>
            {isEditing ? (
              <input
                type={type}
                className={`border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 w-full max-w-[200px] ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/10 border-purple-500/30 text-white'}`}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                onKeyDownCapture={(e) => e.key === 'Escape' && setIsEditing(false)}
              />
            ) : (
              <p className={`text-sm font-bold ${valueColor}`}>{value || `Set ${label.toLowerCase()}`}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => { setIsEditing(false); setTempValue(value); }}
                className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-white/10 text-zinc-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className={`p-2 opacity-0 group-hover:opacity-100 rounded-lg transition-all ${isLightMode ? 'hover:bg-zinc-100 text-zinc-600 hover:text-black' : 'hover:bg-white/10 text-zinc-500 hover:text-white'}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ session, isLightMode = false }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [reAuthModal, setReAuthModal] = useState<'email' | 'password' | null>(null);
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Scroll Lock for Modals
  useEffect(() => {
    if (reAuthModal || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [reAuthModal, isDeleteModalOpen]);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Password is required to delete account.' });
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token;
      if (!access_token) throw new Error("Authentication required");

      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({ currentPassword: deletePassword })
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Failed to delete account");
      }

      await supabase.auth.signOut();
      localStorage.removeItem('luno_session');
      localStorage.removeItem('luno_admin_mode');
      navigate('/signin');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setIsDeleteModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for configuration
      if (!isSupabaseConfigured) return;

      if (!session) {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            navigate('/signin');
            return;
          }
        } catch (e) {
          navigate('/signin');
          return;
        }
      }
      fetchProfile();
    };
    checkAuth();
  }, [session, navigate, isSupabaseConfigured]);

  const fetchProfile = async () => {
    if (!isSupabaseConfigured) return;
    let currentToken = session?.access_token;
    if (!currentToken) {
      try {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      } catch (e) {}
      if (!currentToken) return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (field: keyof UserProfile, value: string) => {
    try {
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
        if (!currentToken) throw new Error("Authentication required");
      }

      // PROXIED CALL TO BFF
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ updates: { [field]: value } })
      });

      if (!res.ok) throw new Error("Security verification failed for profile update.");
      
      const data = await res.json();
      setProfile(data);
      setMessage({ type: 'success', text: `${field.replace('_', ' ')} updated successfully.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      throw err;
    }
  };

  const handleSensitiveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setMessage(null);

    try {
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
        if (!currentToken) throw new Error("Authentication required");
      }

      let endpoint = '/api/auth/update-user';
      let body: any = { currentPassword: reAuthPassword };

      if (reAuthModal === 'email') {
        body.updates = { email: newEmail };
      } else if (reAuthModal === 'password') {
        body.updates = { password: newPassword };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[CLIENT] Action failed:", data.error);
        throw new Error(data.error || "Action failed");
      }

      if (reAuthModal === 'email') {
        setMessage({ type: 'success', text: "Verification link sent to your new email." });
      } else if (reAuthModal === 'password') {
        setMessage({ type: 'success', text: "Password updated successfully." });
      }

      setReAuthModal(null);
      setReAuthPassword('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <span className={`text-[10px] font-bold uppercase tracking-[0.4em] ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>Retrieving Identity</span>
      </div>
    );
  }

  const labelText = isLightMode ? 'text-zinc-700' : 'text-zinc-500';
  const primaryText = isLightMode ? 'text-black' : 'text-white';
  const mutedText = isLightMode ? 'text-zinc-600' : 'text-zinc-500';

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-50" />
      
      <div className="max-w-4xl mx-auto px-6 py-12 relative">
      
      <div className="mb-12 flex items-center justify-between">
        <button 
          onClick={() => {
            const isAdmin = profile?.is_admin === true || profile?.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
            const isEmployee = profile?.is_employee === true || profile?.is_employee === 'true';
            const isEmployeeOnly = isEmployee && !isAdmin;
            navigate(isEmployeeOnly ? '/calling' : '/dashboard');
          }}
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors group ${isLightMode ? 'text-zinc-700 hover:text-black' : 'text-zinc-500 hover:text-white'}`}
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          Return
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        <div className="md:col-span-4 space-y-6">
          <div className={`glass rounded-[32px] p-6 md:p-8 border relative overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
            <div 
              className="absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 pointer-events-none opacity-40" 
              style={{
                background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.15) 0%, transparent 70%)'
              }}
            />
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-xl mb-4 md:mb-6 text-xl md:text-2xl font-bold">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <h3 className={`text-lg md:text-xl font-bold ${primaryText}`}>{profile?.first_name} {profile?.last_name}</h3>
              <p className={`text-[10px] md:text-xs font-mono mt-1 ${mutedText}`}>{session?.user?.email}</p>
            </div>
          </div>

          <div className={`glass rounded-[32px] p-4 md:p-6 border space-y-1 md:space-y-2 ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
            <button onClick={() => setReAuthModal('email')} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group text-[11px] md:text-xs font-bold ${isLightMode ? 'text-zinc-700 hover:bg-zinc-50 hover:text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>Update Email <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" /></button>
            <button onClick={() => setReAuthModal('password')} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group text-[11px] md:text-xs font-bold ${isLightMode ? 'text-zinc-700 hover:bg-zinc-50 hover:text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>Reset Password <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" /></button>
            <div className={`pt-3 md:pt-4 mt-3 md:mt-4 border-t ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
              <button onClick={() => setIsDeleteModalOpen(true)} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-[11px] md:text-xs font-bold ${isLightMode ? 'text-zinc-700 hover:bg-red-50 hover:text-red-500' : 'hover:bg-red-500/10 text-zinc-500 hover:text-red-400'}`}><Trash2 className="w-3 h-3" /> Terminate Account</button>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 space-y-6 md:space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-[32px] md:rounded-[40px] p-6 md:p-10 border shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/5'}`}>
            <h2 className={`text-xl md:text-2xl font-bold tracking-tight mb-6 md:mb-8 ${primaryText}`}>Metadata Configuration</h2>
            {message && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`mb-6 md:mb-8 p-4 rounded-2xl border text-[10px] uppercase font-bold tracking-widest flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
            <div className="space-y-1 md:space-y-2">
              <EditableField label="First Name" value={profile?.first_name || ''} icon={User} isLightMode={isLightMode} onSave={(val) => handleUpdateField('first_name', val)} />
              <EditableField label="Last Name" value={profile?.last_name || ''} icon={User} isLightMode={isLightMode} onSave={(val) => handleUpdateField('last_name', val)} />
              <EditableField label="Business Name" value={profile?.business_name || ''} icon={Building} isLightMode={isLightMode} onSave={(val) => handleUpdateField('business_name', val)} />
              <EditableField label="Business Address" value={profile?.business_address || ''} icon={MapPin} isLightMode={isLightMode} onSave={(val) => handleUpdateField('business_address', val)} />
              <EditableField label="Phone Number" value={profile?.phone || ''} icon={Phone} isLightMode={isLightMode} onSave={(val) => handleUpdateField('phone', val)} type="tel" />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {reAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'}`}>
              <div className={`p-8 border-b flex justify-between items-center ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                <div>
                  <h3 className={`text-xl font-bold ${primaryText}`}>{reAuthModal === 'email' && 'Update Identity'}{reAuthModal === 'password' && 'Reset Password'}</h3>
                  <p className={`${mutedText} text-xs mt-1`}>Verification required to proceed.</p>
                </div>
                <button onClick={() => setReAuthModal(null)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'}`}><X className="w-5 h-5 text-zinc-500" /></button>
              </div>
              <form onSubmit={handleSensitiveAction} className="p-8 space-y-6">
                {reAuthModal === 'email' && (
                  <div className="space-y-2">
                    <label className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}>New Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input type="email" required className={`w-full border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-purple-500 transition-colors ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@enterprise.com" />
                    </div>
                  </div>
                )}
                {reAuthModal === 'password' && (
                  <div className="space-y-2">
                    <label className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}>New Secure Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input type="password" required className={`w-full border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-purple-500 transition-colors ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Current Password</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                    <input type="password" required className={`w-full border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-purple-500 transition-colors ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`} value={reAuthPassword} onChange={(e) => setReAuthPassword(e.target.value)} placeholder="Verify current password" />
                  </div>
                </div>
                <button type="submit" disabled={isProcessing} className={`w-full py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}>
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Confirm & Execute</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'}`}>
            <div className={`p-8 border-b flex justify-between items-center ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
              <div>
                <h3 className={`text-xl font-bold ${primaryText}`}>Permanent Termination</h3>
                <p className={`${mutedText} text-xs mt-1`}>This action cannot be undone.</p>
              </div>
              <button onClick={() => setIsDeleteModalOpen(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'}`}><X className="w-5 h-5 text-zinc-500" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs leading-relaxed font-bold">
                <strong>WARNING:</strong> This action is irreversible. All agents, logs, and profile data will be permanently purged.
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Confirm Password</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                  <input 
                    type="password" 
                    required 
                    className={`w-full border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-red-500 transition-colors ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`} 
                    value={deletePassword} 
                    onChange={(e) => setDeletePassword(e.target.value)} 
                    placeholder="Verify password to delete" 
                  />
                </div>
              </div>
              <button 
                onClick={handleDeleteAccount} 
                disabled={isProcessing || !deletePassword} 
                className={`w-full py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 bg-red-500 text-white hover:bg-red-600`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-5 h-5" /> Delete Permanently</>}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
};
