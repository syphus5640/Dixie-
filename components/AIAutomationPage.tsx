
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Clock, 
  BarChart3, 
  ChevronDown, 
  Zap, 
  Layers, 
  Bot,
  Network,
  Mic,
  Phone,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { LunoAgentDemo } from './RetellDemo';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-zinc-300 group-hover:text-white transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-zinc-600 transition-transform duration-500 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-zinc-500 leading-relaxed font-light">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AIAutomationPageProps {
  onBookOpen?: () => void;
}

export const AIAutomationPage: React.FC<AIAutomationPageProps> = ({ onBookOpen }) => {
  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />

      <div className="max-w-7xl mx-auto pb-32 space-y-32 relative">
        {/* Hero Section */}
      <div className="relative flex flex-col items-center text-center max-w-4xl mx-auto px-6 z-10 pt-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="w-20 h-20 rounded-[24px] bg-purple-500/10 flex items-center justify-center mb-10 border border-purple-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
        >
          <BrainCircuit className="w-10 h-10 text-purple-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-8xl font-bold tracking-tighter mb-6 md:mb-8 leading-[1.1] theme-gradient-text"
        >
          Architecting <br />
          <span className="serif-italic font-normal italic text-purple-400">Autonomous Logic.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-zinc-400 leading-relaxed font-light max-w-2xl px-4"
        >
          Luno Studios engineers custom AI solutions that breathe intelligence into business operations. From specialized voice agents to end-to-end workflow automations, we build the systems that drive your evolution.
        </motion.p>
      </div>

      {/* Specialty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 px-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass p-8 md:p-12 rounded-[40px] md:rounded-[56px] border border-white/5 relative group hover:bg-white/[0.04] transition-all duration-700 h-full overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full" />
          <Bot className="w-10 h-10 md:w-12 md:h-12 text-purple-400 mb-6 md:mb-8" />
          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 tracking-tight">AI Receptionists</h3>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-light mb-6 md:mb-8">
            Our flagship specialty. Human-like voice agents that handle scheduling, intake, and sales with absolute precision. No hold times, no script fatigue—just perfect communication.
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4">
             <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Multilingual</div>
             <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">24/7 Availability</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass p-8 md:p-12 rounded-[40px] md:rounded-[56px] border border-white/5 relative group hover:bg-white/[0.04] transition-all duration-700 h-full overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full" />
          <Network className="w-10 h-10 md:w-12 md:h-12 text-purple-400 mb-6 md:mb-8" />
          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 tracking-tight">Custom AI Solutions</h3>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-light mb-6 md:mb-8">
            We solve the unique friction points in your enterprise. Whether it's automated content generation, intelligent document processing, or predictive analytics, if it can be mapped, we can automate it.
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4">
             <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">ERP Sync</div>
             <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full glass border border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agentic Workflows</div>
          </div>
        </motion.div>
      </div>

      {/* How it Works Section - Moved above the demo */}
      <div className="px-6 space-y-20 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-bold tracking-tight mb-6">How It Works</h2>
          <p className="text-zinc-500 leading-relaxed font-light">
            Our deployment process is designed for non-disruptive integration and immediate operational impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {[
            { 
              step: "01", 
              title: "Discovery", 
              desc: "We audit your manual workflows to identify friction points ripe for neural replacement.",
              icon: Zap
            },
            { 
              step: "02", 
              title: "Architecture", 
              desc: "We build bespoke LLM prompts and RAG (Retrieval) databases specific to your business data.",
              icon: Cpu
            },
            { 
              step: "03", 
              title: "Integration", 
              desc: "The AI agent is hooked into your existing stack (CRM, Calendar, VoIP) via secure APIs.",
              icon: Layers
            },
            { 
              step: "04", 
              title: "Evolution", 
              desc: "Continuous monitoring and RLHF ensures your AI gets smarter with every interaction.",
              icon: Activity
            }
          ].map((item, i) => (
            <div key={i} className="relative">
              <div className="text-[64px] font-bold text-[var(--text-primary)] opacity-5 leading-none mb-4 font-mono">{item.step}</div>
              <item.icon className="w-8 h-8 text-purple-500/50 mb-6" />
              <h4 className="text-xl font-bold mb-3 tracking-tight">{item.title}</h4>
              <p className="text-sm text-zinc-500 leading-relaxed font-light max-w-[200px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Demo Showcase */}
      <div className="px-6 py-4">
        <div className="glass rounded-[32px] md:rounded-[48px] border border-white/5 p-6 md:p-12 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full -z-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="space-y-8 md:space-y-10">
              <div className="space-y-3 md:space-y-4">
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-purple-400">Enterprise Experience</span>
                <h3 className="text-2xl md:text-4xl font-bold tracking-tighter">Human Intelligence, <br />Digital Speed.</h3>
                <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed max-w-sm">
                  Experience the precision of a Luno-orchestrated agent. Our voice interfaces operate with high-fidelity emotional resonance.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[var(--text-primary)] text-sm mb-0.5">24/7 Availability</h5>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      Infinite scalability. Your business never sleeps.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[var(--text-primary)] text-sm mb-0.5">Live Telemetry</h5>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      Access transcripts and metrics the moment calls end.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center">
              <LunoAgentDemo />
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-6 pb-24 space-y-20">
        <div className="max-w-3xl">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-purple-400 mb-4">Neural Knowledge Base</h3>
          <h2 className="text-4xl font-bold tracking-tight mb-8">Frequently Asked Questions</h2>
        </div>

        <div className="glass rounded-[32px] md:rounded-[48px] border border-white/5 p-6 md:p-12">
          {[
            {
              q: "Can the AI Receptionist actually handle complex scheduling?",
              a: "Yes. Our agents integrate directly with tools like Google Calendar, Calendly, and enterprise CRM systems. They understand context—if a user needs a specific appointment type or needs to reschedule, the AI handles the logic just like a human assistant would."
            },
            {
              q: "How long does it take to deploy a custom solution?",
              a: "Standard AI Receptionists can be live within 2-3 weeks. More complex, custom end-to-end automations typically take 4-8 weeks, depending on the number of API integrations and the depth of the data training required."
            },
            {
              q: "Is our business data secure?",
              a: "Security is non-negotiable. We use enterprise-grade encryption for all data in transit and at rest. We can deploy systems that comply with HIPAA, SOC2, and GDPR requirements depending on your needs."
            },
            {
              q: "Does it work with my current phone system?",
              a: "Almost certainly. We can provide new dedicated numbers, or integrate with your existing VoIP infrastructure (Twilio, RingCentral, 8x8) via SIP trunking or simple call forwarding."
            },
            {
              q: "Can the AI handle multiple languages?",
              a: "Yes. Our systems support over 40+ languages with native accents. They can even detect the caller's language automatically and switch during the conversation."
            }
          ].map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>

      {/* Ready to Launch Section */}
      <section className="px-6 pb-24 relative z-10">
        <div className="glass p-10 md:p-24 rounded-[40px] md:rounded-[64px] border border-white/5 relative overflow-hidden text-center flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/10 opacity-50" />
          
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 md:mb-10 shadow-inner relative z-10">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
          </div>

          <h2 className="text-3xl md:text-7xl font-bold tracking-tighter mb-6 md:mb-8 relative z-10 theme-gradient-text">
            Ready to <span className="serif-italic italic text-purple-400">Automate?</span>
          </h2>
          
          <p className="text-zinc-400 text-base md:text-xl max-w-2xl mb-10 md:mb-12 relative z-10 leading-relaxed font-light px-4">
            Your enterprise deserves the efficiency of autonomous logic. Let's engineer your evolution together.
          </p>

          <button 
            onClick={onBookOpen}
            className="px-8 md:px-12 py-4 md:py-6 theme-button-primary rounded-full font-bold hover:bg-purple-500 hover:text-white transition-all flex items-center gap-3 group shadow-2xl relative z-10 active:scale-95 text-sm md:text-base"
          >
            Book Consultation
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
      </div>
    </div>
  );
};
