
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { BackgroundAtmosphere } from '../components/BackgroundAtmosphere';
import { Navbar } from '../components/Navbar';
import { MobileNavbar } from '../components/MobileNavbar';
import { Hero } from '../components/Hero';
import { BookingModal } from '../components/BookingModal';
import { Dashboard } from '../components/Dashboard';
import { Reviews } from '../components/Reviews';
import { ReviewsPage } from '../components/ReviewsPage';
import { AboutUs } from '../components/AboutUs';
import { SolutionsPage } from '../components/SolutionsPage';
import { SignInPage } from '../components/SignInPage';
import { SignUpPage } from '../components/SignUpPage';
import { SettingsPage } from '../components/SettingsPage';
import { ResetPasswordPage } from '../components/ResetPasswordPage';
import { AnalyticsPage } from '../components/AnalyticsPage';
import { WebDesignPage } from '../components/WebDesignPage';
import { AIAutomationPage } from '../components/AIAutomationPage';
import { EmailConfirmationPage } from '../components/EmailConfirmationPage';
import { BookingCanceledPage } from '../components/BookingCanceledPage';
import { HomepageFeatures } from '../components/HomepageFeatures';
import { HomepageProcess } from '../components/HomepageProcess';
import { StarField } from '../components/StarField';
import { CustomCursor } from '../components/CustomCursor';
import { MoonLogo } from '../components/MoonLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LegalPage } from '../components/LegalPage';
import CallingDashboard from '../components/CallingDashboard';
import { RealTimeCallMonitor } from '../components/RealTimeCallMonitor';
import { Toaster } from 'sonner';
import { supabase, initializeSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  business_address?: string;
  phone?: string;
  is_admin?: boolean | string;
  is_employee?: boolean | string;
  employee_id?: string;
}

export interface Review {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  created_at: string;
  updated_at?: string;
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.4, ease: "easeIn" } }
};

const App: React.FC = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('luno-theme') === 'light';
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we land on home with a supabase hash, redirect to appropriate page
    if (location.pathname === '/') {
      if (location.hash.includes('type=recovery')) {
        navigate('/reset-password' + location.hash, { replace: true });
      } else if (location.hash.includes('access_token=') || location.hash.includes('type=signup')) {
        navigate('/confirm' + location.hash, { replace: true });
      }
    }
  }, [location, navigate]);

  const isDimmedPage = location.pathname !== '/';

  const isAdmin = currentUser?.is_admin === true || currentUser?.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
  const isEmployee = currentUser?.is_employee === true || currentUser?.is_employee === 'true';
  const isEmployeeOnly = isEmployee && !isAdmin;

  useEffect(() => {
    if (isEmployeeOnly && location.pathname === '/dashboard') {
      navigate('/calling', { replace: true });
    }
  }, [isEmployeeOnly, location.pathname, navigate]);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('luno-theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('luno-theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    const bootstrap = async (retries = 3) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const config = await res.json();
          const key = config.supabaseAnonKey || config.supabaseServiceKey;
          if (config.supabaseUrl && key) {
            initializeSupabase(config.supabaseUrl, key);
            setIsConfigured(true);
          } else {
            throw new Error("Invalid config");
          }
        } else {
          throw new Error(`Status ${res.status}`);
        }
      } catch (e: any) {
        if (retries > 0) {
          setTimeout(() => bootstrap(retries - 1), 2000);
        } else {
          setConfigError("Connection to security infrastructure failed.");
          setIsConfigured(true);
        }
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user) fetchProfile(currentSession.user.id);
      } catch (e) {}
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchProfile = async (userId: string) => {
    let currentToken = session?.access_token;
    if (!currentToken) {
      const { data } = await supabase.auth.getSession();
      currentToken = data.session?.access_token;
      if (!currentToken) return;
    }
    
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {}
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    localStorage.removeItem('luno_session');
    localStorage.removeItem('luno_admin_mode');
    sessionStorage.removeItem('luno_active_agent_id');
    sessionStorage.removeItem('luno_active_nickname');
    navigate('/');
  };

  const handleManageClick = () => {
    if (session) {
      const isAdmin = currentUser?.is_admin === true || currentUser?.is_admin === 'true' || session?.user?.email?.toLowerCase() === 'kev.stanchev@gmail.com';
      const isEmployee = currentUser?.is_employee === true || currentUser?.is_employee === 'true';
      
      if (isEmployee && !isAdmin) {
        navigate('/calling');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/signin');
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-t-2 border-purple-500 rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Infrastructure...</p>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center p-6">
        <div className="max-w-md w-full glass p-8 rounded-3xl border-red-500/20 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4 tracking-tight">System Error</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{configError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="theme-button-primary px-8 py-3 rounded-full text-sm font-bold w-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative w-full overflow-x-hidden bg-[var(--bg-color)] text-[var(--text-primary)] selection:bg-purple-500/30 transition-colors duration-700">
      <Toaster richColors position="bottom-right" theme={isLightMode ? 'light' : 'dark'} />
      <RealTimeCallMonitor isAdmin={isAdmin} />
      <CustomCursor isLightMode={isLightMode} />
      <StarField isDimmed={isDimmedPage} isLightMode={isLightMode} isHomePage={location.pathname === '/'} />
      <BackgroundAtmosphere 
        active={location.pathname === '/' || location.pathname === '/calling'} 
        isLightMode={isLightMode} 
        isDimmed={isDimmedPage}
      />
      
      {/* Desktop Header */}
      <header className="fixed top-4 md:top-8 left-0 right-0 z-[60] hidden md:flex justify-center items-center px-4 pointer-events-none">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="flex items-center gap-3 md:gap-6 pointer-events-auto"
        >
          <Navbar currentUser={currentUser} onLogout={handleLogout} isLightMode={isLightMode} />

          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={handleManageClick}
              className={`text-xs md:text-sm font-medium transition-all cursor-pointer hidden sm:block hover:scale-105 ${isLightMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-500 hover:text-white'}`}
            >
              {session ? (isEmployeeOnly ? 'Calling Console' : 'Dashboard') : 'Manage'}
            </button>
            {!session ? (
              <button 
                onClick={() => navigate('/signup')}
                className="theme-button-primary text-[10px] md:text-sm font-bold px-4 py-2 md:px-7 md:py-2.5 rounded-full hover:bg-purple-500 hover:text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all shadow-xl active:scale-95"
              >
                Access
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="glass text-[var(--text-primary)]/70 text-[10px] md:text-sm font-medium px-4 py-2 md:px-5 md:py-2.5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
              >
                Sign Out
              </button>
            )}
          </div>
        </motion.div>
      </header>

      {/* Mobile Header */}
      <MobileNavbar 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        isLightMode={isLightMode}
        onManageClick={handleManageClick}
      />

      <main className="flex-grow relative z-10 w-full pt-20 md:pt-40 pb-16 px-4 md:px-6">
        <AnimatePresence 
          mode="wait" 
          onExitComplete={() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        >
          <Routes location={location} key={location.key}>
            <Route path="/" element={
              <div className="relative w-full overflow-x-clip">
                <motion.div 
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="max-w-7xl mx-auto space-y-16 md:space-y-32"
                >
                  <Hero onBookOpen={() => setIsBookingOpen(true)} onSignUp={() => navigate('/signup')} isLightMode={isLightMode} />
                  <HomepageFeatures onBookOpen={() => setIsBookingOpen(true)} isLightMode={isLightMode} />
                  <HomepageProcess />
                  <Reviews isLightMode={isLightMode} />
                </motion.div>
              </div>
            } />
            <Route path="/about" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
                <AboutUs isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/solutions" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SolutionsPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/reviews" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <ReviewsPage 
                  onBookOpen={() => setIsBookingOpen(true)} 
                  currentUser={currentUser}
                  onLoginRequest={() => navigate('/signin')}
                  isLightMode={isLightMode}
                />
              </motion.div>
            } />
            <Route path="/legal/:policyId" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/privacy" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/terms" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/refund" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/service-agreement" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/disclaimer" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <LegalPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/solutions/web-design" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <WebDesignPage onBookOpen={() => setIsBookingOpen(true)} />
              </motion.div>
            } />
            <Route path="/solutions/ai-automation" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <AIAutomationPage onBookOpen={() => setIsBookingOpen(true)} />
              </motion.div>
            } />
            <Route path="/dashboard" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <Dashboard session={session} isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/settings" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SettingsPage session={session} isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/analytics" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <AnalyticsPage isLightMode={isLightMode} session={session} />
              </motion.div>
            } />
            <Route path="/calling" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <CallingDashboard />
              </motion.div>
            } />
            <Route path="/signin" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SignInPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/signup" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SignUpPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/reset-password" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <ResetPasswordPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/confirm" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <EmailConfirmationPage isLightMode={isLightMode} />
              </motion.div>
            } />
            <Route path="/booking-canceled" element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <BookingCanceledPage isLightMode={isLightMode} />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      <ThemeToggle isLightMode={isLightMode} onToggle={() => setIsLightMode(!isLightMode)} />

      <AnimatePresence>
        {isBookingOpen && <BookingModal onClose={() => setIsBookingOpen(false)} isLightMode={isLightMode} />}
      </AnimatePresence>

      <div className="relative z-10 w-full pt-20 pb-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          <Link to="/legal/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link>
          <Link to="/legal/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link>
          <Link to="/legal/refund" className="hover:text-purple-400 transition-colors">Refund & Cancellation</Link>
          <Link to="/legal/service" className="hover:text-purple-400 transition-colors">Service Agreement</Link>
          <Link to="/legal/disclaimer" className="hover:text-purple-400 transition-colors">Disclaimer</Link>
        </div>
      </div>

      <footer className="relative z-10 w-full py-8 px-6 border-t border-white/5 bg-[var(--bg-color)]/80 backdrop-blur-xl transition-colors duration-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
            <MoonLogo size={36} isLightMode={isLightMode} className="group-hover:rotate-12 transition-transform duration-700" />
            <span className="font-bold tracking-tighter text-xl uppercase">LUNO STUDIOS</span>
          </div>
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest text-center">© 2025 Luno Studios Collective.</p>
          <div className="flex gap-8 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            <a href="https://www.instagram.com/lunostudiosca/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">Instagram</a>
            <a href="https://www.tiktok.com/@lunostudiosca" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">TikTok</a>
            <a href="https://www.linkedin.com/company/luno-studios-ca" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
