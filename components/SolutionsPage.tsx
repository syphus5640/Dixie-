
import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowRight, Sparkles, Globe, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SolutionsPageProps {
  isLightMode?: boolean;
}

export const SolutionsPage: React.FC<SolutionsPageProps> = ({ isLightMode = false }) => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />

      {/* Bottom Horizon Effect - Moved outside max-w-7xl to prevent clipping */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200vw] h-[800px] -z-10 pointer-events-none opacity-40" 
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(139, 92, 246, 0.15) 0%, transparent 50%)'
        }}
      />

      <div className="max-w-7xl mx-auto pb-32 relative">
        {/* Main Narrative Section */}
      <div className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-6 z-10 pt-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-10 border border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] animate-float"
        >
          <Layers className="w-8 h-8 text-purple-400" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`text-5xl md:text-8xl font-bold tracking-tighter mb-8 ${isLightMode ? 'text-black' : 'bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent'}`}
        >
          Our <span className="serif-italic font-normal italic text-purple-400">Solutions.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className={`text-lg md:text-2xl leading-relaxed font-light max-w-2xl mb-12 ${isLightMode ? 'text-zinc-800' : 'text-zinc-400'}`}
        >
          Precision engineered for the future. We craft the <span className={isLightMode ? 'text-black font-semibold' : 'text-white font-medium'}>digital architecture</span> and <span className={isLightMode ? 'text-black font-semibold' : 'text-white font-medium'}>autonomous logic</span> that empowers modern enterprise.
        </motion.p>

        {/* Service Cards */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-12"
        >
          {/* Web Design & Hosting Card */}
          <div 
            onClick={() => navigate('/solutions/web-design')}
            className={`p-8 md:p-14 rounded-[32px] md:rounded-[48px] border text-left group cursor-pointer transition-all duration-700 relative overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-xl hover:bg-zinc-50' : 'glass border-white/5 hover:bg-white/[0.04]'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -z-10 group-hover:bg-purple-500/10 transition-all duration-700" />
            <div className="flex justify-between items-start mb-10">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                <Globe className="w-6 h-6 text-purple-400" />
              </div>
              <ArrowRight className={`w-6 h-6 transition-all duration-500 group-hover:text-purple-400 group-hover:translate-x-2 ${isLightMode ? 'text-zinc-300' : 'text-zinc-600'}`} />
            </div>
            
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-4 block">Deployment 01</span>
            <h3 className={`text-2xl md:text-3xl font-bold mb-6 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Web Design & <br />Cloud Hosting</h3>
            <p className={`font-light leading-relaxed text-base md:text-lg ${isLightMode ? 'text-zinc-900' : 'text-zinc-500'}`}>
              Artistic excellence meets high-performance infrastructure. We build immersive, lightning-fast digital experiences paired with enterprise-grade cloud hosting for ultimate reliability and speed.
            </p>
          </div>

          {/* AI Automation Card */}
          <div 
            onClick={() => navigate('/solutions/ai-automation')}
            className={`p-8 md:p-14 rounded-[32px] md:rounded-[48px] border text-left group cursor-pointer transition-all duration-700 relative overflow-hidden ${isLightMode ? 'bg-white border-zinc-200 shadow-xl hover:bg-zinc-50' : 'glass border-white/5 hover:bg-white/[0.04]'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -z-10 group-hover:bg-purple-500/10 transition-all duration-700" />
            <div className="flex justify-between items-start mb-10">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <ArrowRight className={`w-6 h-6 transition-all duration-500 group-hover:text-purple-400 group-hover:translate-x-2 ${isLightMode ? 'text-zinc-300' : 'text-zinc-600'}`} />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-4 block">Deployment 02</span>
            <h3 className={`text-2xl md:text-3xl font-bold mb-6 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>AI Automation <br />& Neural Agents</h3>
            <p className={`font-light leading-relaxed text-base md:text-lg ${isLightMode ? 'text-zinc-900' : 'text-zinc-500'}`}>
              Custom AI workflows and autonomous agents designed to govern your enterprise. We solve unique operational friction points through intelligent logic, letting you focus on scaling your vision.
            </p>
          </div>
        </motion.div>

        {/* Bottom Detail */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-24 flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-3 text-zinc-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Expanding the Universe</span>
          </div>
          <p className={`text-xs font-light max-w-sm italic ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
            Luno Studios continuously monitors emerging neural architectures to ensure our solutions remain at the absolute frontier of technology.
          </p>
        </motion.div>
      </div>

      </div>
    </div>
  );
};
