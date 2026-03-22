
import React from 'react';
import { motion } from 'framer-motion';

interface MoonLogoProps {
  className?: string;
  size?: number;
  isLightMode?: boolean;
}

/**
 * MoonLogo Component
 * Now uses a PNG source while retaining high-end atmospheric effects.
 * Includes hover zoom (scale) and tilt (rotate).
 */
export const MoonLogo: React.FC<MoonLogoProps> = ({ className = "", size = 24, isLightMode = false }) => {
  // Use a local path for the logo. You can replace this string with a remote URL if needed.
  const logoSrc = "/logo.png"; 

  return (
    <div 
      className={`relative flex items-center justify-center group ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* Dynamic Atmospheric Glow - Stays behind the PNG */}
      <div 
        className={`absolute inset-0 rounded-full blur-2xl scale-[1.6] transition-colors duration-700 pointer-events-none ${
          isLightMode ? 'bg-black/5 group-hover:bg-black/10' : 'bg-purple-500/10 group-hover:bg-purple-500/40'
        }`} 
        style={{ animation: 'aura-pulse 10s ease-in-out infinite' }}
      />
      
      {/* The PNG Logo Image */}
      <motion.img
        src={logoSrc}
        alt="Luno Logo"
        className={`relative z-10 w-full h-full object-contain transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isLightMode 
            ? 'drop-shadow-[0_0_8px_rgba(0,0,0,0.05)]' 
            : 'drop-shadow-[0_0_15px_rgba(139,92,246,0.2)]'
        }`}
        style={{ width: size, height: size }}
        whileHover={{ 
          scale: 1.1,      // The "Zoom"
          rotate: 6,       // The "Tilt"
          filter: isLightMode 
            ? 'drop-shadow(0 0 12px rgba(0,0,0,0.1))' 
            : 'drop-shadow(0 0 20px rgba(168,85,247,0.5))'
        }}
        // Fallback if image fails to load
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      
      <style>{`
        @keyframes aura-pulse {
          0%, 100% { opacity: 0.1; transform: scale(1.4) rotate(0deg); }
          50% { opacity: 0.25; transform: scale(1.8) rotate(15deg); }
        }
      `}</style>
    </div>
  );
};
