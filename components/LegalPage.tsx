
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, FileText, RefreshCcw, ScrollText, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export type PolicyType = 'privacy' | 'terms' | 'refund' | 'service' | 'disclaimer';

const POLICY_CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '02/09/2026',
    icon: Shield,
    content: (
      <div className="space-y-6">
        <p>Luno Studios is committed to protecting your privacy. We collect only the information necessary to provide our services, including website development and AI receptionist solutions.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">What We Collect:</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Name, email address, and phone number (form submissions)</li>
            <li>Project details and information you voluntarily provide</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">How We Use Your Information:</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>To respond to inquiries</li>
            <li>To deliver website and AI receptionist services</li>
            <li>To communicate project updates, service notices, and billing-related information</li>
          </ul>
        </div>
        <p>We do not sell or share your personal information with third parties except for essential service providers (such as payment processors or infrastructure providers) required to deliver our services.</p>
        <p className="pt-6 border-t border-white/5">For privacy-related questions, contact <strong>info@lunostudios.com</strong>.</p>
      </div>
    )
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: '02/09/2026',
    icon: FileText,
    content: (
      <div className="space-y-6">
        <p>By using the Luno Studios website or purchasing our services, you agree to the following terms:</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Service Use:</h4>
          <p>Luno Studios provides website design and AI receptionist solutions. Clients agree to provide accurate, complete, and timely information necessary for successful service delivery and system configuration.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Ownership:</h4>
          <p>Final deliverables belong to the client once the project is paid in full. Luno Studios reserves the right to display completed work in its portfolio unless the client requests otherwise in writing.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Usage Limits & Excessive Usage:</h4>
          <p>Our services are designed to accommodate normal fluctuations in usage. We recognize that call volume and system usage may be volatile and subject to short-term surges caused by promotions, seasonal demand, or other temporary factors. Occasional spikes in usage alone will not be considered excessive.</p>
          <p className="mt-2">Excessive usage is defined as consistent, repeated usage levels that materially exceed the expected or normal usage associated with a client’s selected plan, occurring multiple times per week over an ongoing period, rather than isolated or temporary surges.</p>
          <p className="mt-2">If excessive usage is identified, Luno Studios reserves the right to apply additional usage-based fees or require an upgrade to a higher-tier plan.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Authorized Phone Numbers:</h4>
          <p>AI receptionist services are authorized only for the phone number(s) agreed upon during onboarding or outlined in the applicable service agreement.</p>
          <p className="mt-2">Clients may not add, forward, duplicate, redirect, or otherwise connect the AI receptionist to additional phone numbers without prior written notice to Luno Studios.</p>
        </div>
      </div>
    )
  },
  refund: {
    title: 'Refund & Cancellation',
    lastUpdated: '02/09/2026',
    icon: RefreshCcw,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Deposits:</h4>
          <p>All projects require a deposit to begin work. Deposits are non-refundable once work has started.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Cancellation Policy:</h4>
          <p>Clients may cancel services only after a minimum of 4 weeks of active service usage. Once eligible, cancellations take effect immediately upon notice.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Refund Policy:</h4>
          <p>Clients may request a refund within 5 days of payment if no major deliverables have been completed and they are not satisfied with the service. After 5 days, no refunds will be issued.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Subscriptions:</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Cancellation is permitted only after 4 weeks of service</li>
            <li>The current billing cycle is non-refundable</li>
            <li>Service continues until cancellation becomes effective</li>
          </ul>
        </div>
      </div>
    )
  },
  service: {
    title: 'Service Agreement',
    lastUpdated: '02/09/2026',
    icon: ScrollText,
    content: (
      <div className="space-y-6">
        <p>This policy outlines how Luno Studios collaborates with clients throughout active projects and ongoing services.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Project Timelines:</h4>
          <p>Timelines depend on project scope, complexity, and client responsiveness. Delays in providing content, approvals, or feedback may extend delivery timelines.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Revisions:</h4>
          <p>Each project includes a predefined number of revisions based on the selected plan. Additional revisions or scope changes may incur extra fees.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Client Responsibilities:</h4>
          <p>Clients are responsible for providing accurate information, brand assets, approvals, and feedback in a timely manner to avoid delays or disruptions.</p>
        </div>
      </div>
    )
  },
  disclaimer: {
    title: 'Disclaimer',
    lastUpdated: '02/09/2026',
    icon: AlertTriangle,
    content: (
      <div className="space-y-6">
        <p>All services provided by Luno Studios are offered “as is” without warranties or guarantees of uninterrupted or error-free performance.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-2 uppercase text-[10px] tracking-widest">Luno Studios is not responsible for:</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Downtime caused by hosting, telephony, or infrastructure providers</li>
            <li>Errors or limitations caused by third-party tools, plugins, or integrations</li>
            <li>Business outcomes, revenue impact, or losses resulting from the use of websites or AI services</li>
          </ul>
        </div>
        <p className="mt-4 font-medium">Clients are solely responsible for how they use the services and tools provided.</p>
      </div>
    )
  }
};

interface LegalPageProps {
  isLightMode?: boolean;
}

export const LegalPage: React.FC<LegalPageProps> = ({ isLightMode = false }) => {
  const navigate = useNavigate();
  const { policyId } = useParams<{ policyId: PolicyType }>();
  const policy = policyId ? POLICY_CONTENT[policyId] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [policyId]);

  if (!policy) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Document Not Found</h2>
        <button onClick={() => navigate('/')} className="text-purple-400 hover:underline">Return to Home</button>
      </div>
    );
  }

  const Icon = policy.icon;

  return (
    <div className="relative w-full">
      {/* Top Ambient Glow - Moved outside max-w-7xl to prevent clipping and shifted up to avoid box effect */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[200vw] h-[1100px] bg-[radial-gradient(ellipse_at_center_top,rgba(139,92,246,0.15)_0%,transparent_50%)] blur-[120px] -z-10 pointer-events-none opacity-60" />
      
      <div className="max-w-4xl mx-auto pb-32 pt-10 px-6 relative z-10">
      
      <motion.button 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-12 transition-colors group ${isLightMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-500 hover:text-white'}`}
      >
        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
        Back
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-[32px] md:rounded-[48px] border overflow-hidden shadow-2xl ${
          isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'
        }`}
      >
        {/* Header */}
        <div className={`p-6 md:p-12 border-b flex flex-col md:flex-row md:items-center justify-between gap-6 ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-xl">
              <Icon className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-5xl font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{policy.title}</h1>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 md:mt-2">Document Version: {policy.lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-6 md:p-16 text-sm md:text-lg leading-relaxed font-light ${isLightMode ? 'text-zinc-800' : 'text-zinc-400'}`}>
          {policy.content}
        </div>

        {/* Footer Shortcut */}
        <div className={`p-6 md:p-8 border-t flex flex-col md:flex-row items-center justify-between gap-6 ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
          <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500">© 2025 Luno Studios Collective.</p>
          <button 
            onClick={() => navigate('/')}
            className={`w-full md:w-auto px-8 py-3 rounded-full font-bold text-[10px] transition-all uppercase tracking-widest shadow-xl active:scale-95 ${
              isLightMode ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-purple-500 hover:text-white'
            }`}
          >
            Return to Evolution
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
};
