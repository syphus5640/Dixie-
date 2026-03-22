
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Phone, 
  Settings, 
  Activity, 
  Plus, 
  Trash2, 
  Edit3, 
  BarChart3, 
  ShieldCheck, 
  X,
  User as UserIcon,
  Building,
  ExternalLink,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile } from '../src/App';
import { Agent, AgentType } from '../src/types';
import { Leaderboard } from './Leaderboard';

interface DashboardProps {
  session?: any;
  isLightMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, isLightMode = false }) => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [pendingDeleteAgent, setPendingDeleteAgent] = useState<Agent | null>(null);
  
  // Form State
  const [nickname, setNickname] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentType, setAgentType] = useState<AgentType>(AgentType.INBOUND);
  const [isAgentAdmin, setIsAgentAdmin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, boolean>>({});
  const [showInvalidPrompt, setShowInvalidPrompt] = useState<string | null>(null);
  const [sqlSetupInfo, setSqlSetupInfo] = useState<{ setupSql: string; tableSql: string; details: string } | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const saved = localStorage.getItem('luno_admin_mode');
    return saved === 'true';
  });
  const [activeTab, setActiveTab] = useState<'agents' | 'users' | 'performance'>('agents');
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [isTogglingAdmin, setIsTogglingAdmin] = useState<string | null>(null);
  const [isTogglingEmployee, setIsTogglingEmployee] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('luno_admin_mode', isAdminMode.toString());
  }, [isAdminMode]);

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
      fetchData();
    };
    checkAuth();
  }, [session, navigate, isSupabaseConfigured, isAdminMode]);

  useEffect(() => {
    if (profile) {
      const isAdmin = profile.is_admin === true || profile.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
      const isEmployee = profile.is_employee === true || profile.is_employee === 'true';
      const isEmployeeOnly = isEmployee && !isAdmin;
      
      if (isEmployeeOnly) {
        navigate('/calling', { replace: true });
      }
    }
  }, [profile, navigate, session]);

  const fetchEmployeeStats = async () => {
    try {
      setStatsLoading(true);
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      }
      if (!currentToken) return;

      const res = await fetch('/api/admin/employee-stats', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeStats(data);
      }
    } catch (err) {
      console.error("Error fetching employee stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchData = async () => {
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
      // 1. Fetch Profile
      const profileRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      let profileData = null;
      if (profileRes.ok) {
        profileData = await profileRes.json();
        setProfile(profileData);
        
        // Redirection logic for employees who are not admins
        const isAdmin = profileData?.is_admin === true || profileData?.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
        const isEmployee = profileData?.is_employee === true || profileData?.is_employee === 'true';

        if (isEmployee && !isAdmin) {
          navigate('/calling', { replace: true });
          return;
        }
        
        // Auto-enable admin mode if they are an admin and it's not set
        if (isAdmin && localStorage.getItem('luno_admin_mode') === null) {
          setIsAdminMode(true);
        }

        if (isAdmin) {
          fetchEmployeeStats();
        }
      } else if (profileRes.status === 404) {
        const errData = await profileRes.json();
        console.warn("Profile table missing:", errData.error);
      }
      
      // 2. Fetch Agents
      const agentsRes = await fetch(`/api/user/agents?admin_mode=${isAdminMode}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData || []);
        setGlobalError(null);
        if (agentsData && agentsData.length > 0) {
          checkAgentStatuses(agentsData);
        }
      } else if (agentsRes.status === 404) {
        const errData = await agentsRes.json();
        setGlobalError(errData.error);
        setAgents([]);
      } else {
        const errData = await agentsRes.json();
        setGlobalError(errData.error || "Failed to fetch agents");
        setAgents([]);
      }

      // 3. Fetch all profiles if admin
      const isAdmin = profileData?.is_admin === true || profileData?.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
      if (isAdmin) {
        fetchProfiles();
      }
    } catch (err) {
      console.error("Dashboard hydration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    let currentToken = session?.access_token;
    if (!currentToken) {
      try {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      } catch (e) {}
      if (!currentToken) return;
    }

    setProfilesLoading(true);
    try {
      const res = await fetch('/api/admin/profiles', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllProfiles(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally {
      setProfilesLoading(false);
    }
  };

  const toggleUserAdmin = async (targetUserId: string, currentStatus: boolean) => {
    let currentToken = session?.access_token;
    if (!currentToken) {
      try {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      } catch (e) {}
      if (!currentToken) return;
    }

    setIsTogglingAdmin(targetUserId);
    try {
      const res = await fetch(`/api/admin/profiles/${targetUserId}/toggle-admin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ is_admin: !currentStatus })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(currentStatus ? "Admin privileges revoked" : "Admin privileges granted");
        fetchProfiles();
      } else {
        toast.error(data.error || "Failed to toggle admin status");
      }
    } catch (err: any) {
      console.error("Failed to toggle admin:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsTogglingAdmin(null);
    }
  };

  const toggleUserEmployee = async (targetUserId: string, currentStatus: boolean) => {
    let currentToken = session?.access_token;
    if (!currentToken) {
      try {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      } catch (e) {}
      if (!currentToken) return;
    }

    setIsTogglingEmployee(targetUserId);
    try {
      const res = await fetch(`/api/admin/profiles/${targetUserId}/toggle-employee`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ is_employee: !currentStatus })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(currentStatus ? "Employee status revoked" : "Employee status granted");
        fetchProfiles();
      } else {
        toast.error(data.error || "Failed to toggle employee status");
      }
    } catch (err: any) {
      console.error("Failed to toggle employee:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsTogglingEmployee(null);
    }
  };

  const checkAgentStatuses = async (agentsList: Agent[]) => {
    const statuses: Record<string, boolean> = {};
    await Promise.all(agentsList.map(async (agent) => {
      try {
        const res = await fetch('/api/database/check-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.retell_agent_id })
        });
        const data = await res.json();
        statuses[agent.id] = data.exists;
      } catch (e) {
        statuses[agent.id] = false;
      }
    }));
    setAgentStatuses(statuses);
  };

  const handleOpenModal = (agent: Agent | null = null) => {
    setSelectedAgent(agent);
    setNickname(agent ? agent.agent_nickname : '');
    setAgentId(agent ? agent.retell_agent_id : '');
    setAgentPhone(agent ? (agent.agent_phone || '') : '');
    setAgentType(agent ? agent.agent_type : AgentType.INBOUND);
    setIsAgentAdmin(agent ? (agent.is_admin === true) : isAdminMode);
    setFormError(null);
    setModalOpen(true);
  };

  const validateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const trimmedAgentId = agentId.trim();
      const trimmedNickname = nickname.trim();

      // Backend Handshake for verification
      const verifyRes = await fetch('/api/database/check-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: trimmedAgentId })
      });
      
      const verifyData = await verifyRes.json();
      const userEmail = session?.user?.email?.toLowerCase();
      const isAdmin = profile?.is_admin === true || userEmail === 'kev.stanchev@gmail.com';

      if (!verifyRes.ok && !isAdmin) {
        if (verifyRes.status === 404) {
          setShowInvalidPrompt(trimmedNickname || "New Agent");
          setFormError("Invalid Agent ID. No corresponding infrastructure found.");
          setIsSubmitting(false);
          return;
        }
        throw new Error(verifyData.error || "System synchronization failure.");
      }

      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
        if (!currentToken) throw new Error("Authentication required");
      }
      
      if (selectedAgent) {
        // Update
        const res = await fetch(`/api/user/agents/${selectedAgent.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify({ 
            admin_mode: isAgentAdmin,
            updates: {
              agent_nickname: trimmedNickname, 
              retell_agent_id: trimmedAgentId,
              agent_type: agentType,
              agent_phone: agentType === AgentType.OUTBOUND ? agentPhone.trim() : ''
            }
          })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Update failed");
        }
      } else {
        // Insert
        const res = await fetch('/api/user/agents', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify({ 
            admin_mode: isAgentAdmin,
            agent_nickname: trimmedNickname, 
            retell_agent_id: trimmedAgentId,
            agent_type: agentType,
            agent_phone: agentType === AgentType.OUTBOUND ? agentPhone.trim() : ''
          })
        });
        if (!res.ok) {
          const errData = await res.json();
          if (errData.setupSql) {
            setSqlSetupInfo({
              setupSql: errData.setupSql,
              tableSql: errData.tableSql,
              details: errData.details
            });
            setIsSubmitting(false);
            return;
          }
          throw new Error(errData.error || "Deployment failed");
        }
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (agent: Agent) => {
    setPendingDeleteAgent(agent);
    setDeleteModalOpen(true);
  };

  const quickToggleAdminMode = async (agent: Agent) => {
    try {
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
        if (!currentToken) throw new Error("Authentication required");
      }

      const currentIsAdmin = agent.is_admin === true;
      const newAdminStatus = !currentIsAdmin;

      const res = await fetch(`/api/user/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ 
          admin_mode: newAdminStatus,
          updates: {
            agent_nickname: agent.agent_nickname, 
            retell_agent_id: agent.retell_agent_id,
            agent_type: agent.agent_type,
            agent_phone: agent.agent_phone || ''
          }
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Update failed");
      }
      
      fetchData();
    } catch (err: any) {
      console.error("Quick toggle error:", err);
      alert(`Failed to move agent: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAgent) return;
    
    setIsDeleting(true);
    try {
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
        if (!currentToken) throw new Error("Authentication required");
      }

      const res = await fetch(`/api/user/agents/${pendingDeleteAgent.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ admin_mode: isAdminMode })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Deletion failed");
      }
      
      setDeleteModalOpen(false);
      setPendingDeleteAgent(null);
      fetchData();
    } catch (err) {
      console.error("Deletion failure:", err);
      alert("System error during decommissioning.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <span className={`text-[10px] font-bold uppercase tracking-[0.4em] ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>Initializing Console</span>
      </div>
    );
  }

  const primaryText = isLightMode ? 'text-black' : 'text-white';
  const secondaryText = isLightMode ? 'text-zinc-700' : 'text-zinc-400';
  const mutedText = isLightMode ? 'text-zinc-600' : 'text-zinc-500';
  const labelText = isLightMode ? 'text-zinc-700' : 'text-zinc-500';

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.1)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        
        {/* Sidebar: Profile & Identity */}
        <aside className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`glass rounded-[40px] p-8 border relative overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xl font-bold ${primaryText}`}>{profile?.first_name} {profile?.last_name}</h3>
                  {(profile?.is_admin === true || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com') && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                      Admin
                    </span>
                  )}
                </div>
                <p className={`text-xs font-mono ${mutedText}`}>{session?.user?.email}</p>
              </div>
            </div>

            <div className={`space-y-4 pt-6 border-t ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
              {(profile?.is_admin === true || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com') && (
                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isLightMode ? 'bg-purple-50 border-purple-100' : 'bg-purple-500/5 border-purple-500/10'}`}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <span className={`text-sm font-bold ${isLightMode ? 'text-purple-900' : 'text-purple-200'}`}>Admin Mode</span>
                  </div>
                  <button 
                    onClick={() => setIsAdminMode(!isAdminMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isAdminMode ? 'bg-purple-500' : 'bg-zinc-600'}`}
                  >
                    <motion.div 
                      animate={{ x: isAdminMode ? 22 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              )}
              <div className={`flex items-center gap-3 group ${isLightMode ? 'text-zinc-800' : 'text-zinc-400'}`}>
                <Building className="w-4 h-4 text-purple-400/70" />
                <span className="text-sm font-medium">{profile?.business_name || 'Individual Partner'}</span>
              </div>
              <button 
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold group ${isLightMode ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}
              >
                <div className={`flex items-center gap-3 ${isLightMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  <Settings className={`w-4 h-4 transition-transform duration-500 group-hover:rotate-90 ${isLightMode ? 'text-zinc-700' : 'text-zinc-500'}`} />
                  Account Settings
                </div>
                <ExternalLink className={`w-3 h-3 ${isLightMode ? 'text-zinc-500' : 'text-zinc-600'}`} />
              </button>

              {(profile?.is_admin === true || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com') && (
                <button 
                  onClick={() => navigate('/calling')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold group ${isLightMode ? 'bg-purple-50 hover:bg-purple-100 border-purple-200' : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20'}`}
                >
                  <div className={`flex items-center gap-3 ${isLightMode ? 'text-purple-900' : 'text-purple-200'}`}>
                    <Phone className={`w-4 h-4 ${isLightMode ? 'text-purple-700' : 'text-purple-400'}`} />
                    Calling Dashboard
                  </div>
                  <ExternalLink className={`w-3 h-3 ${isLightMode ? 'text-purple-500' : 'text-purple-400'}`} />
                </button>
              )}
            </div>
          </motion.div>

          {/* Quick Stats Summary */}
          <div className={`glass rounded-[32px] p-6 border ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
            <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-6 px-2 ${labelText}`}>Agent Health</h4>
            <div className="space-y-4">
              <div className={`flex justify-between items-center p-3 rounded-xl ${isLightMode ? 'bg-zinc-50' : 'bg-white/5'}`}>
                <span className={`text-xs ${secondaryText}`}>Active Agents</span>
                <span className={`text-sm font-bold ${primaryText}`}>{agents.length}</span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-xl ${isLightMode ? 'bg-zinc-50' : 'bg-white/5'}`}>
                <span className={`text-xs ${secondaryText}`}>System Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-500 uppercase">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main: Resource Management Grid */}
        <div className="lg:col-span-8 space-y-8">
          
          {globalError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-start gap-3 font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p>{globalError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${primaryText}`}>
                {activeTab === 'agents' ? 'Active Services' : 'User Management'}
              </h2>
              <p className={`text-sm mt-1 ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                {activeTab === 'agents' ? 'Manage your Luno services' : 'Manage system administrators'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {(profile?.is_admin === true || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com') && (
                <div className={`flex p-1 rounded-full border ${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-white/10'}`}>
                  <button
                    onClick={() => setActiveTab('agents')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'agents' ? 'bg-purple-500 text-white shadow-lg' : mutedText}`}
                  >
                    Agents
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-purple-500 text-white shadow-lg' : mutedText}`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('performance')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'performance' ? 'bg-purple-500 text-white shadow-lg' : mutedText}`}
                  >
                    Performance
                  </button>
                </div>
              )}
              
              {activeTab === 'performance' && (
                <button 
                  onClick={fetchEmployeeStats}
                  disabled={statsLoading}
                  className={`p-3 rounded-full transition-all flex items-center gap-2 text-sm shadow-xl ${isLightMode ? 'bg-white text-black hover:bg-zinc-100' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                  Refresh Stats
                </button>
              )}
              {activeTab === 'agents' && (
                <button 
                  onClick={() => handleOpenModal()}
                  className="px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2 text-sm shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  Deploy Agent
                </button>
              )}
            </div>
          </div>

          {activeTab === 'agents' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <motion.div
                    key={agent.id}
                    className={`glass rounded-[32px] p-6 border transition-all relative group ${isLightMode ? 'bg-white border-zinc-200 hover:border-purple-400 shadow-sm' : 'border-white/5 hover:border-purple-500/30'}`}
                  >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${primaryText}`}>{agent.agent_nickname}</h4>
                        {isAdminMode && agent.owner_info && (
                          <div className={`text-xs mb-1 ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Created by: {agent.owner_info}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live</span>
                          </div>
                          <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${agent.agent_type === AgentType.OUTBOUND ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'}`}>
                            {agent.agent_type || 'Inbound'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(agent)}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-zinc-100 text-zinc-500 hover:text-black' : 'hover:bg-white/10 text-zinc-500 hover:text-white'}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(agent)}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-red-50 text-zinc-500 hover:text-red-500' : 'hover:bg-red-500/10 text-zinc-500 hover:text-red-400'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                    <div className="space-y-3 mb-8">
                      <div className={`p-3 rounded-2xl border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/5'}`}>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isLightMode ? 'text-zinc-600' : 'text-zinc-600'}`}>Infrastructure ID</p>
                        <p className={`text-xs font-mono truncate ${isLightMode ? 'text-zinc-800' : 'text-zinc-300'}`}>
                          {agent.retell_agent_id.toLowerCase().startsWith('agent_') ? agent.retell_agent_id : `agent_${agent.retell_agent_id}`}
                        </p>
                      </div>
                    </div>

                  <button 
                    onClick={() => {
                        if (agentStatuses[agent.id] === false) {
                          setShowInvalidPrompt(agent.agent_nickname);
                        } else {
                          navigate('/analytics', { 
                            state: { 
                              agentId: agent.retell_agent_id, 
                              nickname: agent.agent_nickname,
                              agentType: agent.agent_type,
                              agentPhone: agent.agent_phone
                            } 
                          });
                        }
                    }}
                    className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-bold group/btn ${isLightMode ? 'bg-zinc-100 hover:bg-purple-500 hover:text-white border-zinc-200 hover:border-purple-500' : 'bg-white/5 hover:bg-purple-500 hover:text-white border-white/10 hover:border-purple-500/50'}`}
                  >
                    <BarChart3 className="w-4 h-4 text-purple-400 group-hover/btn:text-white transition-colors" />
                    View Analytics
                  </button>
                  {agentStatuses[agent.id] === false && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Invalid Agent ID</span>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleOpenModal()}
                className={`col-span-full glass rounded-[40px] p-12 md:p-16 border border-dashed flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-700 ${isLightMode ? 'bg-white border-zinc-200 hover:border-purple-400' : 'border-white/10 hover:border-purple-500/30'}`}
              >
                <div className={`w-20 h-20 rounded-[28px] border flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-all duration-700 relative ${isLightMode ? 'bg-zinc-50 border-zinc-100 text-zinc-400' : 'bg-white/5 border-white/5 text-zinc-600'}`}>
                  <Zap className="w-10 h-10" />
                  <div className="absolute inset-0 rounded-[28px] border border-white/5 animate-pulse-ring opacity-0 group-hover:opacity-100" />
                </div>
                <h3 className={`text-2xl font-bold mb-4 tracking-tight ${primaryText}`}>No Active Automations</h3>
                <p className={`text-sm max-w-sm leading-relaxed font-light ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  Click the <span className={`${primaryText} font-bold group-hover:text-purple-500 transition-colors underline decoration-purple-500/30`}>Deploy Agent</span> button to connect your first AI Automation using your Agent ID.
                </p>
                <div className={`mt-8 px-5 py-2 rounded-full glass border text-[9px] font-bold uppercase tracking-[0.3em] transition-colors ${isLightMode ? 'bg-zinc-50 border-zinc-100 text-zinc-500' : 'border-white/5 text-zinc-600'}`}>
                   Ready for Ignition
                </div>
              </motion.div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className={`glass rounded-[32px] border overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
            {profilesLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${mutedText}`}>Loading Users</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>User</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Email</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Employee ID</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Status</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right ${labelText}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-zinc-100' : 'divide-white/5'}`}>
                    {allProfiles.map((p) => (
                      <tr key={p.id} className={`group transition-colors ${isLightMode ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                            <span className={`text-sm font-bold ${primaryText}`}>{p.first_name} {p.last_name}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-xs font-mono ${mutedText}`}>{(p as any).email || 'N/A'}</td>
                        <td className={`px-6 py-4 text-xs font-mono ${p.employee_id ? primaryText : mutedText}`}>
                          {p.employee_id || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {p.is_admin && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-[9px] font-bold text-purple-400 uppercase tracking-widest border border-purple-500/30 w-fit">Admin</span>
                            )}
                            {p.is_employee && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-widest border border-blue-500/30 w-fit">Employee</span>
                            )}
                            {!p.is_admin && !p.is_employee && (
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border w-fit ${isLightMode ? 'bg-zinc-100 text-zinc-500 border-zinc-200' : 'bg-white/5 text-zinc-600 border-white/5'}`}>User</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={isTogglingEmployee === p.id}
                              onClick={() => toggleUserEmployee(p.id, !!p.is_employee)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 ${
                                p.is_employee 
                                  ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white' 
                                  : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white'
                              }`}
                            >
                              {isTogglingEmployee === p.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (p.is_employee ? 'Revoke Employee' : 'Make Employee')}
                            </button>
                            <button
                              disabled={isTogglingAdmin === p.id || (p as any).email?.toLowerCase() === 'kev.stanchev@gmail.com'}
                              onClick={() => toggleUserAdmin(p.id, !!p.is_admin)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 ${
                                p.is_admin 
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                                  : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white'
                              }`}
                            >
                              {isTogglingAdmin === p.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (p.is_admin ? 'Revoke Admin' : 'Make Admin')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className={`glass rounded-[32px] border overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
            <div className="p-8">
              <Leaderboard isLightMode={isLightMode} />
            </div>
            {statsLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${mutedText}`}>Loading Stats</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Employee</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${labelText}`}>Total Calls</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-emerald-500`}>Demos</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-blue-500`}>Callbacks</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-amber-500`}>No Answer</th>
                      <th className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-red-500`}>Not Interested</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-zinc-100' : 'divide-white/5'}`}>
                    {employeeStats.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`px-6 py-12 text-center text-sm ${mutedText}`}>No call data recorded yet.</td>
                      </tr>
                    ) : (
                      employeeStats.map((s, idx) => (
                        <tr key={idx} className={`group transition-colors ${isLightMode ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`}>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${primaryText}`}>{s.employee}</span>
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold ${primaryText}`}>{s.total}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-emerald-500`}>{s.demo_booked}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-blue-500`}>{s.callback}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-amber-500`}>{s.no_answer}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-red-500`}>{s.not_interested}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Deployment Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-lg glass rounded-[40px] border overflow-hidden shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'}`}
            >
              <div className={`p-8 flex justify-between items-center border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                <div>
                  <h3 className={`text-2xl font-bold ${primaryText}`}>
                    {isAdminMode 
                      ? (selectedAgent ? 'Modify Admin Infrastructure' : 'Create Supabase Table & Link Agent') 
                      : (selectedAgent ? 'Modify Resource' : 'Deploy Infrastructure')}
                  </h3>
                  <p className={`${mutedText} text-xs mt-1`}>
                    {isAdminMode 
                      ? 'Register an agent with a private nickname and ensure its data table exists.' 
                      : 'Configure your autonomous agent connection.'}
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'}`}>
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={validateAndSave} className="p-8 space-y-6">
                {formError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-3 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Service Nickname</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Sales Architect 01"
                    className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Agent Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAgentType(AgentType.INBOUND)}
                      className={`py-3 rounded-2xl border text-xs font-bold transition-all ${agentType === AgentType.INBOUND ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : `border-white/10 ${isLightMode ? 'bg-zinc-50 text-zinc-600' : 'bg-white/5 text-zinc-400'}`}`}
                    >
                      Inbound
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentType(AgentType.OUTBOUND)}
                      className={`py-3 rounded-2xl border text-xs font-bold transition-all ${agentType === AgentType.OUTBOUND ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : `border-white/10 ${isLightMode ? 'bg-zinc-50 text-zinc-600' : 'bg-white/5 text-zinc-400'}`}`}
                    >
                      Outbound
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Luno Agent ID</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. agent_550e8400-e29b-41d4..."
                      className={`w-full border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm font-mono ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                    />
                  </div>
                </div>

                {agentType === AgentType.OUTBOUND && (
                  <div className="space-y-2">
                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Agent Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                      <input 
                        type="text" 
                        placeholder="e.g. +16475696035"
                        className={`w-full border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-purple-500 transition-colors text-sm font-mono ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        {selectedAgent ? 'Update Connection' : 'Verify & Establish'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && pendingDeleteAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl text-center ${isLightMode ? 'bg-white border-red-500/20' : 'border-red-500/20'}`}
            >
              <div className="p-8 pt-12 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 tracking-tight ${primaryText}`}>Decommission Agent?</h3>
                <p className={`text-sm leading-relaxed max-w-[280px] ${secondaryText}`}>
                  You are about to disconnect <span className={`${primaryText} font-bold`}>{pendingDeleteAgent.agent_nickname}</span> from the Luno ecosystem.
                </p>
              </div>

              <div className="p-8 space-y-3">
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="w-full py-5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Confirm Disconnection
                </button>
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className={`w-full py-5 glass rounded-2xl font-bold transition-all ${isLightMode ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-black' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                >
                  Keep Resource
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invalid Agent ID Prompt */}
      <AnimatePresence>
        {showInvalidPrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl text-center ${isLightMode ? 'bg-white border-red-500/20' : 'border-red-500/20'}`}
            >
              <div className="p-8 pt-12 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 tracking-tight ${primaryText}`}>Invalid Agent ID</h3>
                <p className={`text-sm leading-relaxed max-w-[280px] ${secondaryText}`}>
                  The infrastructure for <span className={`${primaryText} font-bold`}>{showInvalidPrompt}</span> could not be synchronized. Please verify the Agent ID in your Luno Console.
                </p>
              </div>

              <div className="p-8">
                <button 
                  onClick={() => setShowInvalidPrompt(null)}
                  className={`w-full py-5 rounded-2xl font-bold transition-all ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}
                >
                  Acknowledged
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Setup Modal */}
      <AnimatePresence>
        {sqlSetupInfo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl glass rounded-[40px] border overflow-hidden shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'}`}
            >
              <div className={`p-8 flex justify-between items-center border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                <div>
                  <h3 className={`text-2xl font-bold ${primaryText}`}>SQL Setup Required</h3>
                  <p className={`${mutedText} text-xs mt-1`}>Automatic table creation requires a one-time setup.</p>
                </div>
                <button onClick={() => setSqlSetupInfo(null)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'}`}>
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <p className={`text-sm leading-relaxed ${secondaryText}`}>
                    {sqlSetupInfo.details}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Step 1: Enable SQL Execution</label>
                  <div className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-black/40 border-white/5'}`}>
                    <pre className="text-purple-400">{sqlSetupInfo.setupSql}</pre>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">Copy and run this in your Supabase SQL Editor.</p>
                </div>

                <div className="space-y-3">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${labelText}`}>Step 2: Create Table (Manual Fallback)</label>
                  <div className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-black/40 border-white/5'}`}>
                    <pre className="text-blue-400">{sqlSetupInfo.tableSql}</pre>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setSqlSetupInfo(null)}
                    className={`w-full py-5 rounded-2xl font-bold transition-all shadow-xl ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}
                  >
                    Acknowledged
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
