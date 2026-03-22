
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Phone, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

interface LeaderboardEntry {
  employee: string;
  firstName: string;
  totalCalls: number;
  bookedMeetings: number;
}

interface LeaderboardProps {
  isLightMode?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isLightMode }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/calling/leaderboard', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setEntries(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard();
      }
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm font-bold uppercase tracking-widest">
        Error loading leaderboard
      </div>
    );
  }

  return (
    <div className={`rounded-3xl overflow-hidden border ${isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-white/5 border-white/5 shadow-xl shadow-black/20'}`}>
      <div className={`p-6 border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'} flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Leaderboard</h3>
          <p className={`text-xs font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Top Performers</p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {entries.map((entry, index) => (
          <motion.div 
            key={entry.employee}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-2xl border transition-all group flex items-center justify-between ${
              isLightMode ? 'bg-zinc-50 border-zinc-100 hover:border-zinc-200' : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                  index === 2 ? 'bg-amber-600/20 text-amber-600' :
                  isLightMode ? 'bg-zinc-200 text-zinc-500' : 'bg-white/10 text-zinc-500'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className="absolute -top-1 -right-1">
                    <Medal className={`w-4 h-4 ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-zinc-400' :
                      'text-amber-600'
                    }`} />
                  </div>
                )}
              </div>
              <div>
                <p className={`text-xs font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                  {entry.firstName || entry.employee}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Phone className="w-2.5 h-2.5" /> {entry.totalCalls} Total Calls
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-purple-500">{entry.bookedMeetings}</p>
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Booked Calls</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
