
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Palette, 
  Code2, 
  Smartphone, 
  Zap, 
  Layout, 
  Box, 
  Rocket, 
  ArrowRight, 
  Globe, 
  Cpu, 
  Search,
  CheckCircle2
} from 'lucide-react';

interface WebDesignPageProps {
  onBookOpen?: () => void;
}

export const WebDesignPage: React.FC<WebDesignPageProps> = ({ onBookOpen }) => {
  // Add explicit Variants type to satisfy framer-motion props
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

  // Add explicit Variants type and cast ease array to [number, number, number, number]
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  const processSteps = [
    {
      title: "Concept & Strategy",
      desc: "We dive deep into your brand's DNA to map out user journeys that don't just work—they enchant.",
      icon: Search,
      color: "text-purple-400"
    },
    {
      title: "Artistic Design",
      desc: "Creating high-fidelity prototypes that utilize light, depth, and the physical beauty of motion.",
      icon: Palette,
      color: "text-purple-500"
    },
    {
      title: "Engineering",
      desc: "Writing clean, performant React code that breathes life into static designs with cinematic transitions.",
      icon: Code2,
      color: "text-violet-400"
    },
    {
      title: "Optimization",
      desc: "Rigorous testing for speed, mobile responsiveness, and SEO to ensure your launch is flawless.",
      icon: Rocket,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />

      <div className="max-w-7xl mx-auto pb-32 space-y-32 relative">

      {/* Hero Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-6 z-10 pt-0"
      >
        <motion.div 
          variants={itemVariants}
          className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-10 border border-purple-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
        >
          <Palette className="w-10 h-10 text-purple-400" />
        </motion.div>
        
        <motion.h1 
          variants={itemVariants}
          className="text-4xl md:text-8xl font-bold tracking-tighter mb-6 md:mb-8 leading-[1.1] theme-gradient-text"
        >
          Artistic <br />
          <span className="serif-italic font-normal italic text-purple-400">Digital Interfaces.</span>
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-zinc-400 leading-relaxed font-light max-w-2xl"
        >
          Luno Studios curates digital galleries that transcend traditional web design. We focus on the intersection of light, motion, and interaction to build websites that aren't just visited, but experienced.
        </motion.p>
      </motion.div>

      {/* Process Section */}
      <section className="px-6 space-y-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[10px] font-bold tracking-[0.4em] text-purple-400 uppercase mb-4 block">Our Methodology</span>
          <h2 className="text-4xl font-bold tracking-tight mb-6">How We Create.</h2>
          <p className="text-zinc-500 leading-relaxed font-light italic serif-italic text-lg">
            "We believe the web should be as beautiful as it is functional."
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {processSteps.map((step, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-white/5 relative group transition-all duration-700 h-full"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-5 md:mb-6 group-hover:scale-110 transition-transform ${step.color}`}>
                <step.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3 tracking-tight">{step.title}</h4>
              <p className="text-zinc-500 text-xs md:text-sm leading-relaxed font-light">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Performance & Optimization Section */}
      <section className="px-6 relative overflow-hidden py-10">
        <div className="absolute inset-0 bg-purple-500/5 blur-[120px] rounded-full -z-10" />
        <div className="glass rounded-[40px] md:rounded-[64px] border border-white/5 p-8 md:p-20 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="space-y-6 md:space-y-8">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-purple-400">Core Performance</span>
            <h2 className="text-3xl md:text-6xl font-bold tracking-tighter leading-[1.1] theme-gradient-text">
              Velocity <span className="serif-italic italic text-purple-400">by Design.</span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg font-light leading-relaxed">
              Every millisecond counts. Our websites are engineered for sub-second load times, achieving near-perfect Lighthouse scores across the board.
            </p>
            
            <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
              {[
                { label: "Mobile-First Fluidity", icon: Smartphone },
                { label: "Edge-Network Caching", icon: Globe },
                { label: "Asset Compression Logic", icon: Cpu }
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 md:gap-4 text-zinc-300">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                    <feat.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
                  </div>
                  <span className="text-xs md:text-sm font-medium">{feat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-3 md:space-y-4">
              <div className="glass p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/5 text-center">
                <h3 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1">99+</h3>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Speed Score</p>
              </div>
              <div className="glass p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/5 text-center mt-3 md:mt-4">
                <h3 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1">&lt;1s</h3>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">First Paint</p>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="glass p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-purple-500/30 text-center bg-purple-500/5">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-purple-400 mx-auto mb-3 md:mb-4 animate-pulse" />
                <p className="text-[10px] md:text-xs text-zinc-300 leading-relaxed font-light">
                  Optimized for immediate engagement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Launch Section */}
      <section className="px-6 pb-24 relative z-10">
        <div className="glass p-10 md:p-24 rounded-[40px] md:rounded-[64px] border border-white/5 relative overflow-hidden text-center flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/10 opacity-50" />
          
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 md:mb-10 shadow-inner relative z-10">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
          </div>

          <h2 className="text-3xl md:text-7xl font-bold tracking-tighter mb-6 md:mb-8 relative z-10 theme-gradient-text">
            Ready to <span className="serif-italic italic text-purple-400">Launch?</span>
          </h2>
          
          <p className="text-zinc-400 text-base md:text-xl max-w-2xl mb-10 md:mb-12 relative z-10 leading-relaxed font-light px-4">
            Your brand deserves a digital space that reflects its excellence. Let's engineer your evolution together.
          </p>

          <button 
            onClick={onBookOpen}
            className="px-8 md:px-12 py-4 md:py-6 theme-button-primary rounded-full font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center gap-3 group shadow-2xl relative z-10 active:scale-95 text-sm md:text-base"
          >
            Book Consultation
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
      </div>
    </div>
  );
};
