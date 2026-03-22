
import React from 'react';
import { ArrowRight, Sparkles, Shield, Cpu, Zap } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface HeroProps {
  onBookOpen: () => void;
  onSignUp: () => void;
  isLightMode?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onBookOpen, onSignUp, isLightMode = false }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 1.2, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number] 
      } 
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center pt-12 md:pt-24 pb-20 relative z-20"
    >
      <motion.h1 
        variants={itemVariants}
        className="text-4xl sm:text-7xl md:text-[11rem] font-bold tracking-tighter leading-[0.9] md:leading-[0.85] mb-6 md:mb-14 max-w-6xl theme-gradient-text px-4"
      >
        Automate your <br className="hidden sm:block" />
        <span className="serif-italic font-normal italic text-purple-400 relative drop-shadow-[0_0_25px_rgba(167,139,250,0.3)]">
          entire enterprise
        </span>
      </motion.h1>

      <motion.p 
        variants={itemVariants}
        className={`text-sm md:text-2xl max-w-2xl mb-10 md:mb-20 leading-relaxed font-light px-6 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}
      >
        Luno Studios crafts <span className="text-[var(--text-primary)] font-semibold">high-fidelity AI receptionists</span> and autonomous agents that govern your operations while you focus on the future.
      </motion.p>

      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row gap-4 md:gap-6 mb-16 md:mb-28 w-full sm:w-auto px-4 sm:px-0"
      >
        <button 
          onClick={onSignUp}
          className="px-8 md:px-14 py-4 md:py-6 theme-button-primary rounded-full font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-3 group shadow-2xl active:scale-95 relative overflow-hidden text-sm md:text-base"
        >
          <span className="relative z-10">Initiate Evolution</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button 
          onClick={onBookOpen}
          className={`px-8 md:px-14 py-4 md:py-6 glass rounded-full font-bold border active:scale-95 transition-all text-sm md:text-base ${
            isLightMode 
              ? 'text-zinc-700 hover:bg-zinc-800 hover:text-white border-zinc-200 shadow-sm' 
              : 'text-zinc-400 hover:bg-white/10 hover:text-white border-white/10'
          }`}
        >
          Book Consultation
        </button>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-14 w-full max-w-5xl px-6"
      >
        {[
          { label: "Neural Speed", icon: Zap, desc: "Sub-second response latency for voice agents." },
          { label: "Enterprise Encryption", icon: Shield, desc: "End-to-end data governance and security." },
          { label: "Agentic Logic", icon: Cpu, desc: "Custom LLMs trained on your unique datasets." }
        ].map((feat, i) => (
          <div key={i} className="flex flex-col items-center text-center group">
            <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-purple-500/50 transition-all duration-500 ${isLightMode ? 'border-zinc-200 bg-zinc-50 shadow-sm' : ''}`}>
              <feat.icon className="w-6 h-6 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h4 className={`text-[11px] md:text-sm font-bold uppercase tracking-[0.3em] mb-3 transition-colors ${
              isLightMode ? 'text-black' : 'text-zinc-300 group-hover:text-white'
            }`}>
              {feat.label}
            </h4>
            <p className="text-[11px] md:text-xs text-zinc-500 leading-relaxed max-w-[210px] font-light opacity-80">{feat.desc}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};
