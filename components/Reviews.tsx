import React, { useEffect, useState } from 'react';
import { Star, Loader2, Edit3 } from 'lucide-react';
import { Review, UserProfile } from '../src/App';
import { supabase } from '../lib/supabaseClient';

interface MergedReview extends Review {
  profiles?: UserProfile;
}

export const Reviews: React.FC<{ isLightMode?: boolean }> = ({ isLightMode = false }) => {
  const [reviews, setReviews] = useState<MergedReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLatest = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data: MergedReview[] = await res.json();
      
      // Filter for only 5-star reviews
      const fiveStarReviews = (data || []).filter(r => r.rating === 5);
      
      // Sort by newest first and take top 3
      const latestFiveStar = fiveStarReviews
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      setReviews(latestFiveStar);
    } catch (err: any) {
      console.error("Error fetching reviews for homepage:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const isReviewEdited = (review: Review) => {
    if (!review.updated_at) return false;
    const created = new Date(review.created_at).getTime();
    const updated = new Date(review.updated_at).getTime();
    return (updated - created) > 2000;
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Synchronizing...</span>
      </div>
    );
  }

  // If no 5-star reviews, do not display anything
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="pt-4 md:pt-6 pb-16 md:pb-24 relative">
      <div className="flex flex-col items-center text-center mb-12 md:mb-16 px-4">
        <span className="text-[9px] md:text-[10px] font-bold tracking-[0.3em] text-blue-400 uppercase mb-3 md:mb-4">Partner Feedback</span>
        <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Recent Transformations</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
        {reviews.map((item) => (
          <div key={item.id} className={`p-6 md:p-8 rounded-[32px] md:rounded-[40px] relative group md:hover:-translate-y-2 transition-all duration-500 border flex flex-col justify-between h-full ${
            isLightMode 
              ? 'bg-zinc-100/40 backdrop-blur-xl border-zinc-200 shadow-xl' 
              : 'glass border-white/5'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      className={`w-3 h-3 ${star <= item.rating ? 'fill-purple-400 text-purple-400' : (isLightMode ? 'text-zinc-300' : 'text-zinc-800')}`} 
                    />
                  ))}
                </div>
                {isReviewEdited(item) && (
                  <div className={`text-[8px] font-bold uppercase tracking-[0.2em] italic flex items-center gap-1 opacity-60 ${isLightMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    <Edit3 className="w-2 h-2" />
                    Edited
                  </div>
                )}
              </div>
              <p className={`leading-relaxed text-sm italic serif-italic mb-8 ${isLightMode ? 'text-zinc-800' : 'text-zinc-300'}`}>
                "{item.content}"
              </p>
            </div>
            
            <div className={`flex items-center gap-3 pt-6 border-t ${isLightMode ? 'border-zinc-200' : 'border-white/5'}`}>
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-purple-400">
                {item.profiles?.first_name?.[0] || 'U'}
              </div>
              <div>
                <h5 className={`text-xs font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>{item.profiles?.first_name || 'User'} {item.profiles?.last_name?.[0] || ''}.</h5>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{item.profiles?.business_name || 'Private Partner'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};