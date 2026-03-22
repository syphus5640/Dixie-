
import React from 'react';
import { motion } from 'framer-motion';

export const HomepageStats: React.FC = () => {
  return (
    <section className="px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: "Automation Ratio", value: "92%", desc: "Lead response & intake handled autonomously." },
            { label: "Neural Latency", value: "<1s", desc: "Sub-second response time for voice agents." },
            { label: "Performance Score", value: "99+", desc: "Near-perfect lighthouse audit for every launch." },
            { label: "Partner Scaling", value: "4.5x", desc: "Average increase in operational capacity." }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center md:text-left group"
            >
              <h4 className="text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent group-hover:text-purple-400 transition-colors">
                {stat.value}
              </h4>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">{stat.label}</p>
              <p className="text-xs text-zinc-600 leading-relaxed font-light max-w-[180px] mx-auto md:mx-0">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
