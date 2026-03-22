
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  Zap, 
  ArrowLeft, 
  PhoneIncoming, 
  ShieldCheck,
  BrainCircuit,
  Play,
  Pause,
  Download,
  FileText,
  AlertCircle,
  Loader2,
  Mic,
  RefreshCw,
  CalendarDays,
  Check,
  Volume2,
  VolumeX,
  Volume1,
  Filter,
  Trophy,
  Star,
  Satellite,
  History,
  SortAsc,
  SortDesc,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Maximize2,
  Send,
  ClipboardList,
  PhoneCall,
  Search,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { AgentType } from '../src/types';

interface CallLog {
  id: string;
  timestamp: string;
  duration: number;
  sentiment: string;
  transcriptPreview: string;
  recordingUrl?: string;
  transcriptObject?: { role: string; content?: string; text?: string; speaker?: string }[];
  sentimentAnalysis?: string;
  callSummary?: string;
  isProcessing?: boolean;
  isLead?: boolean;
  capturedData?: {
    name?: string | boolean;
    phone?: string | boolean;
    email?: string | boolean;
  };
}

type TimePeriod = 1 | 7 | 30 | 365 | 'all';
type SortType = 'latest' | 'oldest' | 'longest' | 'shortest';
type ViewMode = 'grid' | 'calendar';

interface AnalyticsPageProps {
  isLightMode?: boolean;
  session?: any;
}

const periodOptions: { label: string, value: TimePeriod }[] = [
  { label: 'All', value: 'all' },
  { label: '1d', value: 1 }, 
  { label: '7d', value: 7 }, 
  { label: '1m', value: 30 }, 
  { label: '12m', value: 365 },
];

const findValueByFuzzyKey = (obj: any, keysToMatch: string[]) => {
  if (!obj) return undefined;
  const keys = Object.keys(obj);
  
  // 1. Try exact matches first (case-insensitive)
  for (const match of keysToMatch) {
    const found = keys.find(k => k.toLowerCase() === match.toLowerCase());
    if (found && obj[found] !== null && obj[found] !== undefined) return obj[found];
  }

  // 2. Try fuzzy matches
  const foundKey = keys.find(k => 
    keysToMatch.some(match => {
      const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedMatch = match.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Ensure we don't match 'id' to 'provider_id' too easily
      if (normalizedMatch === 'id') return normalizedK === 'id';
      return normalizedK === normalizedMatch || normalizedK.includes(normalizedMatch);
    })
  );
  if (foundKey && obj[foundKey] !== null && obj[foundKey] !== undefined) return obj[foundKey];

  // 3. Last resort: look for values that look like call IDs
  const values = Object.values(obj);
  const callIdValue = values.find(v => 
    typeof v === 'string' && 
    (v.toLowerCase().startsWith('call_') || (v.length > 20 && v.includes('-')))
  );
  return callIdValue;
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isLightMode = false, session }) => {
  console.log("[ANALYTICS] Render cycle initiated.");
  const navigate = useNavigate();
  const location = useLocation();
  const { agentId: stateAgentId, nickname: stateNickname, agentType: stateAgentType, agentPhone: stateAgentPhone } = (location.state as any) || {};

  // Track the actual current agent ID being viewed
  const [activeId, setActiveId] = useState<string>('');
  const [activeNickname, setActiveNickname] = useState<string>('Ai Agent');
  const [activeType, setActiveType] = useState<AgentType>(AgentType.INBOUND);
  const [activePhone, setActivePhone] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForFirstCall, setIsWaitingForFirstCall] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all');
  const [sortType, setSortType] = useState<SortType>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Outbound State
  const [phoneNumbersInput, setPhoneNumbersInput] = useState('');
  const [isTriggeringOutbound, setIsTriggeringOutbound] = useState(false);
  const [outboundSuccess, setOutboundSuccess] = useState<string | null>(null);
  const [outboundError, setOutboundError] = useState<string | null>(null);

  const [queueStatus, setQueueStatus] = useState<{
    userProgress: { completed: number; pending: number; total: number };
    monthlyUsage: { limit: number; used: number; remaining: number };
    queuePosition: number;
    totalPendingInSystem: number;
    etaMinutes: number;
    windowMessage: string | null;
  } | null>(null);

  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const prevPendingRef = useRef<number | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);
  const [filterLeadsOnly, setFilterLeadsOnly] = useState(false);

  // Scroll Lock for Call Detail View on Mobile
  useEffect(() => {
    if (selectedCallId && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedCallId]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const downloadRecording = async () => {
    if (!selectedCall?.recordingUrl) return;
    const date = new Date(selectedCall.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0, 5);
    const sanitizedNickname = activeNickname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    const filename = `${sanitizedNickname}_${dateStr}_${timeStr}.mp3`;

    try {
      const response = await fetch(selectedCall.recordingUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download recording:", error);
      // Fallback to direct link if fetch fails
      const link = document.createElement('a');
      link.href = selectedCall.recordingUrl;
      link.target = "_blank";
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadTranscript = () => {
    if (!selectedCall?.transcriptObject) return;
    const date = new Date(selectedCall.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0, 5);
    const sanitizedNickname = activeNickname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    const filename = `${sanitizedNickname}_${dateStr}_${timeStr}.txt`;

    const text = selectedCall.transcriptObject
      .map(line => `${line.role.toUpperCase()}: ${line.content || line.text}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedCallId]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Padding for start of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentMonth]);

  const getDaySentiment = (date: Date) => {
    const dayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === date.toDateString();
    });
    
    if (dayLogs.length === 0) return null;
    
    const scores: number[] = dayLogs.map(log => {
      const s = log.sentiment?.toLowerCase() || '';
      if (s.includes('positive')) return 1;
      if (s.includes('negative')) return -1;
      return 0;
    });
    
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { avg, count: dayLogs.length };
  };

  const getDayColor = (sentiment: { avg: number, count: number } | null) => {
    if (!sentiment) return isLightMode ? 'bg-zinc-50' : 'bg-white/5';
    
    const { avg } = sentiment;
    if (avg > 0.3) return 'bg-green-500/40 border-green-500/50';
    if (avg > 0) return 'bg-green-500/20 border-green-500/30';
    if (avg < -0.3) return 'bg-red-500/40 border-red-500/50';
    if (avg < 0) return 'bg-red-500/20 border-red-500/30';
    return 'bg-zinc-500/20 border-zinc-500/30';
  };

  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: '0',
    avgDuration: '0:00',
    sentimentScore: 'N/A',
    leadsCaptured: 0
  });

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initialization & Sync logic
  useEffect(() => {
    console.log("[ANALYTICS] Component mounted/updated. Checking for Agent ID...");
    const rawId = stateAgentId || sessionStorage.getItem('luno_active_agent_id');
    const rawNick = stateNickname || sessionStorage.getItem('luno_active_nickname');
    const rawType = stateAgentType || sessionStorage.getItem('luno_active_agent_type');
    const rawPhone = stateAgentPhone || sessionStorage.getItem('luno_active_agent_phone');

    const id = rawId?.trim();
    const nick = rawNick?.trim();
    const type = (rawType as AgentType) || AgentType.INBOUND;
    const phone = rawPhone?.trim() || '';

    if (id && id !== 'null' && id !== 'undefined' && id !== '') {
      console.log(`[ANALYTICS] Valid Agent ID found: ${id}. Initializing fetch...`);
      setActiveId(id);
      setActiveNickname(nick || 'Ai Agent');
      setActiveType(type);
      setActivePhone(phone);
      
      // Always update session storage with the latest known valid ID/Nick
      sessionStorage.setItem('luno_active_agent_id', id);
      if (nick) sessionStorage.setItem('luno_active_nickname', nick);
      sessionStorage.setItem('luno_active_agent_type', type);
      sessionStorage.setItem('luno_active_agent_phone', phone);
      
      orchestrateDataFetch(id, type, false);
    } else {
      console.warn("[ANALYTICS] No valid Agent ID found in state or session storage.");
      setLoading(false);
      if (location.pathname === '/analytics') {
        setError("Infrastructure Link Lost. Please re-select the agent from your Dashboard.");
      }
    }
  }, [stateAgentId, stateNickname, location.pathname, session]);

  // Automatic Polling: Every 5 minutes
  useEffect(() => {
    if (!activeId || loading) return;

    const intervalId = setInterval(() => {
      console.debug(`[LUNO TELEMETRY]: Initiating scheduled 5-minute sync for ${activeId}`);
      orchestrateDataFetch(activeId, activeType, true);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [activeId, loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const orchestrateDataFetch = async (id: string, type: AgentType, silent: boolean = false) => {
    let currentToken = session?.access_token;
    
    if (!currentToken) {
      console.warn("[ANALYTICS] No session token found in props. Fetching from Supabase...");
      const { data } = await supabase.auth.getSession();
      currentToken = data.session?.access_token;
      
      if (!currentToken) {
        console.error("[ANALYTICS] Authentication failed. No session available.");
        setLoading(false);
        setError("Authentication Required. Please sign in again.");
        return;
      }
    }

    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    setError(null);
    setIsWaitingForFirstCall(false);

    try {
      // Fetch queue status if it's an outbound agent
      if (type === AgentType.OUTBOUND) {
        fetchQueueStatus(currentToken, id);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`/api/database/fetch-rows?agent_id=${encodeURIComponent(id)}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 || errData.error?.includes('42P01')) {
          setIsWaitingForFirstCall(true);
          setLastUpdated(new Date());
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
        throw new Error(errData.error || "Neural Handshake Failed");
      }

      const rows = await res.json();
      setLastUpdated(new Date());
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        setLogs([]);
        setIsWaitingForFirstCall(true);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      setIsWaitingForFirstCall(false);
      const baseLogs: CallLog[] = rows.map((row: any) => {
        const rawSentiment = findValueByFuzzyKey(row, ['user_sentiment', 'sentiment', 'outcome', 'analysis']);
        const ts = findValueByFuzzyKey(row, ['created_at', 'start_time', 'timestamp', 'start_timestamp', 'start_at']);
        
        let finalTs = new Date().toISOString();
        if (ts) {
          let parsed: Date;
          if (typeof ts === 'number') {
            parsed = new Date(ts < 10000000000 ? ts * 1000 : ts);
          } else if (typeof ts === 'string' && !isNaN(Number(ts))) {
            const numTs = Number(ts);
            parsed = new Date(numTs < 10000000000 ? numTs * 1000 : numTs);
          } else {
            parsed = new Date(ts);
          }
          if (!isNaN(parsed.getTime())) {
            finalTs = parsed.toISOString();
          }
        }

        return {
          id: findValueByFuzzyKey(row, ['call_id', 'session_id', 'id']) || 'unknown',
          duration: Number(findValueByFuzzyKey(row, ['duration', 'length', 'time', 'call_duration'])) || 0,
          timestamp: finalTs,
          sentiment: typeof rawSentiment === 'string' ? rawSentiment : 'Neutral',
          transcriptPreview: 'Fetching...',
          isProcessing: true,
          isLead: false
        };
      }).filter((l: CallLog) => l.id !== 'unknown');

      setLogs(baseLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      const enrichedLogs = await Promise.all(
        baseLogs.slice(0, 30).map(async (call) => {
          try {
            const detailRes = await fetch(`/api/retell/get-call/${call.id}`);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const transcriptText = detail.transcript || "";
              const customData = detail.call_analysis?.custom_analysis_data || {};
              const isLead = transcriptText.length > 50 && (transcriptText.includes("@") || !!customData.email || !!customData.phone);

              return {
                ...call,
                recordingUrl: detail.recording_url,
                transcriptObject: detail.transcript_object || (detail.transcript ? [{role: 'call', text: detail.transcript}] : []),
                sentiment: detail.call_analysis?.user_sentiment || call.sentiment,
                callSummary: detail.call_analysis?.call_summary,
                timestamp: (() => {
                  if (detail.start_timestamp) {
                    const d = new Date(detail.start_timestamp);
                    if (!isNaN(d.getTime())) return d.toISOString();
                  }
                  return call.timestamp;
                })(),
                duration: detail.duration_ms || call.duration,
                isProcessing: detail.call_status === 'processing',
                isLead: isLead,
                capturedData: { 
                  name: customData.name || customData.customer_name || (transcriptText.includes("my name is") ? "Captured" : false), 
                  phone: customData.phone || customData.phone_number || false, 
                  email: customData.email || (transcriptText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || false)
                }
              };
            }
          } catch (e) {}
          return { ...call, isProcessing: false };
        })
      );

      setLogs(enrichedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchQueueStatus = async (token: string, agentId: string) => {
    try {
      const res = await fetch(`/api/outbound/queue-status?agent_id=${encodeURIComponent(agentId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Handle completion message logic
        if (prevPendingRef.current !== null && prevPendingRef.current > 0 && data.userProgress.pending === 0) {
          setShowCompletionMessage(true);
        }
        prevPendingRef.current = data.userProgress.pending;
        
        setQueueStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch queue status:", e);
    }
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      let dateInRange = true;
      if (selectedCalendarDay) {
        dateInRange = new Date(log.timestamp).toDateString() === selectedCalendarDay;
      } else if (selectedPeriod !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - (selectedPeriod as number));
        dateInRange = new Date(log.timestamp) >= cutoffDate;
      }
      const leadsMatch = !filterLeadsOnly || log.isLead;
      let sentimentMatch = true;
      if (selectedSentiments.length > 0) {
        sentimentMatch = selectedSentiments.some(s => log.sentiment?.toLowerCase().includes(s.toLowerCase()));
      }
      return dateInRange && leadsMatch && sentimentMatch;
    }).sort((a, b) => {
      if (sortType === 'latest') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortType === 'oldest') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (sortType === 'longest') return b.duration - a.duration;
      return a.duration - b.duration;
    });
  }, [logs, selectedPeriod, sortType, filterLeadsOnly, selectedSentiments, selectedCalendarDay]);

  useEffect(() => {
    if (filteredLogs.length === 0) {
      setStats({ totalCalls: 0, totalDuration: '0', avgDuration: '0:00', sentimentScore: 'N/A', leadsCaptured: 0 });
      return;
    }
    const totalMs = filteredLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const avgMs = totalMs / filteredLogs.length;
    const scores = filteredLogs.map(c => c.sentiment?.toLowerCase().includes('positive') ? 5 : c.sentiment?.toLowerCase().includes('negative') ? 1 : 3);
    setStats({
      totalCalls: filteredLogs.length,
      totalDuration: (totalMs / 60000).toFixed(1),
      avgDuration: `${Math.floor(avgMs / 60000)}:${Math.floor((avgMs % 60000) / 1000).toString().padStart(2, '0')}`,
      sentimentScore: `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)} / 5`,
      leadsCaptured: filteredLogs.filter(c => c.isLead).length
    });
  }, [filteredLogs]);

  const selectedCall = useMemo(() => logs.find(c => c.id === selectedCallId), [logs, selectedCallId]);

  const handleTriggerOutbound = async () => {
    if (!phoneNumbersInput.trim()) return;
    
    setIsTriggeringOutbound(true);
    setOutboundError(null);
    setOutboundSuccess(null);

    // Parse numbers: split by comma, newline, or space and filter empty
    const numbers = phoneNumbersInput
      .split(/[\n,\s]+/)
      .map(n => n.trim().replace(/[^\d+]/g, '')) // Clean formatting: keep only digits and +
      .filter(n => n.length > 5); // Basic validation

    if (numbers.length === 0) {
      setOutboundError("No valid phone numbers found.");
      setIsTriggeringOutbound(false);
      return;
    }

    if (numbers.length > 100) {
      setOutboundError("Maximum 100 numbers allowed per batch.");
      setIsTriggeringOutbound(false);
      return;
    }

    try {
      let currentToken = session?.access_token;
      if (!currentToken) {
        const { data } = await supabase.auth.getSession();
        currentToken = data.session?.access_token;
      }

      const res = await fetch('/api/outbound/trigger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          agent_id: activeId,
          agent_phone: activePhone,
          phone_numbers: numbers
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to trigger outbound calls");
      }

      setOutboundSuccess(`Successfully initiated calls to ${numbers.length} numbers.`);
      setPhoneNumbersInput('');
      
      // Refresh logs and queue status after a short delay
      setTimeout(() => orchestrateDataFetch(activeId, activeType, true), 2000);
    } catch (err: any) {
      setOutboundError(err.message);
    } finally {
      setIsTriggeringOutbound(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-6 py-32">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <div className="absolute inset-0 blur-xl bg-purple-500/20 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Decrypting Neural Logs</span>
        <span className="text-[8px] font-mono text-zinc-600 animate-pulse">Establishing Secure Link...</span>
      </div>
    </div>
  );

  return (
    <div key={location.key} className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-50" />
      
      <div className="max-w-7xl mx-auto px-6 pt-2 pb-12 relative min-h-screen">
        <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/dashboard')} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors group ${isLightMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-500 hover:text-white'}`}>
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          RETURN TO DASHBOARD
        </button>
        <div className="flex items-center gap-4">
           {activeId && (
             <button onClick={() => orchestrateDataFetch(activeId, activeType, true)} disabled={isRefreshing} className={`p-2 glass rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'}`}>
               <RefreshCw className={`w-3 h-3 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
             </button>
           )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1">Telemetry Fault</p>
              <p className="text-sm font-light opacity-80">{error}</p>
            </div>
            <button onClick={() => orchestrateDataFetch(activeId, activeType)} className="ml-auto px-4 py-2 glass rounded-xl text-[10px] font-bold uppercase tracking-widest">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
              <h1 className={`text-3xl md:text-5xl font-bold tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>{activeNickname}</h1>
            </div>
            <p className="text-zinc-500 font-mono text-[10px] md:text-xs opacity-60 uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
              {activeId ? (activeId.toLowerCase().startsWith('agent_') ? activeId : `agent_${activeId}`) : 'No Agent Selected'}
            </p>
          </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className={`glass p-1 rounded-xl md:rounded-2xl border flex items-center gap-1 overflow-x-auto no-scrollbar ${isLightMode ? 'border-zinc-200 bg-white' : 'border-white/5'}`}>
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-2.5 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedPeriod === option.value 
                    ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                    : `text-zinc-500 hover:text-zinc-300 ${isLightMode ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`
                }`}
              >
                {option.label}
              </button>
            ))}
            <div className={`w-px h-4 mx-1 shrink-0 ${isLightMode ? 'bg-zinc-200' : 'bg-white/10'}`} />
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'calendar' : 'grid')}
              className={`p-1.5 rounded-lg md:rounded-xl transition-all shrink-0 ${viewMode === 'calendar' ? 'bg-purple-500 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Outbound Call Section */}
      <AnimatePresence>
        {activeType === AgentType.OUTBOUND && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 md:mb-12 glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border relative overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}
          >
            <div 
              className="absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 pointer-events-none -z-10 opacity-40" 
              style={{
                background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)'
              }}
            />
            
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
              <div className="lg:w-1/3">
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <PhoneCall className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <h3 className={`text-lg md:text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Outbound Campaign</h3>
                </div>
                <p className={`text-xs md:text-sm mb-4 md:mb-6 leading-relaxed ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  Initiate autonomous outbound calls. Enter up to 100 phone numbers below.
                </p>
                
                <div className="space-y-3 md:space-y-4">
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border flex items-center gap-3 md:gap-4 ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/5'}`}>
                    <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-zinc-500" />
                    <div>
                      <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Batch Limit</p>
                      <p className={`text-[10px] md:text-xs font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>100 Numbers / Request</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-2/3 space-y-4">
                <div className="relative">
                  <textarea
                    value={phoneNumbersInput}
                    onChange={(e) => setPhoneNumbersInput(e.target.value)}
                    placeholder="+1234567890, +1987654321..."
                    className={`w-full h-32 md:h-40 rounded-2xl md:rounded-3xl p-4 md:p-6 text-xs md:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none border ${isLightMode ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                  />
                  <div className="absolute bottom-3 right-4 flex items-center gap-4">
                    {queueStatus && (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Balance:</span>
                        <span className={`text-[10px] font-bold ${queueStatus.monthlyUsage.remaining < 10 ? 'text-red-400' : 'text-green-400'}`}>
                          {queueStatus.monthlyUsage.remaining} left
                        </span>
                      </div>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {phoneNumbersInput.split(/[\n,]+/).filter(n => n.trim().length > 5).length} / {Math.min(100, queueStatus?.monthlyUsage.remaining || 100)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 w-full">
                    {outboundError && (
                      <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {outboundError}
                      </div>
                    )}
                    {outboundSuccess && (
                      <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                        <Check className="w-3.5 h-3.5" />
                        {outboundSuccess}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleTriggerOutbound}
                    disabled={isTriggeringOutbound || !phoneNumbersInput.trim()}
                    className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all shadow-xl disabled:opacity-50 ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-blue-500 hover:text-white'}`}
                  >
                    {isTriggeringOutbound ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Launch Sequence
                  </button>
                </div>

                {/* Queue Status Display */}
                {queueStatus && (queueStatus.userProgress.pending > 0 || showCompletionMessage) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`mt-6 p-5 rounded-2xl border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/5'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${queueStatus.windowMessage ? 'text-amber-400' : (showCompletionMessage && queueStatus.userProgress.pending === 0 ? 'text-green-400' : 'text-purple-400')}`} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Queue Intelligence</span>
                        </div>
                        <h4 className={`text-sm font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>
                          {showCompletionMessage && queueStatus.userProgress.pending === 0 
                            ? `Batch Completed: ${queueStatus.userProgress.total} calls processed` 
                            : (queueStatus.windowMessage || 'Sequence in Progress')}
                        </h4>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Monthly Usage</p>
                          <p className={`text-xs font-mono font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>
                            {queueStatus.monthlyUsage.used} / {queueStatus.monthlyUsage.limit}
                          </p>
                        </div>
                        
                        {queueStatus.userProgress.pending > 0 && (
                          <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Est. Completion</p>
                            <p className={`text-xs font-mono font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>
                              ~{queueStatus.etaMinutes} min
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {queueStatus.userProgress.pending > 0 && (
                      <div className="mt-4 w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(queueStatus.userProgress.completed / queueStatus.userProgress.total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        />
                      </div>
                    )}
                    
                    {queueStatus.userProgress.pending > 0 && (
                      <p className="mt-3 text-[9px] font-medium text-zinc-500 italic">
                        * 3-minute safety delay active between calls to ensure line stability.
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
        {[
          { label: 'Volume', value: stats.totalCalls, icon: PhoneIncoming },
          { label: 'Sentiment', value: stats.sentimentScore, icon: ShieldCheck },
          { label: 'Duration', value: stats.avgDuration, icon: Clock },
          { label: 'Leads', value: stats.leadsCaptured, icon: Trophy },
        ].map((stat, i) => (
          <div key={i} className={`glass p-5 md:p-8 rounded-[24px] md:rounded-[32px] border relative h-32 md:h-40 flex flex-col justify-between ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/5'}`}>
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-purple-400 ${isLightMode ? 'bg-zinc-50' : 'bg-white/5'}`}>
              <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            <div>
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5 md:mb-1">{stat.label}</p>
              <h4 className={`text-lg md:text-2xl font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start pb-20">
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Session History ({filteredLogs.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative" ref={sortRef}>
                <button 
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${showSortMenu ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : `glass ${isLightMode ? 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50' : 'border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'}`}`}
                >
                  {sortType === 'latest' || sortType === 'longest' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />}
                  <span className="text-[9px] font-bold uppercase tracking-widest">Sort</span>
                </button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-40 glass rounded-2xl border p-2 z-50 shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-white/10'}`}
                    >
                      {[
                        { id: 'latest', label: 'Latest', icon: Clock },
                        { id: 'oldest', label: 'Oldest', icon: History },
                        { id: 'longest', label: 'Longest', icon: SortDesc },
                        { id: 'shortest', label: 'Shortest', icon: SortAsc },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortType(option.id as any);
                            setShowSortMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                            sortType === option.id 
                              ? 'bg-purple-500 text-white' 
                              : `text-zinc-500 ${isLightMode ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`
                          }`}
                        >
                          <option.icon className="w-3 h-3" />
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${showFilterMenu ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : `glass ${isLightMode ? 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50' : 'border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'}`}`}
                >
                  <Filter className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Filter</span>
                </button>

                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-56 glass rounded-2xl border p-4 z-50 shadow-2xl ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-white/10'}`}
                    >
                      <div className="space-y-4">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Sentiment</p>
                          <div className="flex flex-wrap gap-2">
                            {['Positive', 'Neutral', 'Negative'].map(s => (
                              <button
                                key={s}
                                onClick={() => {
                                  setSelectedSentiments(prev => 
                                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                                  );
                                }}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${
                                  selectedSentiments.includes(s)
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                    : `border-transparent text-zinc-500 ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/5'}`
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={`h-px ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`} />

                        <button
                          onClick={() => setFilterLeadsOnly(!filterLeadsOnly)}
                          className="w-full flex items-center justify-between group"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">Leads Only</span>
                          <div className={`w-8 h-4 rounded-full relative transition-colors ${filterLeadsOnly ? 'bg-purple-500' : 'bg-zinc-800'}`}>
                            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${filterLeadsOnly ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>

                        {(selectedSentiments.length > 0 || filterLeadsOnly) && (
                          <button
                            onClick={() => {
                              setSelectedSentiments([]);
                              setFilterLeadsOnly(false);
                            }}
                            className="w-full py-2 text-[8px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'calendar' ? (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`glass p-5 md:p-6 rounded-[28px] md:rounded-[32px] border ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/5'}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className={`text-xs md:text-sm font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/5'}`}
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-500" />
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/5'}`}
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-[8px] font-bold text-center text-zinc-600 uppercase tracking-widest">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {daysInMonth.map((date, i) => {
                    if (!date) return <div key={`pad-${i}`} />;
                    const sentiment = getDaySentiment(date);
                    const isSelected = selectedCalendarDay === date.toDateString();
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedCalendarDay(isSelected ? null : date.toDateString())}
                        className={`aspect-square rounded-lg md:rounded-xl border flex flex-col items-center justify-center transition-all relative group ${getDayColor(sentiment)} ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent scale-105 z-10' : 'hover:scale-105'}`}
                      >
                        <span className={`text-[9px] md:text-[10px] font-bold ${sentiment ? 'text-white' : 'text-zinc-500'}`}>{date.getDate()}</span>
                        {sentiment && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-purple-500 rounded-full flex items-center justify-center border-2 border-black">
                            <span className="text-[5px] md:text-[6px] text-white font-bold">{sentiment.count}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500/40" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Positive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-500/20" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Neutral</span>
                  </div>
                </div>

                {selectedCalendarDay && (
                  <div className="mt-8 pt-6 border-t border-white/5 space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Calls on {new Date(selectedCalendarDay).toLocaleDateString()}</h5>
                      <button 
                        onClick={() => setSelectedCalendarDay(null)}
                        className="text-[8px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300"
                      >
                        Clear
                      </button>
                    </div>
                    {filteredLogs.length > 0 ? filteredLogs.map((call) => (
                      <button 
                        key={call.id} 
                        onClick={() => setSelectedCallId(call.id)} 
                        className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${selectedCallId === call.id ? `bg-purple-500/10 border-purple-500/30` : `glass ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/5 hover:border-white/10'}`}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-mono text-zinc-600 uppercase">#{call.id.slice(-6)}</span>
                          <div className="flex gap-1">
                            {call.isProcessing && <Loader2 className="w-2.5 h-2.5 text-purple-500 animate-spin" />}
                            {call.isLead && <Trophy className="w-2.5 h-2.5 text-yellow-500" />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                          <span className="flex items-center gap-1"><Clock className="w-2 h-2" /> {(call.duration/1000).toFixed(0)}s</span>
                          <span className={call.sentiment?.toLowerCase().includes('positive') ? 'text-green-500 font-bold' : 'text-zinc-500'}>{call.sentiment}</span>
                        </div>
                      </button>
                    )) : (
                      <p className="text-[10px] text-zinc-500 text-center py-4 italic">No calls matching filters on this day.</p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin"
              >
                {filteredLogs.length > 0 ? filteredLogs.map((call) => (
                  <button key={call.id} onClick={() => setSelectedCallId(call.id)} className={`w-full text-left p-5 md:p-6 rounded-[28px] md:rounded-[32px] border transition-all relative overflow-hidden group ${selectedCallId === call.id ? `bg-purple-500/10 border-purple-500/30` : `glass ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/5 hover:border-white/10'}`}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[8px] md:text-[9px] font-mono text-zinc-600 uppercase">#{call.id.slice(-6)}</span>
                      <div className="flex gap-2">
                        {call.isProcessing && <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />}
                        {call.isLead && <Trophy className="w-3 h-3 text-yellow-500" />}
                      </div>
                    </div>
                    <p className={`text-xs md:text-sm font-bold mb-3 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{new Date(call.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <div className="flex items-center justify-between text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {(call.duration/1000).toFixed(0)}s</span>
                      <span className={call.sentiment?.toLowerCase().includes('positive') ? 'text-green-500 font-bold' : 'text-zinc-500'}>{call.sentiment}</span>
                    </div>
                  </button>
                )) : (
                  <div className={`p-8 md:p-12 text-center glass border border-dashed rounded-[28px] md:rounded-[32px] opacity-40 ${isLightMode ? 'bg-white border-zinc-200' : 'border-white/5'}`}>
                    {isWaitingForFirstCall ? (
                      <>
                        <Satellite className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-4 text-purple-500 animate-pulse" />
                        <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">Waiting for Activation</h4>
                        <p className="text-[10px] md:text-xs font-light">Perform your first call to ignite the telemetry stream.</p>
                      </>
                    ) : (
                      <>
                        <History className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-4 text-zinc-600" />
                        <p className="text-[10px] md:text-xs font-light">No logs found for this period.</p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-8 h-full">
          <AnimatePresence mode="wait">
            {selectedCall ? (
              <motion.div 
                key={selectedCall.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`fixed inset-0 z-[130] lg:relative lg:inset-auto glass lg:rounded-[48px] border overflow-hidden shadow-2xl flex flex-col h-full lg:h-[750px] ${isLightMode ? 'bg-white border-zinc-200' : 'bg-black lg:bg-transparent border-white/10'}`}
              >
                <audio 
                  ref={audioRef}
                  src={selectedCall.recordingUrl}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                />
                
                {/* Header with Playback Controls */}
                <div className={`p-6 md:p-8 border-b shrink-0 flex flex-col gap-4 md:gap-6 ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                       <button 
                         onClick={togglePlay}
                         disabled={!selectedCall.recordingUrl}
                         className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform shadow-lg disabled:opacity-50 ${isLightMode ? 'bg-black' : 'bg-purple-500 shadow-purple-500/20'}`}
                       >
                         {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-1" />}
                       </button>
                       <div>
                          <h3 className={`text-lg md:text-2xl font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>{new Date(selectedCall.timestamp).toLocaleDateString()}</h3>
                          <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-mono tracking-widest truncate max-w-[120px] md:max-w-none">{selectedCall.id}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                       <button 
                         onClick={downloadRecording}
                         disabled={!selectedCall.recordingUrl}
                         className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl border flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${isLightMode ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100' : 'bg-white/5 border-white/10 hover:bg-white/10'} disabled:opacity-30`}
                         title="Download Recording"
                       >
                         <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                         <span className="hidden sm:inline">Audio</span>
                       </button>
                       <button 
                         onClick={downloadTranscript}
                         disabled={!selectedCall.transcriptObject}
                         className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl border flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${isLightMode ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100' : 'bg-white/5 border-white/10 hover:bg-white/10'} disabled:opacity-30`}
                         title="Download Transcript"
                       >
                         <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                         <span className="hidden sm:inline">Transcript</span>
                       </button>
                       <button 
                         onClick={() => setSelectedCallId(null)}
                         className={`lg:hidden p-2.5 rounded-xl border ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/10'}`}
                       >
                         <X className="w-4 h-4 text-zinc-500" />
                       </button>
                    </div>
                  </div>

                  {/* Playback Bar & Volume */}
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex-grow flex items-center gap-3 md:gap-4">
                      <span className="text-[9px] md:text-[10px] font-mono text-zinc-500 w-8 md:w-10 text-right">{formatTime(currentTime)}</span>
                      <div className="flex-grow relative group h-1.5">
                        <input 
                          type="range" 
                          min="0" 
                          max={duration || 0} 
                          value={currentTime} 
                          onChange={handleSeek}
                          className="absolute inset-0 w-full h-full bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 z-10 opacity-0"
                        />
                        <div className="absolute inset-0 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-mono text-zinc-500 w-8 md:w-10">{formatTime(duration)}</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-3 min-w-[120px]">
                      <button 
                        onClick={() => setVolume(volume === 0 ? 1 : 0)} 
                        className={`transition-colors ${isLightMode ? 'text-zinc-400 hover:text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        {volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
                  {/* Left Side: Summary */}
                  <div className={`w-full lg:w-1/2 p-6 md:p-10 border-b lg:border-b-0 lg:border-r overflow-y-auto scrollbar-thin ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                    <section>
                      <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Summary
                      </h4>
                      <div className={`p-5 md:p-6 rounded-2xl md:rounded-3xl ${isLightMode ? 'bg-zinc-50' : 'bg-white/5'}`}>
                        <p className={`text-xs md:text-sm italic leading-relaxed ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
                          {selectedCall.callSummary || "Intelligent summary processing..."}
                        </p>
                      </div>
                    </section>

                    {selectedCall.capturedData && (
                      <section className="mt-6 md:mt-8">
                        <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Lead Info
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(selectedCall.capturedData).map(([key, val]) => val && (
                            <div key={key} className={`p-3 rounded-xl flex justify-between items-center ${isLightMode ? 'bg-zinc-50' : 'bg-white/5'}`}>
                              <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-zinc-500">{key}</span>
                              <span className={`text-[9px] md:text-[10px] font-mono ${isLightMode ? 'text-black' : 'text-white'}`}>{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Right Side: Transcript */}
                  <div className={`w-full lg:w-1/2 p-6 md:p-10 overflow-y-auto scrollbar-thin ${isLightMode ? 'bg-zinc-50/50' : 'bg-black/20'}`}>
                    <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Transcript
                    </h4>
                    <div className="space-y-4">
                      {selectedCall.transcriptObject?.map((line, i) => {
                        const isAgent = line.role === 'agent' || line.role === 'assistant' || line.role === 'bot' || line.role === 'call';
                        return (
                          <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] p-3 md:p-4 rounded-xl md:rounded-2xl text-[11px] md:text-xs relative ${
                              isAgent 
                                ? 'bg-purple-500/10 border border-purple-500/20 rounded-tl-none' 
                                : 'bg-zinc-500/10 border border-zinc-500/20 rounded-tr-none'
                            }`}>
                              <span className="font-bold uppercase tracking-widest text-[7px] md:text-[8px] mb-1 block opacity-50">
                                {isAgent ? 'Ai Agent' : 'User'}
                              </span>
                              <p className={`leading-relaxed ${isLightMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                                {line.content || line.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className={`hidden lg:flex glass rounded-[48px] h-[750px] flex-col items-center justify-center border p-16 text-center ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'border-white/5'}`}>
                <Activity className="w-12 h-12 text-zinc-800 animate-pulse mb-8" />
                <h3 className={`text-2xl font-bold mb-4 ${isLightMode ? 'text-black' : 'text-white'}`}>Select a Session</h3>
                <p className="text-zinc-500 text-sm max-w-sm font-light">Choose a call session from the grid to load data from</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
