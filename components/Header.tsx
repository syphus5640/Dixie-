import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Settings, BarChart3, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoonLogo } from './MoonLogo';
import { UserProfile } from '../src/App';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  isLightMode: boolean;
  session: any;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, isLightMode, session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Reviews', path: '/reviews' },
    { name: 'Solutions', path: '/solutions' },
  ];

  return (
    <>
      <header className="absolute md:fixed top-0 left-0 right-0 z-[100] h-20 md:h-24 flex items-center px-6 md:px-12 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setIsOpen(false)}>
            <MoonLogo size={32} isLightMode={isLightMode} className="group-hover:rotate-12 transition-transform duration-500" />
            <span className="font-bold tracking-tighter text-lg uppercase hidden xs:inline-block">LUNO STUDIOS</span>
          </Link>
          
          <button 
            onClick={toggleMenu}
            className={`p-2.5 rounded-full transition-all active:scale-90 z-[110] flex items-center justify-center ${isLightMode ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'bg-white/5 text-white border border-white/10'}`}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="flex-grow" />

        {!isOpen && (
          <div className="flex items-center gap-4 pointer-events-auto">
            {session ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className={`hidden md:flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all ${isLightMode ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'bg-white/5 text-white hover:bg-white/10'}`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
            ) : (
              <button 
                onClick={() => navigate('/signin')}
                className={`hidden md:block text-sm font-medium px-4 py-2 rounded-full transition-all ${isLightMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
              >
                Sign In
              </button>
            )}
            
            {!session ? (
              <button 
                onClick={() => navigate('/signup')}
                className="theme-button-primary text-xs md:text-sm font-bold px-5 py-2.5 rounded-full shadow-lg active:scale-95"
              >
                Access
              </button>
            ) : (
              <button 
                onClick={() => navigate('/settings')}
                className={`p-2.5 rounded-full transition-all ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/5 text-white border border-white/10'}`}
              >
                <User size={18} />
              </button>
            )}
          </div>
        )}
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[90] flex flex-col pt-32 pb-12 px-8 md:px-24 overflow-y-auto ${isLightMode ? 'bg-white' : 'bg-[#030304]'}`}
          >
            <div className="max-w-4xl w-full mx-auto flex flex-col h-full">
              <nav className="flex flex-col gap-6 md:gap-10">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => handleNavigate(item.path)}
                    className={`text-5xl md:text-7xl font-bold tracking-tighter text-left hover:text-purple-500 transition-colors ${isLightMode ? 'text-zinc-900' : 'text-white'}`}
                  >
                    {item.name}
                  </motion.button>
                ))}
              </nav>
              
              <div className={`h-[1px] w-full my-10 md:my-16 ${isLightMode ? 'bg-zinc-100' : 'bg-white/10'}`} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12">
                {session ? (
                  <>
                    <div className="flex flex-col gap-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Management</p>
                      <button
                        onClick={() => handleNavigate('/dashboard')}
                        className="flex items-center gap-4 text-2xl font-medium text-zinc-500 hover:text-purple-400 transition-colors text-left"
                      >
                        <LayoutDashboard size={24} />
                        Dashboard
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Account</p>
                      <button
                        onClick={() => handleNavigate('/settings')}
                        className="flex items-center gap-4 text-2xl font-medium text-zinc-500 hover:text-purple-400 transition-colors text-left"
                      >
                        <Settings size={24} />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setIsOpen(false);
                          document.body.style.overflow = 'unset';
                        }}
                        className="flex items-center gap-4 text-2xl font-medium text-red-500/70 hover:text-red-400 transition-colors text-left"
                      >
                        <LogOut size={24} />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Get Started</p>
                    <button
                      onClick={() => handleNavigate('/signin')}
                      className={`text-3xl font-bold text-left ${isLightMode ? 'text-zinc-900' : 'text-white'}`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => handleNavigate('/signup')}
                      className="theme-button-primary px-8 py-4 rounded-2xl text-xl font-bold text-center w-full md:w-auto"
                    >
                      Create Account
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-8 border-t border-white/5 flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
                <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-white">TikTok</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
