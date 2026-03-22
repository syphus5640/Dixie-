
import React from 'react';
import { Users, Target, Eye, Rocket } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface AboutUsProps {
  isLightMode?: boolean;
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

export const AboutUs: React.FC<AboutUsProps> = ({ isLightMode = false }) => {
  return (
    <div className="relative w-full">
      {/* 1. Global Subtle Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />

      <div className="w-full max-w-7xl mx-auto pb-32 relative">
        {/* Narrative Section */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-6 z-10 pt-20 mb-32"
      >
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-14 border border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] animate-float">
          <Rocket className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className={`text-4xl md:text-7xl font-bold tracking-tighter mb-8 ${isLightMode ? 'text-black' : 'bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent'}`}>
          The Heart of Luno
        </h2>
        <p className={`text-lg md:text-3xl leading-relaxed font-light italic serif-italic ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
          "Luno Studios is a collective of dreamers, designers, and engineers obsessed with the intersection of art and artificial intelligence."
        </p>
      </motion.div>

      {/* Mission & Vision Section */}
      <div className="relative px-6 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
          {/* Mission Card */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative group h-full"
          >
            <div className={`p-8 md:p-12 rounded-[32px] md:rounded-[48px] border transition-all duration-1000 shadow-2xl overflow-hidden h-full backdrop-blur-2xl ${
              isLightMode 
                ? 'bg-white/40 border-white/20 shadow-zinc-200/20 hover:bg-white/60' 
                : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
            }`}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8 border border-purple-500/20 group-hover:scale-110 transition-transform duration-700">
                <Target className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
              </div>
              <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Our Mission</h3>
              <p className={`text-base md:text-lg leading-relaxed font-light ${isLightMode ? 'text-zinc-700' : 'text-zinc-400'}`}>
                To democratize access to high-end digital tools. We believe every business, regardless of size, deserves a website that stuns and an AI system that scales.
              </p>
            </div>
          </motion.div>

          {/* Vision Card */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative group h-full"
          >
            <div className={`p-8 md:p-12 rounded-[32px] md:rounded-[48px] border transition-all duration-1000 shadow-2xl overflow-hidden h-full backdrop-blur-2xl ${
              isLightMode 
                ? 'bg-white/40 border-white/20 shadow-zinc-200/20 hover:bg-white/60' 
                : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
            }`}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8 border border-purple-500/20 group-hover:scale-110 transition-transform duration-700">
                <Eye className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
              </div>
              <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Our Vision</h3>
              <p className={`text-base md:text-lg leading-relaxed font-light ${isLightMode ? 'text-zinc-700' : 'text-zinc-400'}`}>
                A future where technology feels human. We strive to create digital experiences that are not just functional, but emotional, intuitive, and genuinely helpful.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Founders Section */}
      <div className="px-6 pb-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center text-center mb-20"
        >
          <span className="text-[10px] font-bold tracking-[0.4em] text-purple-400 uppercase mb-4 opacity-80">The Collective</span>
          <h2 className={`text-4xl md:text-6xl font-bold tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>Our Founders</h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-12">
          {[
            { 
              name: "Kevin Stanchev", 
              role: "Co-Founder", 
              bio: "Growth starts where comfort ends",
              image: "kevin.png"
            },
            { 
              name: "Kian Murphy", 
              role: "Co-Founder", 
              bio: "Focus on action, belief, and perseverance",
              image: "kian.png"
            }
          ].map((founder, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`p-12 rounded-[40px] border w-full max-w-sm text-center group hover:border-purple-400 transition-all duration-700 backdrop-blur-2xl ${
                isLightMode 
                  ? 'bg-white/40 border-white/20 shadow-xl' 
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-[#0a0a0c] mx-auto mb-8 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden relative">
                {founder.image ? (
                  <img 
                    src={founder.image} 
                    alt={founder.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    onError={(e) => {
                      // Fallback to Icon if image fails
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent && !parent.querySelector('.placeholder-icon')) {
                        const icon = document.createElement('div');
                        icon.className = 'placeholder-icon text-zinc-500';
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                ) : (
                  <Users className={`w-14 h-14 text-zinc-500 group-hover:text-purple-400 transition-colors duration-700 relative z-0`} />
                )}
              </div>
              <h4 className={`text-2xl font-bold mb-2 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{founder.name}</h4>
              <p className="text-purple-400 text-xs font-bold mb-6 uppercase tracking-[0.2em]">{founder.role}</p>
              <div className="space-y-4">
                <p className={`text-sm leading-relaxed font-light italic opacity-80 group-hover:opacity-100 transition-opacity duration-700 px-4 ${isLightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  "{founder.bio}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
