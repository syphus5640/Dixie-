
import React, { useState, useMemo } from 'react';
import { X, ChevronRight, CheckCircle2, ChevronDown, Monitor, Cpu, Loader2, Sparkles, Clock, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingModalProps {
  onClose: () => void;
  isLightMode?: boolean;
}

export const BookingModal: React.FC<BookingModalProps> = ({ onClose, isLightMode = false }) => {
  const [step, setStep] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message?: string } | null>(null);
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [formData, setFormData] = useState({
    service: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    otherIndustry: '',
    date: '',
    time: '',
    year: viewDate.getFullYear()
  });

  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);

  const nextStep = () => setStep(step + 1);

  const services = [
    { id: 'Web Design', label: 'Web Design', icon: Monitor },
    { id: 'AI Automation', label: 'AI Automation', icon: Cpu }
  ];

  const timeSlots = [
    '11:15 AM', 
    '03:00 PM', 
    '04:00 PM', 
    '05:00 PM', 
    '06:00 PM', 
    '07:00 PM', 
    '08:00 PM'
  ];

  // Calendar Logic
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();
  
  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    // Adjust to Monday start
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(nextMonth);
  };

  const isDateInPastOrToday = (day: number) => {
    const dateToCheck = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck <= today;
  };

  const handleDateSelect = async (day: number) => {
    const selectedDateStr = `${monthName} ${day}, ${year}`;
    setFormData({ ...formData, date: `${monthName} ${day}` });
    
    setIsFetchingAvailability(true);
    try {
      const dateObj = new Date(selectedDateStr);
      const response = await fetch(`/api/availability?date=${dateObj.toISOString()}`);
      const data = await response.json();
      setBusySlots(data.busy || []);
      nextStep();
    } catch (err) {
      console.error("Failed to fetch availability:", err);
      nextStep(); // Proceed anyway, slots will just be available
    } finally {
      setIsFetchingAvailability(false);
    }
  };

  const isSlotBusy = (timeStr: string) => {
    if (!formData.date) return false;
    
    const [timeOnly, period] = timeStr.split(' ');
    let [hours, minutes] = timeOnly.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const slotStart = new Date(`${formData.date}, ${year}`);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 min duration
    
    return busySlots.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      // Overlap check
      return (slotStart < busyEnd && slotEnd > busyStart);
    });
  };

  const industries = [
    'E-commerce',
    'Real Estate',
    'Healthcare',
    'Finance',
    'Education',
    'Technology',
    'Marketing',
    'Manufacturing',
    'Other'
  ];

  const handleBookingConfirm = async (selectedTime: string) => {
    setIsSyncing(true);
    
    // Create a proper date object on the client to capture user's timezone
    const year = viewDate.getFullYear();
    // formData.date is "Month Day" (e.g., "February 28")
    const dateStr = `${formData.date}, ${year} ${selectedTime}`;
    const localDate = new Date(dateStr);
    
    // Map service to type as per guide
    const type = formData.service === 'Web Design' ? 'website' : 'automation';
    
    const finalData = { 
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      industry: formData.industry,
      otherIndustry: formData.otherIndustry,
      date: localDate.toISOString(), // ISO String as per guide
      time: selectedTime, // Human readable string as per guide
      type: type, // Used to determine which n8n webhook to fire
      businessName: formData.company, // For the backend description
    };
    
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sync Failed');
      
      setSyncStatus({ success: data.calendarSync });
      setFormData({ ...formData, time: selectedTime });
      setStep(4);
    } catch (err: any) {
      console.error('Booking sync failed:', err);
      setSyncStatus({ success: false, message: err.message });
      setFormData({ ...formData, time: selectedTime });
      setStep(4);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-xl overflow-y-auto"
    >
      {/* Animated Frost Backdrop Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-black/60 pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative w-full max-w-xl glass rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl my-auto ${
          isLightMode ? 'bg-white/80 border-black/5' : ''
        }`}
      >
          {/* Header */}
          <div className="p-6 md:p-10 pb-4 md:pb-6 flex justify-between items-center">
            <div>
              <span className="text-[8px] md:text-[10px] font-bold tracking-[0.4em] text-purple-400 uppercase">Consultation</span>
              <h3 className={`text-xl md:text-3xl font-bold mt-1 md:mt-2 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Strategy Session</h3>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className="p-2 md:p-3 hover:bg-white/5 rounded-full transition-colors group"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-zinc-500 group-hover:text-white transition-colors" />
            </motion.button>
          </div>

        {/* Progress Bar */}
        <div className="px-6 md:px-10 flex gap-2 mb-6 md:mb-10">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-grow rounded-full transition-all duration-700 ${step >= i ? 'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-zinc-800'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 md:px-10 pb-6 md:pb-8 flex flex-col">
          <div className="max-h-[50vh] overflow-y-auto pr-2 md:pr-4 custom-scrollbar relative">
            {step === 1 && (
              <div className="space-y-4 md:space-y-6 animate-slide-up py-2">
                {/* Top Row: Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 md:space-y-3 relative">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Interested Service</label>
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                        setIsIndustryDropdownOpen(false);
                      }}
                      className={`w-full glass transition-all duration-500 rounded-2xl px-4 py-3 md:px-5 md:py-4 flex items-center justify-between text-sm group ${
                        isDropdownOpen 
                          ? 'border-purple-500/50 bg-white/10' 
                          : isLightMode ? 'hover:border-black/20' : 'hover:border-white/20'
                      }`}
                    >
                      <span className={formData.service ? (isLightMode ? 'text-black font-medium' : 'text-white font-medium') : 'text-zinc-500'}>
                        {formData.service || 'Select Path'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180 text-purple-400' : 'group-hover:text-zinc-300'}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className={`absolute top-full left-0 right-0 z-[110] rounded-2xl border p-2 shadow-2xl mt-1 overflow-hidden backdrop-blur-xl ${
                            isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#030304]/95 border-white/10'
                          }`}
                        >
                          {services.map((service) => (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, service: service.id});
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all group ${
                                formData.service === service.id 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : isLightMode ? 'hover:bg-black/5 text-zinc-600 hover:text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <service.icon className={`w-4 h-4 ${formData.service === service.id ? 'text-purple-400' : 'text-zinc-500 group-hover:text-purple-400'}`} />
                              <span className="text-sm font-medium">{service.label}</span>
                              {formData.service === service.id && (
                                <motion.div 
                                  layoutId="service-active"
                                  className="ml-auto w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" 
                                />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2 md:space-y-3 relative">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Industry</label>
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setIsIndustryDropdownOpen(!isIndustryDropdownOpen);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full glass transition-all duration-500 rounded-2xl px-4 py-3 md:px-5 md:py-4 flex items-center justify-between text-sm group ${
                        isIndustryDropdownOpen 
                          ? 'border-purple-500/50 bg-white/10' 
                          : isLightMode ? 'hover:border-black/20' : 'hover:border-white/20'
                      }`}
                    >
                      <span className={formData.industry ? (isLightMode ? 'text-black font-medium' : 'text-white font-medium') : 'text-zinc-500'}>
                        {formData.industry || 'Select Industry'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-500 ${isIndustryDropdownOpen ? 'rotate-180 text-purple-400' : 'group-hover:text-zinc-300'}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isIndustryDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className={`absolute top-full left-0 right-0 z-[110] rounded-2xl border p-2 shadow-2xl mt-1 max-h-[200px] overflow-y-auto custom-scrollbar backdrop-blur-xl ${
                            isLightMode ? 'bg-white/90 border-black/10' : 'bg-[#030304]/95 border-white/10'
                          }`}
                        >
                          {industries.map((industry) => (
                            <button
                              key={industry}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, industry: industry});
                                setIsIndustryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all group ${
                                formData.industry === industry 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : isLightMode ? 'hover:bg-black/5 text-zinc-600 hover:text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                              }`}
                            >
                              <span className="text-sm font-medium">{industry}</span>
                              {formData.industry === industry && (
                                <motion.div 
                                  layoutId="industry-active"
                                  className="ml-auto w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" 
                                />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {formData.industry === 'Other' && (
                  <div className="space-y-2 md:space-y-3 animate-slide-up">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Specify Industry</label>
                    <input 
                      type="text" 
                      placeholder="Your industry" 
                      className={`w-full glass rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium placeholder:text-zinc-700 ${
                        isLightMode ? 'text-black' : 'text-white'
                      }`}
                      value={formData.otherIndustry}
                      onChange={(e) => setFormData({...formData, otherIndustry: e.target.value})}
                    />
                  </div>
                )}

                {/* Second Row: Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 md:space-y-3">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      className={`w-full glass rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium placeholder:text-zinc-700 ${
                        isLightMode ? 'text-black' : 'text-white'
                      }`}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:space-y-3">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Work Email</label>
                    <input 
                      type="email" 
                      placeholder="john@company.com" 
                      className={`w-full glass rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium placeholder:text-zinc-700 ${
                        isLightMode ? 'text-black' : 'text-white'
                      }`}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Third Row: Phone & Business */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 md:space-y-3">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      className={`w-full glass rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium placeholder:text-zinc-700 ${
                        isLightMode ? 'text-black' : 'text-white'
                      }`}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:space-y-3">
                    <label className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] ml-1 ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Business Name</label>
                    <input 
                      type="text" 
                      placeholder="Acme Corp" 
                      className={`w-full glass rounded-2xl px-4 py-3 md:px-5 md:py-4 focus:outline-none focus:border-purple-500 transition-all text-sm font-medium placeholder:text-zinc-700 ${
                        isLightMode ? 'text-black' : 'text-white'
                      }`}
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 md:space-y-6 animate-slide-up py-2">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">{year}</span>
                    <h4 className={`text-lg md:text-2xl font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{monthName}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => changeMonth(-1)}
                      className="p-2 md:p-3 glass border border-white/5 rounded-full hover:bg-white/10 transition-all active:scale-90"
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button 
                      onClick={() => changeMonth(1)}
                      className="p-2 md:p-3 glass border border-white/5 rounded-full hover:bg-white/10 transition-all active:scale-90"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[8px] md:text-[10px] font-bold text-zinc-600 tracking-widest pb-1 md:pb-2 uppercase">{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
                    
                    const isDisabled = isDateInPastOrToday(day);
                    
                    return (
                      <button 
                        key={day} 
                        disabled={isDisabled || isFetchingAvailability}
                        onClick={() => handleDateSelect(day)}
                        className={`aspect-square flex items-center justify-center rounded-lg md:rounded-xl text-[10px] md:text-sm font-medium transition-all border ${
                          isDisabled 
                            ? 'opacity-10 cursor-not-allowed border-transparent' 
                            : formData.date === `${monthName} ${day}`
                              ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                              : 'glass border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-90'
                        }`}
                      >
                        {isFetchingAvailability && formData.date === `${monthName} ${day}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          day
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-center gap-2 text-zinc-500 pt-2 md:pt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Available slots for {monthName}</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 md:space-y-8 animate-slide-up py-2">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  <h4 className={`text-lg md:text-xl font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Select Start Time</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {timeSlots.map((t) => {
                    const busy = isSlotBusy(t);
                    return (
                      <button
                        key={t}
                        disabled={isSyncing || busy}
                        onClick={() => handleBookingConfirm(t)}
                        className={`glass border p-4 md:p-5 rounded-xl md:rounded-2xl text-[12px] md:text-sm font-bold tracking-tight transition-all flex items-center justify-between group ${
                          busy 
                            ? 'opacity-20 cursor-not-allowed border-transparent grayscale' 
                            : 'border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {t}
                        </span>
                        {!busy && <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isSyncing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center gap-3 md:gap-4 py-4 md:py-6"
                    >
                      <div className="relative">
                         <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-purple-500 animate-spin" />
                         <Sparkles className="absolute top-0 right-0 w-2 h-2 md:w-3 md:h-3 text-white animate-pulse" />
                      </div>
                      <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Synchronizing with Calendar</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-2 md:py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                >
                  Go Back to Date
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-8 md:py-12 animate-scale-in">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                  <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12 text-green-500" />
                </div>
                <h4 className={`text-xl md:text-3xl font-bold mb-3 md:mb-4 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Booking Confirmed!</h4>
                <p className={`text-[12px] md:text-sm mb-8 md:mb-10 leading-relaxed font-light max-w-[280px] md:max-w-[320px] mx-auto ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Consultation for <span className="text-purple-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px] bg-purple-500/10 px-2 py-1 rounded-md">{formData.service}</span> is now confirmed.
                  <br /><br />
                  {syncStatus?.success ? (
                    <>Calendar invites sent to <span className="text-white font-medium">{formData.email}</span>.</>
                  ) : (
                    <span className="text-amber-400/80">Note: We've received your booking, but could not sync it to our calendar automatically. Our team will manually confirm shortly.</span>
                  )}
                </p>
                <button 
                  onClick={onClose}
                  className="px-8 md:px-12 py-3 md:py-4 glass border border-white/10 rounded-full font-bold text-[12px] md:text-sm hover:bg-white/10 hover:text-white transition-all active:scale-95 text-zinc-400"
                >
                  Close Portal
                </button>
              </div>
            )}
          </div>

          {/* Fixed Footer for Step 1 */}
          {step === 1 && (
            <div className="pt-4 md:pt-6 border-t border-white/5 mt-auto">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextStep}
                disabled={!formData.service || !formData.name || !formData.email || !formData.phone || !formData.company || !formData.industry || (formData.industry === 'Other' && !formData.otherIndustry)}
                className="w-full bg-white text-black font-bold py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <span className="relative z-10">Next: Choose Date</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
