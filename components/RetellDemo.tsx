
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, Lock, Loader2, AlertCircle, PhoneOff, Sparkles } from 'lucide-react';

// Using direct ESM import to bypass Vite resolution issues in this environment
// @ts-ignore
import { RetellWebClient } from 'https://esm.sh/retell-client-js-sdk@2.0.7';

export const LunoAgentDemo: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'active'>('idle');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    const initializeSDK = () => {
      try {
        // Initialize the client directly from the ESM import
        sdkRef.current = new RetellWebClient();
        console.debug("[LUNO AI]: SDK Initialized successfully.");

        // Register Lifecycle Listeners
        sdkRef.current.on('call_started', () => {
          setStatus('active');
          setError(null);
        });

        sdkRef.current.on('call_ended', () => {
          setStatus('idle');
          setIsAgentSpeaking(false);
        });

        sdkRef.current.on('agent_start_talking', () => {
          setIsAgentSpeaking(true);
        });

        sdkRef.current.on('agent_stop_talking', () => {
          setIsAgentSpeaking(false);
        });

        sdkRef.current.on('error', (err: any) => {
          console.error('[LUNO AI]: SDK error:', err);
          setError('Handshake link lost.');
          setStatus('idle');
        });

      } catch (err: any) {
        console.error('[LUNO AI]: Initialization Error:', err);
        setError('System offline.');
      }
    };

    initializeSDK();

    return () => {
      if (sdkRef.current && typeof sdkRef.current.stopCall === 'function') {
        sdkRef.current.stopCall();
      }
    };
  }, []);

  const handleToggleCall = async () => {
    if (status === 'active') {
      sdkRef.current?.stopCall();
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch('/api/retell/create-web-call', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({}),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error(`Server sync failed`);
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data?.message || "Call limit reached. Try again later.");
        }
        if (data?.error === "Infrastructure key missing.") {
          throw new Error("API Key Missing: Please set RETELL_API_KEY in environment.");
        }
        throw new Error(data?.error || data?.details || `Luno Gateway Error ${response.status}`);
      }

      if (!data?.access_token) {
        throw new Error("Handshake incomplete: Missing token.");
      }

      if (sdkRef.current && typeof sdkRef.current.startCall === 'function') {
        await sdkRef.current.startCall({
          accessToken: data.access_token,
        });
      } else {
        throw new Error("SDK instance invalid.");
      }

    } catch (err: any) {
      console.error('[LUNO AI]: Demo initialization failed:', err);
      setError(err.message || 'Verification failed.');
      setStatus('idle');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[48px] border border-white/10 p-10 relative overflow-hidden shadow-2xl bg-black/40 backdrop-blur-2xl w-full max-sm"
    >
      <div 
        className="absolute -top-20 -right-20 w-64 h-64 pointer-events-none opacity-40" 
        style={{
          background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, transparent 70%)'
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Live Interaction</span>
          </div>
          <h4 className="text-3xl font-bold tracking-tighter text-white">Talk to Luno</h4>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 max-w-[240px]"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error}</span>
          </motion.div>
        )}

        <div className="relative mb-10">
          <AnimatePresence>
            {status === 'active' && isAgentSpeaking && (
              <motion.div 
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 -z-10 pointer-events-none" 
                style={{
                  background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.4) 0%, transparent 70%)'
                }}
              />
            )}
          </AnimatePresence>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleCall}
            disabled={status === 'loading'}
            className={`w-28 h-28 rounded-full flex items-center justify-center border transition-all duration-700 shadow-2xl ${
              status === 'active' 
              ? 'bg-purple-500 border-white/20 text-white shadow-purple-500/40' 
              : 'bg-white/5 border-white/10 text-zinc-400 hover:border-purple-500/50 hover:text-purple-400'
            }`}
          >
            {status === 'loading' ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : status === 'active' ? (
              <PhoneOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </motion.button>
        </div>

        <div className="space-y-6 w-full">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-1">SYSTEM STATE</span>
            <p className="text-sm font-medium text-white min-h-[1.25rem]">
              {status === 'idle' && 'Secure Link Ready'}
              {status === 'loading' && 'Establishing Handshake...'}
              {status === 'active' && (isAgentSpeaking ? 'Luno is responding' : 'Listening...')}
            </p>
          </div>

          <button 
            onClick={handleToggleCall}
            disabled={status === 'loading'}
            className={`w-full py-5 rounded-2xl font-bold transition-all relative group overflow-hidden ${
              status === 'active' ? 'bg-red-500 text-white hover:bg-red-600' : 'theme-button-primary hover:bg-purple-500 hover:text-white'
            }`}
          >
            <span className="relative z-10">
              {status === 'active' ? 'Terminate Link' : status === 'loading' ? 'Syncing...' : 'Initiate Sync'}
            </span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-700">
            <Lock className="w-2.5 h-2.5" />
            End-to-end Encrypted
          </div>
        </div>
      </div>
    </motion.div>
  );
};
