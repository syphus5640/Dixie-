import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Phone, User, Building, FileText, CheckCircle2, XCircle, Clock, Loader2, ChevronRight, Search, ChevronLeft, PhoneOff, RefreshCw, Edit3, Save, X, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast, addDays, startOfDay, isValid } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { BackgroundAtmosphere } from './BackgroundAtmosphere';
import { Leaderboard } from './Leaderboard';
import ReactMarkdown from 'react-markdown';

const DEFAULT_SCRIPT = `# Receptionist Script

## OPENER
"Hey, it's [Your Name] calling from Luno Studios. May I speak to the owner please?"

## OWNER ON PHONE
"I know I probably caught you in the middle of something, but do you have 20 seconds real quick?"

## PITCH
"I just wasn't sure if you’ve heard our name being tossed around at all, but we've been working with businesses like yours that are always looking for ways to avoid missing potential client calls, especially after hours. So it's just some really cool AI technology. I know you're busy right now, so maybe we can schedule like a very quick 15-minute call this week where we actually create a custom AI that's based on your business that you can talk to live and just to hear how it sounds, just to see if it's something that may fit."

## WE ARE ALL TAKEN CARE / WE DON'T NEED IT
"Yeah no problem, so you guys don't miss any calls usually throughout the night?"

"What we've seen is that the AI will pick up in the middle of the night, the weekend or those off times when you guys don't pick up the phone and typically you see those results coming through like additional bookings, more revenue, that sort of thing. I don't know if you're open to it, but we can schedule like a very quick 15-minute call this week where I actually create a custom AI that's based on your business that you can talk to live and just to hear how it sounds, just to see if it's something that may fit."

## GOT SOMEONE 24/7
"We create custom AI solutions that are fully tailored to your business. We're actually working with a roofing company right now. Essentially it picks up the phone after hours or missed calls and it fully answers like a human but it's AI and it's able to book people into your software and really act like a human just for those calls that don't get answered, say in the middle of the night or throughout the day when things get busy."

## WHAT IS IT
"It's essentially a custom-built voice AI solution that can be on 24/7 or just for missed calls and it's fully custom built to your scripts and how you usually book people in and it can answer the phone and do outbound calls."`;

export default function CallingDashboard() {
  const [niches, setNiches] = useState<string[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [meetingToReschedule, setMeetingToReschedule] = useState<any>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [splitWidth, setSplitWidth] = useState(50); // percentage
  const [script, setScript] = useState('');
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [tempScript, setTempScript] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardPanelRef = useRef<HTMLDivElement>(null);
  const [dashboardWidth, setDashboardWidth] = useState(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!dashboardPanelRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDashboardWidth(entry.contentRect.width);
      }
    });
    observer.observe(dashboardPanelRef.current);
    return () => observer.disconnect();
  }, []);

  const actionTakenRef = useRef(false);
  const currentRequestRef = useRef<number>(0);
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('luno-theme') === 'light';
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    }, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((clientX - containerRect.left) / containerRect.width) * 100;
    if (newWidth > 15 && newWidth < 85) {
      setSplitWidth(newWidth);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      handleMouseMove(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = true;
    if ('touches' in e) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
    } else {
      e.preventDefault();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleScriptSave = async () => {
    try {
      setActionLoading(true);
      const token = await getAuthToken();
      const res = await fetch('/api/user/script', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ script: tempScript })
      });
      if (!res.ok) throw new Error('Failed to save script');
      setScript(tempScript);
      setIsEditingScript(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const handleStorage = () => {
      setIsLightMode(localStorage.getItem('luno-theme') === 'light');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (showBookDemoModal || showRescheduleModal || showCallbackModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showBookDemoModal, showRescheduleModal, showCallbackModal]);

  // Combine tasks and meetings
  const allEvents = useMemo(() => [
    ...tasks.map(t => ({ ...t, eventType: 'callback', eventDate: t.callback_date })),
    ...meetings.map(m => {
      let eventDate = m.demo_date;
      if (m.demo_date && m.demo_time) {
        // Ensure time is in a format parseISO can handle (HH:mm:ss)
        const time = m.demo_time.length === 5 ? `${m.demo_time}:00` : m.demo_time;
        eventDate = `${m.demo_date}T${time}`;
      }
      return { ...m, eventType: 'meeting', eventDate };
    })
  ].filter(event => {
    if (!event.eventDate || typeof event.eventDate !== 'string') return false;
    try {
      const date = parseISO(event.eventDate);
      return isValid(date);
    } catch (e) {
      return false;
    }
  }), [tasks, meetings]);

  // Tasks for the selected date
  const selectedDayTasks = useMemo(() => allEvents.filter(task => {
    const date = parseISO(task.eventDate);
    return format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  }).sort((a, b) => {
    const timeA = parseISO(a.eventDate).getTime();
    const timeB = parseISO(b.eventDate).getTime();
    return timeA - timeB;
  }), [allEvents, selectedDate]);

  // All upcoming tasks in chronological order (Next Up)
  // Includes today's tasks, future tasks, and overdue tasks
  const nextTasksFull = useMemo(() => allEvents
    .filter(task => {
      const date = parseISO(task.eventDate);
      // Include today's tasks, future tasks, and overdue tasks (past but not completed)
      return isFuture(date) || isToday(date) || (isPast(date) && task.status !== 'completed' && task.status !== 'demo_booked');
    })
    .sort((a, b) => {
      const dateA = parseISO(a.eventDate);
      const dateB = parseISO(b.eventDate);
      
      const isTodayA = isToday(dateA);
      const isTodayB = isToday(dateB);
      
      // 1. Today's tasks always first
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;
      
      // 2. If both are today, chronological
      if (isTodayA && isTodayB) return dateA.getTime() - dateB.getTime();
      
      const isPastA = isPast(dateA);
      const isPastB = isPast(dateB);
      
      // 3. Overdue vs Future: Overdue first
      if (isPastA && !isPastB) return -1;
      if (!isPastA && isPastB) return 1;
      
      // 4. If both are past (overdue), newest first (most recent)
      if (isPastA && isPastB) return dateB.getTime() - dateA.getTime();
      
      // 5. If both are future, chronological
      return dateA.getTime() - dateB.getTime();
    }), [allEvents]);

  const nextTasks = useMemo(() => nextTasksFull.slice(0, 20), [nextTasksFull]);

  // Generate week dates for the calendar strip (not used anymore but keeping for ref if needed)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 1); // Yesterday to 5 days ahead
    return d;
  });

  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasCallback = tasks.some(t => {
      if (!t.callback_date) return false;
      return format(parseISO(t.callback_date), 'yyyy-MM-dd') === dateStr;
    });
    const hasMeeting = meetings.some(m => {
      if (!m.demo_date) return false;
      return m.demo_date === dateStr;
    });

    let classes = 'relative h-14 flex flex-col items-center justify-center';
    if (hasCallback) classes += ' react-calendar__tile--has-callback';
    if (hasMeeting) classes += ' react-calendar__tile--has-meeting';
    if (isPast(date) && !isToday(date)) classes += ' react-calendar__tile--past';
    if (isToday(date)) classes += ' react-calendar__tile--today';
    return classes;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) tokenRef.current = session.access_token;
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token || null;
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentLead?._rowIndex && tokenRef.current && !actionTakenRef.current) {
        // Use fetch with keepalive to ensure it completes even if page closes
        fetch('/api/calling/release-lead', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rowIndex: currentLead._rowIndex }),
          keepalive: true
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && currentLead?._rowIndex && tokenRef.current && !actionTakenRef.current) {
        fetch('/api/calling/release-lead', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rowIndex: currentLead._rowIndex }),
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Also release on component unmount or lead change if no action was taken
      if (currentLead?._rowIndex && tokenRef.current && !actionTakenRef.current) {
        fetch('/api/calling/release-lead', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rowIndex: currentLead._rowIndex }),
          keepalive: true
        }).catch(() => {});
      }
      // Reset action taken for the next lead
      actionTakenRef.current = false;
    };
  }, [currentLead]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      throw new Error('No session');
    }
    return session.access_token;
  };

  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleReschedule = async () => {
    if (!meetingToReschedule || !bookingDate || !bookingTime) return;
    
    try {
      setActionLoading(true);
      setError(null);
      const token = await getAuthToken();
      
      const res = await fetch('/api/calendar/reschedule-demo', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: meetingToReschedule.event_id,
          date: bookingDate,
          time: bookingTime
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reschedule demo');
      }

      // Update lead in spreadsheet
      await fetch('/api/calling/update-lead', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rowIndex: meetingToReschedule._rowIndex,
          status: 'demo_booked',
          notes: meetingToReschedule.notes + `\nDemo rescheduled to ${bookingDate} at ${bookingTime}`,
          eventId: meetingToReschedule.event_id,
          demoDate: bookingDate,
          demoTime: bookingTime
        })
      });

      setShowRescheduleModal(false);
      setMeetingToReschedule(null);
      fetchInitialData();
      fetchStats(); // Refresh stats after update
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDemo = async () => {
    if (!meetingToReschedule) return;
    
    console.log('[CANCEL] Initiating cancellation for:', meetingToReschedule);
    
    try {
      setActionLoading(true);
      setError(null);
      const token = await getAuthToken();
      
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: meetingToReschedule.event_id,
          email: meetingToReschedule.email
        })
      });
      
      const data = await res.json();
      console.log('[CANCEL] Response from server:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel demo');
      }

      setCancelSuccess(true);
      setTimeout(() => {
        setShowRescheduleModal(false);
        setMeetingToReschedule(null);
        setShowCancelConfirm(false);
        setCancelSuccess(false);
        fetchInitialData();
      }, 2000);
    } catch (err: any) {
      console.error('[CANCEL] Error in handleCancelDemo:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRescheduleModal = async (meeting: any) => {
    setMeetingToReschedule(meeting);
    setBookingDate('');
    setBookingTime('');
    setAvailableSlots([]);
    setShowRescheduleModal(true);
    
    try {
      setBookingLoading(true);
      const token = await getAuthToken();
      const res = await fetch('/api/calendar/availability', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch availability');
      }
      const data = await res.json();
      setAvailableSlots(data);
    } catch (err: any) {
      setError("Failed to load availability: " + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const token = await getAuthToken();
      const res = await fetch('/api/calling/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const [nichesRes, tasksRes, profileRes, meetingsRes, statsRes] = await Promise.all([
        fetch('/api/calling/niches', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/calling/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/calling/meetings', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/calling/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!nichesRes.ok || !tasksRes.ok) throw new Error('Failed to fetch data');

      const nichesData = await nichesRes.json();
      const tasksData = await tasksRes.json();
      const profileData = profileRes.ok ? await profileRes.json() : null;
      const meetingsData = meetingsRes.ok ? await meetingsRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : null;

      setNiches(nichesData);
      setTasks(tasksData);
      setUserProfile(profileData);
      setScript(profileData?.script || DEFAULT_SCRIPT);
      setMeetings(meetingsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNextLead = async (niche: string) => {
    if (!niche) return;
    const requestId = ++currentRequestRef.current;
    
    try {
      setActionLoading(true);
      setError(null);
      setCurrentLead(null); // Clear immediately so it doesn't get released again
      const token = await getAuthToken();
      
      const res = await fetch('/api/calling/next-lead', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ niche })
      });

      if (!res.ok) throw new Error('Failed to load lead');
      
      const data = await res.json();
      
      // If the request is stale (user clicked another niche while fetching)
      if (requestId !== currentRequestRef.current) {
        if (data.lead?._rowIndex) {
          fetch('/api/calling/release-lead', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rowIndex: data.lead._rowIndex })
          }).catch(() => {});
        }
        return;
      }

      setCurrentLead(data.lead);
      setNotes(data.lead?.notes || '');
    } catch (err: any) {
      if (requestId === currentRequestRef.current) {
        setError(err.message);
      }
    } finally {
      if (requestId === currentRequestRef.current) {
        setActionLoading(false);
      }
    }
  };

  const releaseCurrentLead = async () => {
    if (!currentLead || !currentLead._rowIndex) return;
    const leadToRelease = currentLead;
    setCurrentLead(null); // Optimistically clear it
    try {
      const token = await getAuthToken();
      await fetch('/api/calling/release-lead', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rowIndex: leadToRelease._rowIndex })
      });
    } catch (err) {
      console.error("Failed to release lead:", err);
    }
  };

  const handleNicheSelect = async (niche: string) => {
    await releaseCurrentLead();
    setSelectedNiche(niche);
    loadNextLead(niche);
  };

  const handleTaskClick = async (task: any) => {
    if (currentLead?._rowIndex === task._rowIndex) return;
    currentRequestRef.current++; // Cancel any pending loadNextLead requests
    await releaseCurrentLead();
    setCurrentLead(task);
    setNotes(task.notes || '');
    if (task.niche) {
      setSelectedNiche(task.niche);
    }
  };

  const handleAction = async (status: string) => {
    if (!currentLead) return;
    
    try {
      setActionLoading(true);
      actionTakenRef.current = true;
      const token = await getAuthToken();
      
      let finalCallbackDate = null;
      let notesToSend = notes;

      if (status === 'callback') {
        if (!callbackDate || !callbackTime) {
          setError('Please select date and time for callback');
          setActionLoading(false);
          return;
        }
        finalCallbackDate = new Date(`${callbackDate}T${callbackTime}`).toISOString();
      } else if (status === 'no_answer' && currentLead.status === 'callback') {
        // Automatically reschedule for tomorrow at the same time
        const originalDateStr = currentLead.callback_date || currentLead.callbackDate;
        if (originalDateStr) {
          try {
            const originalDate = new Date(originalDateStr);
            if (!isNaN(originalDate.getTime())) {
              const tomorrow = new Date(originalDate);
              tomorrow.setDate(tomorrow.getDate() + 1);
              finalCallbackDate = tomorrow.toISOString();
              // We keep it as a callback so it stays in the tasks list
              status = 'callback';
              const autoNote = `[Auto] No answer on callback. Rescheduled for tomorrow.`;
              notesToSend = notes + (notes ? '\n' : '') + autoNote;
              setNotes(notesToSend);
              console.log(`[CALLING] Auto-rescheduling callback for tomorrow: ${finalCallbackDate}`);
            }
          } catch (e) {
            console.error("[CALLING] Failed to auto-reschedule callback:", e);
          }
        }
      }

      const res = await fetch('/api/calling/update-lead', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rowIndex: currentLead._rowIndex,
          status,
          notes: notesToSend,
          callbackDate: finalCallbackDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');

      if (data.message) {
        // If it "succeeded" but with a message (like no columns matched)
        setError(`Warning: ${data.message}. Please check your spreadsheet headers.`);
        // We still close the modal but maybe don't load next lead immediately so they can see the warning
        setShowCallbackModal(false);
        setCallbackDate('');
        setCallbackTime('');
        setActionLoading(false);
        return;
      }

      setShowCallbackModal(false);
      setCallbackDate('');
      setCallbackTime('');
      
      // Refresh tasks if it was a callback
      if (status === 'callback') {
        const tasksRes = await fetch('/api/calling/tasks', { headers: { 'Authorization': `Bearer ${token}` } });
        if (tasksRes.ok) setTasks(await tasksRes.json());
      }

      // Load next lead
      fetchStats();
      loadNextLead(selectedNiche);
    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleBookDemoClick = async () => {
    setShowBookDemoModal(true);
    setBookingStep(1);
    setBookingDate('');
    setBookingTime('');
    setClientEmail('');
    setAvailableSlots([]);
    
    try {
      setBookingLoading(true);
      const token = await getAuthToken();
      const res = await fetch('/api/calendar/availability', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("[CALENDAR] Availability Response Status:", res.status);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch availability');
      }
      const data = await res.json();
      console.log("[CALENDAR] Availability Data:", data);
      setAvailableSlots(data);
      if (data.length === 0) {
        console.warn("[CALENDAR] No available slots returned from server");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const submitBookDemo = async () => {
    if (!bookingDate || !bookingTime || !clientEmail) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setBookingLoading(true);
      actionTakenRef.current = true;
      const token = await getAuthToken();
      const res = await fetch('/api/calendar/book-demo', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_name: currentLead.business_name,
          email: clientEmail,
          date: bookingDate,
          time: bookingTime
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to book demo');
      }

      const data = await res.json();
      
      // Also update lead status to 'demo_booked'
      await fetch('/api/calling/update-lead', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rowIndex: currentLead._rowIndex,
          status: 'demo_booked',
          notes: notes + `\nDemo booked for ${bookingDate} at ${bookingTime} with ${clientEmail}`,
          eventId: data.eventId,
          demoDate: bookingDate,
          demoTime: bookingTime
        })
      });
      
      setShowBookDemoModal(false);
      fetchStats();
      loadNextLead(selectedNiche);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const uniqueDates = Array.from(new Set(availableSlots.map(slot => slot.split('T')[0]))).sort();
  const timesForSelectedDate = availableSlots
    .filter(slot => slot.startsWith(bookingDate))
    .map(slot => slot.split('T')[1].substring(0, 5)); // "HH:mm"

  const primaryText = isLightMode ? 'text-zinc-900' : 'text-white';
  const secondaryText = isLightMode ? 'text-zinc-600' : 'text-zinc-400';
  const mutedText = isLightMode ? 'text-zinc-500' : 'text-zinc-500';
  const bgGlass = isLightMode ? 'bg-white/80 backdrop-blur-xl border-zinc-200' : 'bg-white/5 backdrop-blur-xl border-white/10';

  return (
    <div className={`min-h-screen bg-transparent p-4 md:p-8 font-sans relative`}>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${primaryText}`}>Calling Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-sm ${secondaryText}`}>Internal Sales & Outreach</p>
              {userProfile?.employee_id && (
                <>
                  <span className={`text-xs ${mutedText}`}>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-[10px] font-bold text-violet-400 uppercase tracking-widest border border-violet-500/20">
                    ID: {userProfile.employee_id}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!isSplitScreen) {
                  setTempScript(script);
                }
                setIsSplitScreen(!isSplitScreen);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                isSplitScreen 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                  : isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {isSplitScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isSplitScreen ? 'Close Script' : 'Open Script'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Split Screen Container */}
        <div 
          ref={containerRef}
          className={`flex flex-col lg:flex-row relative overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] border transition-all duration-500 ${
            isSplitScreen ? 'h-[800px] shadow-2xl' : 'min-h-[600px] lg:min-h-[800px]'
          } ${
            isLightMode ? 'bg-zinc-50/50 border-zinc-200' : 'bg-black/20 border-white/5'
          }`}
        >
          {/* Main Dashboard Panel */}
          <div 
            ref={dashboardPanelRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 transition-all duration-300 ease-in-out"
            style={{ 
              width: isSplitScreen && windowWidth >= 1024 ? `${splitWidth}%` : '100%',
              flex: isSplitScreen && windowWidth >= 1024 ? 'none' : '1 1 0%',
              fontSize: dashboardWidth < 900 ? `${Math.max(0.75, dashboardWidth / 900)}rem` : undefined
            }}
          >
            {/* 1. Performance Stats (Horizontal Top) */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 rounded-[1.5rem] md:rounded-[2rem] border ${dashboardWidth < 800 ? 'p-2' : 'p-3'} ${bgGlass} shadow-xl shadow-black/5 relative`}
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className={`text-[9px] font-black uppercase tracking-[0.2em] ${mutedText}`}>Performance Overview</h2>
                <button 
                  onClick={fetchStats}
                  disabled={statsLoading}
                  className={`p-1 rounded-full transition-all ${isLightMode ? 'hover:bg-zinc-100' : 'hover:bg-white/10'} ${statsLoading ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-2.5 h-2.5 text-zinc-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: 'Total Calls', value: stats?.total || 0, color: primaryText, icon: Phone },
                  { label: 'Demos Booked', value: stats?.demo_booked || 0, color: 'text-emerald-500', icon: CalendarIcon },
                  { label: 'Callbacks', value: stats?.callback || 0, color: 'text-blue-500', icon: Clock },
                  { label: 'No Answer', value: stats?.no_answer || 0, color: 'text-amber-500', icon: PhoneOff },
                  { label: 'Not Interested', value: stats?.not_interested || 0, color: 'text-red-500', icon: XCircle },
                ].map((stat, i) => (
                  <div key={i} className={`p-2 rounded-xl border ${isLightMode ? 'bg-white/50 border-zinc-100' : 'bg-white/5 border-white/5'} flex flex-col items-center text-center gap-1 group transition-all hover:scale-[1.02]`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                      <stat.icon className={`w-3 h-3 ${stat.color === primaryText ? mutedText : stat.color}`} />
                    </div>
                    <div>
                      <p className={`text-[7px] font-bold uppercase tracking-widest ${mutedText} mb-0`}>{stat.label}</p>
                      <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 2. Middle Section: Niches (Left) + Lead Workspace (Right) */}
            <div className={`grid grid-cols-12 gap-6 lg:gap-8 mb-8 items-start`}>
              {/* Niche Selector (Left Sidebar) */}
              <div className={`${
                dashboardWidth > 1100 ? 'col-span-3' : 
                dashboardWidth > 650 ? 'col-span-4' : 
                'col-span-12'
              } space-y-6`}>
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-[1.5rem] md:rounded-[2rem] border ${dashboardWidth < 800 ? 'p-4' : 'p-6'} ${bgGlass} shadow-xl shadow-black/5`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${mutedText}`}>Pick Niche</h2>
                    <div className={`h-px flex-1 ml-4 ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`} />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500 mx-auto" />
                    ) : (
                      niches.map(niche => (
                        <button
                          key={niche}
                          onClick={() => handleNicheSelect(niche)}
                          disabled={actionLoading}
                          className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left transition-all duration-300 flex items-center justify-between group ${
                            selectedNiche === niche 
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                              : isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          {niche}
                          <ChevronRight className={`w-3 h-3 transition-transform ${selectedNiche === niche ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Lead Workspace (Center/Right) */}
              <div className={`${
                dashboardWidth > 1100 ? 'col-span-9' : 
                dashboardWidth > 650 ? 'col-span-8' : 
                'col-span-12'
              }`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[1.5rem] md:rounded-[3rem] border ${
                    dashboardWidth < 800 ? 'p-4 md:p-5' : 'p-5 md:p-6 lg:p-8'
                  } h-[450px] md:h-[500px] lg:h-[600px] flex flex-col ${bgGlass} shadow-2xl shadow-black/5 relative overflow-hidden`}
                >
                  {!selectedNiche ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                        <Search className={`w-12 h-12 ${mutedText}`} />
                      </div>
                      <h3 className={`text-3xl font-black mb-4 ${primaryText}`}>Ready to outreach?</h3>
                      <p className={`text-sm ${secondaryText} max-w-sm leading-relaxed mx-auto`}>Select a niche from the sidebar to load your next high-priority lead and start your calling session.</p>
                    </div>
                  ) : actionLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-violet-500 mb-8" />
                        <div className="absolute inset-0 blur-2xl bg-violet-500/20 animate-pulse" />
                      </div>
                      <p className={`text-sm font-black uppercase tracking-widest ${mutedText}`}>Finding your next lead...</p>
                    </div>
                  ) : !currentLead ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 bg-green-500/10`}>
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <h3 className={`text-3xl font-black mb-4 ${primaryText}`}>All caught up!</h3>
                      <p className={`text-sm ${secondaryText} max-w-sm leading-relaxed mx-auto`}>There are no more available leads in this niche at the moment. Great work!</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-black uppercase tracking-widest border border-violet-500/20">
                            {currentLead.niche || selectedNiche}
                          </span>
                          <span className="px-4 py-1.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest border border-zinc-500/20">
                            ID: {currentLead.id || currentLead.lead_id || currentLead._rowIndex}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h2 className={`${
                            dashboardWidth < 800 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'
                          } font-black tracking-tight leading-tight ${primaryText} font-sans`}>
                            {currentLead.business_name}
                          </h2>
                          <div className={`flex flex-wrap items-center ${dashboardWidth < 800 ? 'gap-3 md:gap-4' : 'gap-4 md:gap-8'} pt-2`}>
                            <div className="flex items-center gap-3">
                              <div className={`${dashboardWidth < 800 ? 'w-7 h-7' : 'w-8 h-8 md:w-10 md:h-10'} rounded-xl md:rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                                <User className={`${dashboardWidth < 800 ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'} ${mutedText}`} />
                              </div>
                              <div>
                                <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Contact</p>
                                <p className={`text-[10px] md:text-sm font-bold ${primaryText}`}>{currentLead.owner_name || 'No Owner Name'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`${dashboardWidth < 800 ? 'w-7 h-7' : 'w-8 h-8 md:w-10 md:h-10'} rounded-xl md:rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                                <Phone className={`${dashboardWidth < 800 ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'} ${mutedText}`} />
                              </div>
                              <div>
                                <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Phone Number</p>
                                <p className={`text-xs md:text-lg font-black font-mono ${primaryText}`}>{currentLead.phone}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 ${dashboardWidth < 800 ? 'gap-3 md:gap-4' : 'gap-4 md:gap-6'} mt-auto`}>
                        <div className={`${dashboardWidth < 800 ? 'p-3 md:p-4' : 'p-4 md:p-5'} rounded-[1.5rem] md:rounded-[2rem] border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/2 border-white/5'}`}>
                          <div className={`flex items-center gap-3 ${dashboardWidth < 800 ? 'mb-2' : 'mb-3 md:mb-4'}`}>
                            <FileText className={`w-4 h-4 ${mutedText}`} />
                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Call Notes & Objections</h3>
                          </div>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Type notes here as you speak..."
                            className={`w-full ${dashboardWidth < 800 ? 'h-16 md:h-20' : 'h-20 md:h-24'} bg-transparent border-none focus:ring-0 p-0 text-xs md:text-base leading-relaxed resize-none custom-scrollbar ${primaryText} placeholder:opacity-20 overflow-y-auto`}
                          />
                        </div>
                        
                        <div className={`${dashboardWidth < 800 ? 'space-y-2' : 'space-y-3 md:space-y-4'}`}>
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className={`w-4 h-4 ${mutedText}`} />
                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Outcome</h3>
                          </div>
                          <div className={`grid grid-cols-2 md:grid-cols-4 ${dashboardWidth < 800 ? 'gap-2 md:gap-3' : 'gap-3 md:gap-4'}`}>
                            {[
                              { id: 'not_interested', label: 'Not Interested', icon: XCircle, color: 'text-red-500' },
                              { id: 'no_answer', label: 'No Answer', icon: PhoneOff, color: 'text-zinc-500' },
                              { id: 'callback', label: 'Callback', icon: Clock, color: 'text-amber-500', action: () => setShowCallbackModal(true) },
                              { id: 'demo_booked', label: 'Book Demo', icon: CalendarIcon, color: 'text-violet-500', action: handleBookDemoClick },
                            ].map((btn) => (
                              <button
                                key={btn.id}
                                onClick={btn.action || (() => handleAction(btn.id))}
                                className={`${dashboardWidth < 800 ? 'p-2 md:p-3' : 'p-3 md:p-4'} rounded-xl md:rounded-2xl border text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 md:gap-3 group ${
                                  isLightMode ? 'bg-white border-zinc-200 hover:bg-zinc-50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <btn.icon className={`${dashboardWidth < 800 ? 'w-4 h-4' : 'w-5 h-5 md:w-6 md:h-6'} ${btn.color} transition-transform group-hover:scale-110`} />
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* 3. Bottom Section: Calendar (Left) + Next Up (Right) */}
            <div className={`grid grid-cols-12 gap-6 lg:gap-8 items-start`}>
              {/* Calendar Card */}
              <div className={`${
                dashboardWidth > 1100 ? 'col-span-6' : 
                dashboardWidth > 650 ? 'col-span-6' : 
                'col-span-12'
              }`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[2rem] border overflow-hidden ${bgGlass} shadow-xl shadow-black/5 flex flex-col h-full min-h-[300px]`}
                >
                  <div className="bg-zinc-900 p-3 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                        <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold tracking-tight">Schedule</h2>
                        <p className="text-[9px] opacity-50 font-medium uppercase tracking-widest">
                          {format(selectedDate, 'MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black leading-none">{format(selectedDate, 'dd')}</span>
                    </div>
                  </div>

                  <div className="p-2 scale-[0.85] origin-top flex-1 flex items-start justify-center">
                    <Calendar
                      onChange={(val) => setSelectedDate(val as Date)}
                      value={selectedDate}
                      tileClassName={getTileClassName}
                      className="w-full border-none"
                      nextLabel={<ChevronRight className="w-4 h-4" />}
                      prevLabel={<ChevronLeft className="w-4 h-4" />}
                      next2Label={null}
                      prev2Label={null}
                      calendarType="gregory"
                      locale="en-US"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Agenda Card */}
              <div className={`${
                dashboardWidth > 1100 ? 'col-span-6' : 
                dashboardWidth > 650 ? 'col-span-6' : 
                'col-span-12'
              }`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[1.5rem] md:rounded-[2rem] border overflow-hidden ${bgGlass} shadow-xl shadow-black/5 flex flex-col h-full min-h-[300px]`}
                >
                  <div className={`${dashboardWidth < 800 ? 'p-4' : 'p-6'} border-b ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${mutedText}`}>
                        {isToday(selectedDate) ? 'Next Up' : `Agenda: ${format(selectedDate, 'MMM d')}`}
                      </h2>
                      <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-500 text-[9px] font-black">
                        {isToday(selectedDate) ? nextTasksFull.length : selectedDayTasks.length} {isToday(selectedDate) ? 'UPCOMING' : 'TASKS'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-4">
                      {(isToday(selectedDate) ? nextTasks : selectedDayTasks).length === 0 ? (
                        <div className={`p-8 rounded-2xl border border-dashed ${isLightMode ? 'border-zinc-200' : 'border-white/10'} text-center`}>
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${mutedText} opacity-50`}>No calls scheduled</p>
                        </div>
                      ) : (
                        (isToday(selectedDate) ? nextTasks : selectedDayTasks).map((task, i) => {
                          const eventDate = parseISO(task.eventDate);
                          const isOverdue = isPast(eventDate) && !isToday(eventDate) && task.status !== 'completed';
                          
                          return (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              onClick={() => task.eventType === 'meeting' ? openRescheduleModal(task) : handleTaskClick(task)}
                              className={`p-4 rounded-2xl border transition-all group cursor-pointer ${
                                isLightMode ? 'bg-zinc-50 border-zinc-100 hover:border-violet-200' : 'bg-white/5 border-white/5 hover:border-violet-500/30'
                              } ${task.eventType === 'meeting' ? 'border-l-4 border-l-amber-500' : ''} ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                  <h4 className={`font-black text-xs ${primaryText} truncate pr-2`}>{task.business_name}</h4>
                                  {isOverdue && (
                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Overdue</span>
                                  )}
                                  {!isToday(eventDate) && !isOverdue && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${mutedText}`}>
                                      {format(eventDate, 'MMM d')}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isPast(eventDate) && !isToday(eventDate) ? 'bg-red-500/10 text-red-500' : 'bg-violet-500/10 text-violet-400'}`}>
                                  {format(eventDate, 'h:mm a')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${secondaryText}`}>
                                  <Phone className="w-2.5 h-2.5 opacity-50" /> {task.phone}
                                </div>
                                {task.eventType === 'meeting' && (
                                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Demo</span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Leaderboard Section - Full Width at Bottom */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12 pb-12"
            >
              <Leaderboard isLightMode={isLightMode} />
            </motion.div>
          </div>

          {/* Draggable Divider */}
          {isSplitScreen && (
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className={`hidden lg:flex w-2 h-full cursor-col-resize items-center justify-center transition-colors group relative z-50 ${
                isLightMode ? 'bg-zinc-200 hover:bg-violet-400' : 'bg-white/10 hover:bg-violet-500/50'
              }`}
            >
              <div className={`w-8 h-14 rounded-full border flex items-center justify-center shadow-lg transition-colors ${
                isLightMode ? 'bg-white border-zinc-200 text-zinc-400 group-hover:text-violet-500' : 'bg-zinc-900 border-white/10 text-white/40 group-hover:text-violet-400'
              }`}>
                <GripVertical className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Script Panel */}
          {isSplitScreen && (
            <div 
              className={`h-full overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out border-t lg:border-t-0 lg:border-l ${
                isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900/50 border-white/10 backdrop-blur-xl'
              }`}
              style={{ width: windowWidth >= 1024 ? `${100 - splitWidth}%` : '100%' }}
            >
              <div className="p-6 md:p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8 md:mb-12">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                      <FileText className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-black ${primaryText}`}>Sales Script</h2>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Personalized Guide</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditingScript) {
                        handleScriptSave();
                      } else {
                        setTempScript(script);
                        setIsEditingScript(true);
                      }
                    }}
                    disabled={actionLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      isEditingScript 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (isEditingScript ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />)}
                    {isEditingScript ? 'Save Script' : 'Edit Script'}
                  </button>
                </div>

                <div className={`p-8 rounded-[2rem] border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/2 border-white/5'}`}>
                  {isEditingScript ? (
                    <textarea
                      value={tempScript}
                      onChange={(e) => setTempScript(e.target.value)}
                      className={`w-full h-[600px] bg-transparent border-none focus:ring-0 p-0 text-base leading-relaxed resize-none custom-scrollbar ${primaryText} placeholder:opacity-20`}
                      placeholder="Write your sales script here..."
                    />
                  ) : (
                    <div className={`prose prose-invert max-w-none ${isLightMode ? 'prose-zinc' : 'prose-invert'}`}>
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className={`text-2xl font-black mb-4 mt-8 first:mt-0 ${primaryText}`} {...props} />,
                          h2: ({node, ...props}) => <h2 className={`text-xl font-black mb-3 mt-6 ${primaryText}`} {...props} />,
                          h3: ({node, ...props}) => <h3 className={`text-lg font-black mb-2 mt-4 ${primaryText}`} {...props} />,
                          p: ({node, ...props}) => <p className={`text-base leading-relaxed mb-4 ${secondaryText}`} {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                          li: ({node, ...props}) => <li className={`text-base ${secondaryText}`} {...props} />,
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-violet-500 pl-4 italic my-6 text-lg font-medium text-violet-400/80" {...props} />
                          ),
                        }}
                      >
                        {script}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Callback Modal */}
      <AnimatePresence>
        {showCallbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[32px] border shadow-2xl ${bgGlass}`}
            >
              <h3 className={`text-xl font-bold mb-4 ${primaryText}`}>Schedule Callback</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${secondaryText}`}>Date</label>
                  <input
                    type="date"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full p-3 rounded-xl border outline-none ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-black/50 border-white/10 text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${secondaryText}`}>Time</label>
                  <input
                    type="time"
                    value={callbackTime}
                    onChange={(e) => setCallbackTime(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-black/50 border-white/10 text-white'}`}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCallbackModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${isLightMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('callback')}
                  disabled={!callbackDate || !callbackTime || actionLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Schedule'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Debug Modal */}
      <AnimatePresence>
        {showDebug && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[32px] border shadow-2xl ${bgGlass}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${primaryText}`}>Calendar Debug</h3>
                <button onClick={() => setShowDebug(false)} className={mutedText}><XCircle className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className={mutedText}>Client ID:</span>
                  <span className={primaryText}>{debugInfo?.status?.clientId}</span>
                  <span className={mutedText}>Client Secret:</span>
                  <span className={primaryText}>{debugInfo?.status?.clientSecret}</span>
                  <span className={mutedText}>Refresh Token:</span>
                  <span className={primaryText}>{debugInfo?.status?.refreshToken}</span>
                  <span className={mutedText}>Calendar ID:</span>
                  <span className={primaryText}>{debugInfo?.status?.calendarId}</span>
                </div>
                
                <div className={`p-4 rounded-2xl border ${debugInfo?.connection === 'Success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                  <p className="text-sm font-bold mb-1">Connection: {debugInfo?.connection}</p>
                  {debugInfo?.calendarTitle && <p className="text-xs">Title: {debugInfo.calendarTitle}</p>}
                  {debugInfo?.error && <p className="text-xs mt-2 font-mono break-all">{debugInfo.error}</p>}
                  {debugInfo?.details && <pre className="text-[10px] mt-2 overflow-x-auto">{JSON.stringify(debugInfo.details, null, 2)}</pre>}
                </div>
              </div>

              <button
                onClick={() => setShowDebug(false)}
                className="w-full py-3 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        <AnimatePresence>
          {showBookDemoModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBookDemoModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] border overflow-hidden shadow-2xl ${
                  isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-white/10'
                }`}
              >
                {/* Header */}
                <div className={`${isLightMode ? 'bg-zinc-900' : 'bg-zinc-950'} p-6 md:p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent opacity-50" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <CalendarIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-black tracking-tight">Book Demo</h2>
                      <p className="text-[10px] opacity-50 font-black uppercase tracking-[0.2em]">Step {bookingStep} of 3</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowBookDemoModal(false)}
                    className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90 relative z-10"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                  {/* Step 1: Pick Date */}
                  {bookingStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <h3 className={`text-xl md:text-2xl font-black mb-2 ${primaryText}`}>Select a Date</h3>
                        <p className={`text-sm ${secondaryText}`}>When would they like to see the demo?</p>
                      </div>
                      
                      <div className="p-2 md:p-4 rounded-3xl bg-zinc-900/5 dark:bg-white/5">
                        <Calendar
                          onChange={(val) => {
                            setBookingDate(format(val as Date, 'yyyy-MM-dd'));
                            setBookingStep(2);
                          }}
                          minDate={addDays(new Date(), 1)}
                          className="w-full border-none bg-transparent"
                          calendarType="gregory"
                          locale="en-US"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Pick Time */}
                  {bookingStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <button 
                          onClick={() => setBookingStep(1)}
                          className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${mutedText} hover:text-violet-500 transition-colors group`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}>
                            <ChevronLeft className="w-4 h-4" />
                          </div>
                          Back to Date
                        </button>
                        <div className="flex flex-col items-end">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Selected Date</p>
                          <p className={`text-sm font-black ${primaryText}`}>{bookingDate && format(parseISO(bookingDate), 'MMM d, yyyy')}</p>
                        </div>
                      </div>

                      <h3 className={`text-2xl font-black text-center mb-8 ${primaryText}`}>Pick a Time</h3>

                      {bookingLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-4" />
                          <p className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>Checking Availability...</p>
                        </div>
                      ) : timesForSelectedDate.length === 0 ? (
                        <div className="text-center py-20">
                          <p className={`text-sm font-bold ${secondaryText}`}>No available slots for this date.</p>
                          <button 
                            onClick={() => setBookingStep(1)}
                            className="mt-4 text-violet-500 font-black text-xs uppercase tracking-widest"
                          >
                            Try another day
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {timesForSelectedDate.map(time => (
                            <button
                              key={time}
                              onClick={() => {
                                setBookingTime(time);
                                setBookingStep(3);
                              }}
                              className={`py-4 rounded-2xl font-black text-sm transition-all ${
                                bookingTime === time
                                  ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/30'
                                  : isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3: Details & Confirm */}
                  {bookingStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <button 
                          onClick={() => setBookingStep(2)}
                          className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${mutedText} hover:text-violet-500 transition-colors group`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLightMode ? 'bg-zinc-100 group-hover:bg-violet-100' : 'bg-white/5 group-hover:bg-violet-500/20'}`}>
                            <ChevronLeft className="w-4 h-4" />
                          </div>
                          Back to Time
                        </button>
                        <div className="px-4 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                          <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">Step 3 of 3</p>
                        </div>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <div className="text-center mb-4 md:mb-6">
                          <h3 className={`text-2xl md:text-3xl font-black mb-1 md:mb-2 ${primaryText}`}>Confirm Booking</h3>
                          <p className={`text-xs md:text-sm ${secondaryText}`}>Please review the details before confirming.</p>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4`}>
                          <div className={`p-4 md:p-6 rounded-3xl border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/10'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 ${mutedText}`}>Business</p>
                            <p className={`text-base md:text-lg font-black ${primaryText}`}>{currentLead?.business_name}</p>
                          </div>
                          <div className={`p-4 md:p-6 rounded-3xl border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/10'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 ${mutedText}`}>Date & Time</p>
                            <p className={`text-base md:text-lg font-black ${primaryText}`}>
                              {bookingDate && format(parseISO(bookingDate), 'MMMM d, yyyy')}
                              <span className="block text-xs md:text-sm text-violet-500 mt-0.5 md:mt-1">at {bookingTime}</span>
                            </p>
                          </div>
                        </div>

                        <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border ${isLightMode ? 'bg-zinc-50 border-zinc-100' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />
                            </div>
                            <div>
                              <h4 className={`text-xs md:text-sm font-black ${primaryText}`}>Client Information</h4>
                              <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${mutedText}`}>Required for the invite</p>
                            </div>
                          </div>
                          
                          <div className={`p-4 md:p-6 rounded-2xl border ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-white/10'} focus-within:border-violet-500/50 transition-all`}>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 ${mutedText}`}>Email Address</label>
                            <input
                              type="email"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="client@example.com"
                              className={`w-full bg-transparent border-none focus:ring-0 p-0 text-base md:text-lg font-bold ${primaryText} placeholder:opacity-20`}
                            />
                          </div>
                        </div>

                        <button
                          onClick={submitBookDemo}
                          disabled={bookingLoading || !clientEmail}
                          className="w-full py-4 md:py-6 rounded-[2rem] md:rounded-[2.5rem] bg-violet-600 hover:bg-violet-700 text-white font-black text-lg md:text-xl shadow-2xl shadow-violet-600/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bookingLoading ? <Loader2 className="w-6 h-6 md:w-7 md:h-7 animate-spin" /> : <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />}
                          BOOK DEMO NOW
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRescheduleModal && meetingToReschedule && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRescheduleModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] border overflow-hidden shadow-2xl ${
                  isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-white/10'
                }`}
              >
                {/* Header */}
                <div className="bg-zinc-900 p-6 md:p-8 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Clock className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-black tracking-tight">Reschedule Demo</h2>
                      <p className="text-[10px] opacity-50 font-black uppercase tracking-[0.2em]">Step {bookingStep} of 2</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowRescheduleModal(false);
                      setShowCancelConfirm(false);
                      setCancelSuccess(false);
                    }}
                    className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                  {cancelSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className={`text-2xl font-black mb-2 ${primaryText}`}>Booking Cancelled</h3>
                      <p className={`text-sm ${secondaryText}`}>The demo has been successfully removed from the calendar and spreadsheet.</p>
                    </motion.div>
                  ) : showCancelConfirm ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                        <XCircle className="w-10 h-10 text-red-500" />
                      </div>
                      <h3 className={`text-2xl font-black mb-2 ${primaryText}`}>Cancel this Demo?</h3>
                      <p className={`text-sm mb-8 ${secondaryText}`}>This will delete the calendar event and update the lead status to "Not Interested". This action cannot be undone.</p>
                      
                      <div className="flex gap-4 w-full max-w-xs mx-auto">
                        <button
                          onClick={handleCancelDemo}
                          disabled={actionLoading}
                          className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        >
                          Keep it
                        </button>
                      </div>
                    </motion.div>
                  ) : bookingStep === 1 ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <div className="text-left">
                          <h3 className={`text-xl md:text-2xl font-black mb-2 ${primaryText}`}>Select New Date</h3>
                          <p className={`text-sm ${secondaryText}`}>Current: {meetingToReschedule?.demo_date}</p>
                        </div>
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Demo
                        </button>
                      </div>
                      
                      <div className="p-2 md:p-4 rounded-3xl bg-zinc-900/5 dark:bg-white/5">
                        <Calendar
                          onChange={(val) => {
                            setBookingDate(format(val as Date, 'yyyy-MM-dd'));
                            setBookingStep(2);
                          }}
                          minDate={addDays(new Date(), 1)}
                          className="w-full border-none bg-transparent"
                          calendarType="gregory"
                          locale="en-US"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <button 
                          onClick={() => setBookingStep(1)}
                          className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${mutedText} hover:text-violet-500 transition-colors`}
                        >
                          <ChevronLeft className="w-4 h-4" /> Back to Date
                        </button>
                        <div className="text-right">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>New Date</p>
                          <p className={`text-sm font-black ${primaryText}`}>{format(parseISO(bookingDate), 'MMMM d, yyyy')}</p>
                        </div>
                      </div>

                      <h3 className={`text-2xl font-black text-center mb-8 ${primaryText}`}>Pick a New Time</h3>

                      {bookingLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-4" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {timesForSelectedDate.map(time => (
                            <button
                              key={time}
                              onClick={() => {
                                setBookingTime(time);
                                handleReschedule();
                              }}
                              className={`py-4 rounded-2xl font-black text-sm transition-all ${
                                isLightMode ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="pt-8 border-t border-white/5">
                        <button
                          onClick={handleCancelDemo}
                          disabled={actionLoading}
                          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${
                            isLightMode ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                          }`}
                        >
                          {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Cancel This Demo'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
