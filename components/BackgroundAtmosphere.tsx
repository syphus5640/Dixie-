
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const BackgroundAtmosphere: React.FC<{ active?: boolean; isLightMode?: boolean; isDimmed?: boolean }> = ({ active = true, isLightMode = false, isDimmed = false }) => {
  const { scrollY } = useScroll();
  
  // Parallax transforms that run on the compositor thread
  const mainWashY = useTransform(scrollY, [0, 1000], [0, 50]);
  const lunarBloomY = useTransform(scrollY, [0, 1000], [0, 30]);
  const moonHorizonY = useTransform(scrollY, [0, 1000], [0, -40]);

  const mainWashBg = React.useMemo(() => isLightMode 
    ? 'radial-gradient(ellipse at center, rgba(40, 80, 220, 0.12) 0%, rgba(252, 252, 253, 0) 50%)' 
    : 'radial-gradient(ellipse at center, rgba(10, 20, 80, 0.7) 0%, rgba(3, 3, 4, 0) 50%)', [isLightMode]);

  const lunarBloomBg = React.useMemo(() => isLightMode
    ? 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 50%)' 
    : 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.2) 0%, transparent 50%)', [isLightMode]);

  if (!active && !isDimmed) return null;

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none select-none overflow-hidden transition-opacity duration-1000 z-[1]">
      
      {/* 0. The Top Atmospheric Fade (Moved from Hero for consistency) */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-[1000px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] z-[1] pointer-events-none transition-opacity duration-1000 ${isDimmed ? 'opacity-30' : 'opacity-50'}`} 
      />

      {/* 1. The Main Atmospheric Wash */}
      <motion.div 
        className="absolute top-1/2 left-1/2 w-[200vw] h-[200vh] z-[1] transition-colors duration-1000 will-change-transform"
        style={{
          background: mainWashBg,
          x: '-50%',
          y: useTransform(scrollY, (val) => `calc(-50% + ${val * 0.05}px)`),
        }}
      />

      {/* 2. Secondary scatter wash - The "Lunar Bloom" */}
      <motion.div 
        className="absolute top-1/2 left-1/2 w-[200vw] h-[200vh] z-[1] opacity-40 transition-colors duration-1000 will-change-transform"
        style={{
          background: lunarBloomBg,
          filter: 'blur(160px)', 
          x: '-50%',
          y: useTransform(scrollY, (val) => `calc(-50% + ${val * 0.03}px)`),
        }}
      />

      {/* 3. The Moon Horizon */}
      <motion.div 
        className={`absolute top-[45%] md:top-1/2 left-1/2 w-[230vw] sm:w-[180vw] md:w-[120vw] aspect-square z-[3] transition-all duration-1000 will-change-transform ${isDimmed ? 'opacity-40 scale-95' : 'opacity-100'}`}
        style={{ 
          x: '-50%',
          y: useTransform(scrollY, (val) => `${val * -0.04}px`)
        }}
      >
        
        {/* Dark solid body of the Moon */}
        <div 
          className="absolute inset-0 rounded-full bg-[var(--bg-color)] transition-colors duration-1000"
          style={{
            boxShadow: isLightMode && !isDimmed
              ? '0 -25px 120px 5px rgba(40, 80, 220, 0.15)'
              : '0 -30px 180px 10px rgba(10, 20, 100, 0.35)',
          }}
        />

        {/* The sharp brilliant glowing rim edge */}
        <div 
          className="absolute top-0 left-0 right-0 h-full rounded-full z-[4] transition-all duration-1000"
          style={{
            borderTop: isLightMode && !isDimmed ? '1.5px solid #000' : '2.5px solid rgba(255, 255, 255, 1)',
            boxShadow: isLightMode && !isDimmed
              ? `
                0 -2px 12px 0.5px rgba(255, 255, 255, 1), 
                0 -10px 60px 2px rgba(40, 80, 220, 0.3),
                inset 0 15px 40px rgba(40, 80, 220, 0.1)
              `
              : `
                0 -2px 14px 1px rgba(255, 255, 255, 1), 
                0 -20px 100px 5px rgba(139, 92, 246, 0.5),
                inset 0 25px 80px rgba(139, 92, 246, 0.2)
              `,
            filter: 'blur(0.3px)',
          }}
        />

        {/* Secondary Inner Glow for Depth */}
        <div 
          className="absolute top-[4px] left-[2%] right-[2%] h-full rounded-full z-[3] opacity-50 transition-all duration-1000"
          style={{
            borderTop: isLightMode && !isDimmed
              ? '15px solid rgba(40, 80, 220, 0.15)'
              : '20px solid rgba(139, 92, 246, 0.25)',
            filter: 'blur(35px)',
          }}
        />
      </motion.div>

      {/* 4. Radial Vignette */}
      {!isLightMode && (
        <div 
          className={`absolute inset-0 z-[2] transition-opacity duration-1000 ${isDimmed ? 'opacity-90' : 'opacity-70'}`}
          style={{
            background: 'radial-gradient(circle at center, transparent 30%, black 100%)',
          }}
        />
      )}
      
      {/* 5. Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-[5] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};
