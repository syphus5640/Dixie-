
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, Trash2, Edit3, Send, MessageSquarePlus, Loader2, Filter } from 'lucide-react';
import { UserProfile, Review } from '../src/App';
import { supabase } from '../lib/supabaseClient';

interface ReviewsPageProps {
  onBookOpen: () => void;
  currentUser: UserProfile | null;
  onLoginRequest: () => void;
  isLightMode?: boolean;
}

interface MergedReview extends Review {
  profiles?: UserProfile;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ onBookOpen, currentUser, onLoginRequest, isLightMode = false }) => {
  const [reviews, setReviews] = useState<MergedReview[]>([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      setReviews(data && Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching reviews:", err);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const savedSession = localStorage.getItem('luno_session');
      const currentSession = savedSession ? JSON.parse(savedSession) : null;
      const token = currentSession?.access_token;

      if (!token) throw new Error("Authentication required.");

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          content: content.trim(),
          review_id: isEditing || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Submission failure.");
      }

      setContent('');
      setRating(5);
      setIsEditing(null);
      fetchReviews();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (review: MergedReview) => {
    setIsEditing(review.id);
    setContent(review.content);
    setRating(review.rating);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (reviewId: string) => {
    console.log("[CLIENT] Attempting to delete review:", reviewId);
    
    try {
      const savedSession = localStorage.getItem('luno_session');
      const currentSession = savedSession ? JSON.parse(savedSession) : null;
      const token = currentSession?.access_token;

      if (!token) {
        console.error("[CLIENT] No token found in localStorage");
        throw new Error("Authentication required.");
      }

      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      console.log("[CLIENT] Delete response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Deletion failure.");
      }

      if (data.affected === 0) {
        setErrorMessage("Review could not be deleted. You may not have permission or it may have already been removed.");
      }

      setShowDeleteConfirm(null);
      fetchReviews();
    } catch (err: any) {
      console.error("[CLIENT] Delete error:", err);
      setErrorMessage(err.message);
    }
  };

  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return reviews;
    return reviews.filter(r => r.rating === filterRating);
  }, [reviews, filterRating]);

  const filterOptions = [
    { label: 'All', value: 'all' as const },
    { label: '5 Stars', value: 5 },
    { label: '4 Stars', value: 4 },
    { label: '3 Stars', value: 3 },
    { label: '2 Stars', value: 2 },
    { label: '1 Star', value: 1 },
  ];

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />

      <div className="max-w-7xl mx-auto pb-32 space-y-16 relative">

      <div className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-6 pt-0 z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.1] ${isLightMode ? 'text-black' : 'bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent'}`}
        >
          Community <br />
          <span className="serif-italic font-normal italic text-purple-400">Voices.</span>
        </motion.h1>
        
        <p className={`text-base md:text-xl leading-relaxed font-light max-w-2xl ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Real feedback from our partners at the forefront of the AI revolution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-6 relative z-10">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="lg:sticky lg:top-32 space-y-8">
            {!currentUser ? (
              <div className={`p-8 rounded-[32px] md:rounded-[40px] border text-center backdrop-blur-2xl shadow-2xl transition-all duration-700 ${
                isLightMode 
                  ? 'bg-white/40 border-white/20 shadow-zinc-200/20' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <MessageSquarePlus className="w-10 h-10 md:w-12 md:h-12 text-zinc-600 mx-auto mb-6" />
                <h3 className={`text-xl font-bold mb-4 ${isLightMode ? 'text-black' : 'text-white'}`}>Share your experience</h3>
                <p className={`text-sm mb-8 leading-relaxed ${isLightMode ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  Join the conversation. Please sign in to leave a review for Luno Studios.
                </p>
                <button 
                  onClick={onLoginRequest}
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}
                >
                  Sign In to Review
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-8 rounded-[32px] md:rounded-[40px] border backdrop-blur-2xl shadow-2xl transition-all duration-700 ${
                  isLightMode 
                    ? 'bg-white/40 border-white/20 shadow-zinc-200/20' 
                    : 'bg-white/5 border-purple-500/20'
                }`}
              >
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                  {isEditing ? <Edit3 className="w-5 h-5 text-purple-400" /> : <MessageSquarePlus className="w-5 h-5 text-purple-400" />}
                  {isEditing ? 'Edit Review' : 'New Review'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-3">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-1 transition-colors ${rating >= star ? 'text-purple-400' : (isLightMode ? 'text-zinc-300' : 'text-zinc-700')}`}
                        >
                          <Star className={`w-6 h-6 ${rating >= star ? 'fill-purple-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-3">Feedback</label>
                    <textarea
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tell us about your transformation..."
                      className={`w-full h-32 border rounded-2xl p-4 focus:outline-none focus:border-purple-500 transition-colors resize-none text-sm leading-relaxed ${isLightMode ? 'bg-white/60 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-grow py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'} disabled:opacity-50`}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Post Review')}
                      {!isSubmitting && <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsEditing(null);
                          setContent('');
                          setRating(5);
                        }}
                        className={`px-6 py-4 rounded-2xl font-bold border transition-all ${isLightMode ? 'border-zinc-200 hover:bg-zinc-50 text-zinc-600' : 'border-white/10 hover:bg-white/5 text-zinc-400'}`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {/* Rating Filter UI */}
            <div className={`p-6 rounded-[32px] border backdrop-blur-2xl shadow-xl transition-all duration-700 ${
              isLightMode 
                ? 'bg-white/40 border-white/20' 
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-2 mb-6 px-2">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Filter Feedback</span>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setFilterRating(opt.value)}
                    className={`flex-grow lg:w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] md:text-xs font-bold transition-all group ${
                      filterRating === opt.value 
                        ? 'bg-purple-500 text-white shadow-lg' 
                        : (isLightMode ? 'text-zinc-700 hover:bg-white/60' : 'text-zinc-500 hover:text-white hover:bg-white/10')
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.value !== 'all' && <Star className={`w-3.5 h-3.5 ${filterRating === opt.value ? 'fill-white' : 'group-hover:text-purple-400'}`} />}
                      {opt.label}
                    </span>
                    {filterRating === opt.value && <motion.div layoutId="active-filter" className="w-1.5 h-1.5 rounded-full bg-white hidden lg:block" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-8 space-y-8 order-1 lg:order-2">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8 min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className={`p-8 md:p-10 rounded-[32px] md:rounded-[48px] border relative group transition-all duration-700 backdrop-blur-2xl shadow-2xl ${
                        isLightMode 
                          ? 'bg-white/40 border-white/20 shadow-zinc-200/20 hover:bg-white/60' 
                          : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 md:w-4 md:h-4 ${i <= review.rating ? 'fill-purple-400 text-purple-400' : (isLightMode ? 'text-zinc-300' : 'text-zinc-800')}`} 
                            />
                          ))}
                        </div>
                        {currentUser?.id === review.user_id && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEdit(review)}
                              className="p-2 glass border border-white/5 rounded-xl hover:bg-purple-500/20 text-zinc-500 hover:text-purple-400 transition-all"
                              title="Edit Review"
                            >
                              <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(review.id)}
                              className="p-2 glass border border-white/5 rounded-xl hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
                              title="Delete Review"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className={`text-lg md:text-xl leading-relaxed italic serif-italic mb-10 ${isLightMode ? 'text-black' : 'text-zinc-200'}`}>
                        "{review.content}"
                      </p>

                      <div className={`flex items-center gap-4 pt-8 border-t ${isLightMode ? 'border-zinc-200' : 'border-white/10'}`}>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 font-bold text-purple-400">
                          {review.profiles?.first_name?.[0] || 'U'}
                        </div>
                        <div>
                          <h4 className={`text-xs md:text-sm font-bold flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                            {review.profiles?.first_name || 'Anonymous'} {review.profiles?.last_name || ''}
                          </h4>
                          <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {review.profiles?.business_name || 'Private Member'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <Star className="w-12 h-12 text-zinc-800 mb-6 opacity-20" />
                    <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-black' : 'text-white'}`}>No Matching Voices</h3>
                    <p className="text-zinc-500 text-sm">We haven't received any {filterRating} star reviews yet.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl text-center ${isLightMode ? 'bg-white border-red-500/20' : 'border-red-500/20'}`}
            >
              <div className="p-8 pt-12 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Delete Review?</h3>
                <p className={`text-sm leading-relaxed max-w-[280px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  This action cannot be undone. Your feedback will be permanently removed from the Luno ecosystem.
                </p>
              </div>

              <div className="p-8 space-y-3">
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="w-full py-5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg"
                >
                  Confirm Deletion
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`w-full py-5 rounded-2xl font-bold transition-all ${isLightMode ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Message Modal */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-md glass rounded-[40px] border overflow-hidden shadow-2xl text-center ${isLightMode ? 'bg-white border-red-500/20' : 'border-red-500/20'}`}
            >
              <div className="p-8 pt-12 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                  <Star className="w-10 h-10" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>System Alert</h3>
                <p className={`text-sm leading-relaxed max-w-[280px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {errorMessage}
                </p>
              </div>

              <div className="p-8">
                <button 
                  onClick={() => setErrorMessage(null)}
                  className={`w-full py-5 rounded-2xl font-bold transition-all ${isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'}`}
                >
                  Acknowledged
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
