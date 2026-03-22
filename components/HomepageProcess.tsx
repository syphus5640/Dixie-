import React from 'react';
import { motion } from 'framer-motion';
import { Search, PenTool, Code, Rocket } from 'lucide-react';

export const HomepageProcess: React.FC = () => {
  const steps = [
    { icon: Search, title: "Impact Audit", desc: "We map your manual friction points and identify automation opportunities." },
    { icon: PenTool, title: "Neural Design", desc: "We craft the visual and logical blueprints for your custom ecosystem." },
    { icon: Code, title: "Integration", desc: "Engineering your autonomous agents and high-fidelity interfaces." },
    { icon: Rocket, title: "Ignition", desc: "Secure deployment with ongoing RLHF tuning and optimization." }
  ];

  return (
    <section className="px-6 relative overflow-hidden pt-20 md:pt-32 pb-4 md:pb-6">
      <div className="text-center mb-16 md:mb-24 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 md:mb-6">Built for <span className="serif-italic italic font-normal text-purple-400">speed.</span></h2>
        <p className="text-zinc-500 text-base md:text-lg font-light max-w-xl mx-auto px-4">Our proven methodology ensures a seamless transition from manual operations to an autonomous enterprise.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 relative z-10">
        {/* Horizontal connector line for desktop */}
        <div className="hidden md:block absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />
        
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[24px] md:rounded-[32px] glass border border-white/5 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-all duration-700 relative">
              <step.icon className="w-6 h-6 md:w-8 md:h-8 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3 tracking-tight">{step.title}</h4>
            <p className="text-sm text-zinc-500 leading-relaxed font-light max-w-[200px]">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};