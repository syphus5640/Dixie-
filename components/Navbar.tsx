import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserProfile } from '../src/App';
import { MoonLogo } from './MoonLogo';

interface NavbarProps {
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  isLightMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, isLightMode = false }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const linkClass = (path: string) => `
    text-[10px] md:text-sm font-medium transition-all duration-300 px-2.5 py-1.5 md:px-4 md:py-2 rounded-full
    ${currentPath === path 
      ? (isLightMode ? 'bg-black text-white' : 'text-white bg-white/10') 
      : (isLightMode 
          ? 'text-zinc-600 hover:bg-black hover:text-white' 
          : 'text-zinc-500 hover:text-white hover:bg-white/5')
    }
  `;

  return (
    <nav className="z-50 flex justify-center">
      <div className="nav-container rounded-full px-3 py-1.5 md:px-6 md:py-2 flex items-center gap-2 md:gap-6 shadow-2xl">
        <Link 
          to="/"
          className="flex items-center gap-2 md:gap-3 cursor-pointer group px-1"
        >
          <MoonLogo size={20} className="md:w-[28px] md:h-[28px] group-hover:scale-110 transition-transform duration-500" isLightMode={isLightMode} />
          <span className="font-bold tracking-tight text-[10px] md:text-sm hidden xs:inline-block text-[var(--nav-text)]">LUNO STUDIOS</span>
        </Link>

        <div className={`h-3 md:h-4 w-[1px] ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />

        <div className="flex items-center gap-1 md:gap-2">
          <Link 
            to="/about"
            className={linkClass('/about')}
          >
            About
          </Link>

          <Link 
            to="/reviews"
            className={linkClass('/reviews')}
          >
            Reviews
          </Link>

          <Link 
            to="/solutions"
            className={linkClass('/solutions')}
          >
            Solutions
          </Link>
        </div>
      </div>
    </nav>
  );
};