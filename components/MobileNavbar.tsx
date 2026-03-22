import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, LogOut, LayoutDashboard, User } from 'lucide-react';
import { MoonLogo } from './MoonLogo';
import { UserProfile } from '../src/App';

interface MobileNavbarProps {
  currentUser?: UserProfile | null;
  onLogout: () => void;
  isLightMode: boolean;
  onManageClick: () => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ 
  currentUser, 
  onLogout, 
  isLightMode,
  onManageClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Solutions', path: '/solutions' },
    { name: 'Reviews', path: '/reviews' },
  ];

  const containerVariants = {
    closed: {
      opacity: 0,
      y: "-100%",
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        when: "afterChildren",
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={`absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 md:hidden transition-colors duration-300 ${isOpen ? 'bg-transparent' : 'bg-[var(--bg-color)]/80 backdrop-blur-xl border-b border-white/5'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMenu}
            className={`p-2 rounded-full transition-all active:scale-90 ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/5 text-white'}`}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <MoonLogo size={28} isLightMode={isLightMode} />
            <span className="font-bold tracking-tighter text-lg uppercase">LUNO STUDIOS</span>
          </Link>
        </div>

        {!isOpen && (
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button 
                onClick={onManageClick}
                className={`p-2 rounded-full ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/5 text-white'}`}
              >
                <LayoutDashboard size={20} />
              </button>
            ) : (
              <button 
                onClick={() => navigate('/signup')}
                className="theme-button-primary text-[10px] font-bold px-4 py-2 rounded-full shadow-lg"
              >
                Access
              </button>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={containerVariants}
            className={`fixed inset-0 z-[90] flex flex-col pt-24 px-8 pb-12 overflow-y-auto ${isLightMode ? 'bg-white' : 'bg-black'}`}
          >
            <div className="flex flex-col gap-8 mt-8">
              {menuItems.map((item) => (
                <motion.div key={item.path} variants={itemVariants}>
                  <Link
                    to={item.path}
                    className={`text-4xl font-bold tracking-tighter flex items-center justify-between group ${
                      location.pathname === item.path 
                        ? 'text-purple-500' 
                        : (isLightMode ? 'text-zinc-900' : 'text-white')
                    }`}
                  >
                    {item.name}
                    <ChevronRight className={`opacity-0 group-hover:opacity-100 transition-opacity ${isLightMode ? 'text-zinc-300' : 'text-zinc-700'}`} size={32} />
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-12 border-t border-white/10 flex flex-col gap-6">
              {currentUser ? (
                <>
                  <motion.div variants={itemVariants} className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/10 text-white'}`}>
                      {currentUser.first_name[0]}
                    </div>
                    <div>
                      <p className={`font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{currentUser.first_name} {currentUser.last_name}</p>
                      <p className="text-sm text-zinc-500">{currentUser.business_name}</p>
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={onManageClick}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/5 text-white'}`}
                    >
                      <LayoutDashboard size={20} />
                      {(() => {
                        const isAdmin = currentUser?.is_admin === true || currentUser?.is_admin === 'true';
                        const isEmployee = currentUser?.is_employee === true || currentUser?.is_employee === 'true';
                        return (isEmployee && !isAdmin) ? 'Calling Console' : 'Dashboard';
                      })()}
                    </button>
                    <button 
                      onClick={onLogout}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-95 ${isLightMode ? 'bg-red-500/10 text-red-500' : 'bg-red-500/20 text-red-400'}`}
                    >
                      <LogOut size={20} />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              ) : (
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigate('/signin')}
                    className={`py-4 rounded-2xl font-bold transition-all active:scale-95 ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-white/5 text-white'}`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate('/signup')}
                    className="theme-button-primary py-4 rounded-2xl font-bold shadow-xl active:scale-95"
                  >
                    Get Started
                  </button>
                </motion.div>
              )}
              
              <motion.div variants={itemVariants} className="flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-500 mt-4">
                <a href="https://instagram.com" target="_blank" rel="noreferrer">IG</a>
                <a href="https://tiktok.com" target="_blank" rel="noreferrer">TK</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">LI</a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
