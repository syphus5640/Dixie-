
import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Phone, User, Building2, MessageSquare } from 'lucide-react';

interface CallUpdate {
  employeeName: string;
  businessName: string;
  status: string;
  notes: string;
  timestamp: string;
}

interface RealTimeCallMonitorProps {
  isAdmin: boolean;
}

export const RealTimeCallMonitor: React.FC<RealTimeCallMonitorProps> = ({ isAdmin }) => {
  useEffect(() => {
    if (!isAdmin) return;

    const socket: Socket = io(window.location.origin);

    socket.on('connect', () => {
      console.log('[MONITOR] Connected to real-time infrastructure');
    });

    socket.on('call_update', (data: CallUpdate) => {
      console.log('[MONITOR] Call update received:', data);
      
      toast.custom((t) => (
        <div className="bg-[#0a0a0b] border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[320px] backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Live Call Update</span>
                <span className="text-[10px] text-zinc-500 ml-auto">Just now</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-zinc-500" />
                  <p className="text-sm font-bold text-white">{data.employeeName} <span className="text-zinc-500 font-medium">called</span></p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-zinc-500" />
                  <p className="text-sm text-zinc-300 font-medium">{data.businessName}</p>
                </div>

                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {data.status.replace('_', ' ')}
                </div>

                {data.notes && (
                  <button 
                    onClick={() => {
                      toast.dismiss(t);
                      toast(
                        <div className="bg-[#0a0a0b] border border-white/10 p-6 rounded-3xl shadow-2xl min-w-[400px] backdrop-blur-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-purple-400" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Call Notes</h3>
                            <span className="text-[10px] text-zinc-500 ml-auto">{data.employeeName}</span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 italic">
                            "{data.notes}"
                          </p>
                          <div className="mt-4 flex justify-end">
                            <button 
                              onClick={() => toast.dismiss()}
                              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </div>,
                        { duration: 15000 }
                      );
                    }}
                    className="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors group"
                  >
                    <MessageSquare className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    View Detailed Notes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ), {
        duration: 8000,
        position: 'bottom-right',
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAdmin]);

  return null;
};
