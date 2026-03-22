import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, X, ChevronRight, Command } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface TerminalProps {
  logs: LogEntry[];
  onClose: () => void;
  isLightMode?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onClose, isLightMode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-emerald-400';
      default: return 'text-purple-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed bottom-8 right-8 w-full max-w-2xl h-[400px] glass rounded-[24px] border shadow-2xl z-[200] flex flex-col overflow-hidden ${
        isLightMode ? 'bg-white/90 border-zinc-200' : 'bg-black/90 border-white/10'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
        isLightMode ? 'border-zinc-100 bg-zinc-50' : 'border-white/5 bg-white/5'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="w-px h-4 bg-zinc-700 mx-2" />
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">System Console</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isLightMode ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-white/10 text-zinc-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Log Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 font-mono text-[11px] leading-relaxed scrollbar-thin"
      >
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">Waiting for telemetry ignition...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 group">
                <span className="text-zinc-600 shrink-0 select-none">
                  [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                </span>
                <span className={`${getLevelColor(log.level)} shrink-0 font-bold`}>
                  {log.level.toUpperCase()}
                </span>
                <span className={isLightMode ? 'text-zinc-800' : 'text-zinc-300'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div className="flex items-center gap-2 text-purple-500/50 animate-pulse">
            <ChevronRight className="w-3 h-3" />
            <div className="w-1.5 h-3 bg-current" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-3 border-t flex items-center justify-between text-[9px] font-bold uppercase tracking-widest ${
        isLightMode ? 'border-zinc-100 text-zinc-400' : 'border-white/5 text-zinc-600'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Command className="w-3 h-3" />
            Luno Core v2.4.0
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Network: Stable
          </span>
        </div>
        <span>{logs.length} Events Logged</span>
      </div>
    </motion.div>
  );
};
