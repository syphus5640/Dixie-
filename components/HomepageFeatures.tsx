
import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomepageFeatures: React.FC<{ onBookOpen: () => void; isLightMode?: boolean }> = ({ onBookOpen, isLightMode = false }) => {
  const navigate = useNavigate();

  return (
    <section className="relative px-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-20"
      >
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Choose your <span className="serif-italic italic font-normal text-purple-400">path.</span></h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          whileHover={{ y: -10 }}
          onClick={() => navigate('/solutions/web-design')}
          className={`p-8 md:p-12 rounded-[40px] md:rounded-[56px] border cursor-pointer group transition-all duration-700 ${
            isLightMode 
              ? 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-xl' 
              : 'glass hover:bg-white/[0.04] border-white/5'
          }`}
        >
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <Globe className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
            </div>
            <ArrowRight className={`w-5 h-5 md:w-6 md:h-6 group-hover:text-purple-400 group-hover:translate-x-2 transition-all duration-500 ${isLightMode ? 'text-zinc-300' : 'text-zinc-400'}`} />
          </div>
          <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Immersive Web Design</h3>
          <p className={`text-base md:text-lg leading-relaxed font-light mb-8 ${isLightMode ? 'text-zinc-900' : 'text-zinc-500'}`}>
            Artistic excellence meets high-performance engineering. We craft the physical beauty of the digital world.
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4">
             <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cloud Architecture</div>
             <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Motion Logic</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          whileHover={{ y: -10 }}
          onClick={() => navigate('/solutions/ai-automation')}
          className={`p-8 md:p-12 rounded-[40px] md:rounded-[56px] border cursor-pointer group transition-all duration-700 ${
            isLightMode 
              ? 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-xl' 
              : 'glass hover:bg-white/[0.04] border-white/5'
          }`}
        >
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
              <Cpu className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
            </div>
            <ArrowRight className={`w-5 h-5 md:w-6 md:h-6 group-hover:text-purple-400 group-hover:translate-x-2 transition-all duration-500 ${isLightMode ? 'text-zinc-300' : 'text-zinc-400'}`} />
          </div>
          <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Autonomous AI Agents</h3>
          <p className={`text-base md:text-lg leading-relaxed font-light mb-8 ${isLightMode ? 'text-zinc-900' : 'text-zinc-500'}`}>
            Neural agents that govern your operations. We build human-like logic that doesn't just automate—it thinks.
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4">
             <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agentic Workflows</div>
             <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">24/7 Availability</div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.4 }}
        className="mt-12 flex justify-center"
      >
        <button 
          onClick={() => navigate('/solutions')}
          className={`px-10 py-5 border rounded-full font-bold text-sm transition-all active:scale-95 ${
            isLightMode 
              ? 'text-zinc-600 border-zinc-200 hover:bg-zinc-100' 
              : 'text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          View Full Solution Ecosystem
        </button>
      </motion.div>
    </section>
  );
};
