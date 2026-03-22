
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, RefreshCcw, ScrollText, AlertTriangle } from 'lucide-react';

export type PolicyType = 'privacy' | 'terms' | 'refund' | 'service' | 'disclaimer';

interface PolicyModalProps {
  policyId: PolicyType | null;
  onClose: () => void;
  isLightMode?: boolean;
}

const POLICY_CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '02/09/2026',
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p>Luno Studios is committed to protecting your privacy. We collect only the information necessary to provide our services, including website development and AI receptionist solutions.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">What We Collect:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name, email address, and phone number (form submissions)</li>
            <li>Project details and information you voluntarily provide</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">How We Use Your Information:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>To respond to inquiries</li>
            <li>To deliver website and AI receptionist services</li>
            <li>To communicate project updates, service notices, and billing-related information</li>
          </ul>
        </div>
        <p>We do not sell or share your personal information with third parties except for essential service providers (such as payment processors or infrastructure providers) required to deliver our services.</p>
        <p className="pt-4 border-t border-white/5">For privacy-related questions, contact <strong>info@lunostudios.com</strong>.</p>
      </div>
    )
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: '02/09/2026',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p>By using the Luno Studios website or purchasing our services, you agree to the following terms:</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Service Use:</h4>
          <p>Luno Studios provides website design and AI receptionist solutions. Clients agree to provide accurate, complete, and timely information necessary for successful service delivery and system configuration.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Ownership:</h4>
          <p>Final deliverables belong to the client once the project is paid in full. Luno Studios reserves the right to display completed work in its portfolio unless the client requests otherwise in writing.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Usage Limits & Excessive Usage:</h4>
          <p>Our services are designed to accommodate normal fluctuations in usage. We recognize that call volume and system usage may be volatile and subject to short-term surges caused by promotions, seasonal demand, or other temporary factors. Occasional spikes in usage alone will not be considered excessive.</p>
          <p className="mt-2">Excessive usage is defined as consistent, repeated usage levels that materially exceed the expected or normal usage associated with a client’s selected plan, occurring multiple times per week over an ongoing period, rather than isolated or temporary surges.</p>
          <p className="mt-2">If excessive usage is identified, Luno Studios reserves the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Apply additional usage-based fees</li>
            <li>Require an upgrade to a higher-tier plan</li>
            <li>Adjust pricing to reflect sustained increases in system usage</li>
          </ul>
          <p className="mt-2">We will make reasonable efforts to notify clients when usage approaches or exceeds acceptable thresholds.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Authorized Phone Numbers:</h4>
          <p>AI receptionist services are authorized only for the phone number(s) agreed upon during onboarding or outlined in the applicable service agreement.</p>
          <p className="mt-2">Clients may not add, forward, duplicate, redirect, or otherwise connect the AI receptionist to additional phone numbers, extensions, call flows, or communication channels without prior written notice to and approval from Luno Studios.</p>
        </div>
      </div>
    )
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: '02/09/2026',
    icon: RefreshCcw,
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Deposits:</h4>
          <p>All projects require a deposit to begin work. Deposits are non-refundable once work has started.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Cancellation Policy:</h4>
          <p>Clients may cancel services only after a minimum of 4 weeks of active service usage. Once eligible, cancellations take effect immediately upon notice.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Refund Policy:</h4>
          <p>Clients may request a refund within 5 days of payment if no major deliverables have been completed and they are not satisfied with the service. After 5 days, no refunds will be issued.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Subscriptions:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cancellation is permitted only after 4 weeks of service</li>
            <li>The current billing cycle is non-refundable</li>
            <li>Service continues until cancellation becomes effective</li>
          </ul>
        </div>
      </div>
    )
  },
  service: {
    title: 'Service Agreement Policy',
    lastUpdated: '02/09/2026',
    icon: ScrollText,
    content: (
      <div className="space-y-4">
        <p>This policy outlines how Luno Studios collaborates with clients throughout active projects and ongoing services.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Project Timelines:</h4>
          <p>Timelines depend on project scope, complexity, and client responsiveness. Delays in providing content, approvals, or feedback may extend delivery timelines.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Revisions:</h4>
          <p>Each project includes a predefined number of revisions based on the selected plan. Additional revisions or scope changes may incur extra fees.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Client Responsibilities:</h4>
          <p>Clients are responsible for providing accurate information, brand assets, approvals, and feedback in a timely manner to avoid delays or disruptions.</p>
        </div>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Communication:</h4>
          <p>All official communication must occur through agreed-upon channels such as email or approved project management tools.</p>
        </div>
      </div>
    )
  },
  disclaimer: {
    title: 'Disclaimer',
    lastUpdated: '02/09/2026',
    icon: AlertTriangle,
    content: (
      <div className="space-y-4">
        <p>All services provided by Luno Studios are offered “as is” without warranties or guarantees of uninterrupted or error-free performance.</p>
        <div>
          <h4 className="font-bold text-purple-400 mb-1 uppercase text-[10px] tracking-widest">Luno Studios is not responsible for:</h4>
          <ul className="list-disc pl-5 space-y-1">
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

export const PolicyModal: React.FC<PolicyModalProps> = ({ policyId, onClose, isLightMode = false }) => {
  const policy = policyId ? POLICY_CONTENT[policyId] : null;

  return (
    <AnimatePresence>
      {policy && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`w-full max-w-2xl glass rounded-[40px] border relative shadow-2xl overflow-hidden my-auto ${
              isLightMode ? 'bg-white border-zinc-200' : 'border-white/10'
            }`}
          >
            {/* Header */}
            <div className={`p-8 border-b flex justify-between items-start ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <policy.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{policy.title}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Last Updated: {policy.lastUpdated}</p>
                </div>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-zinc-100 text-zinc-400' : 'hover:bg-white/10 text-zinc-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className={`p-8 md:p-10 max-h-[60vh] overflow-y-auto scrollbar-thin text-sm leading-relaxed ${isLightMode ? 'text-zinc-800' : 'text-zinc-400'}`}>
              {policy.content}
            </div>

            {/* Footer */}
            <div className={`p-6 border-t text-center ${isLightMode ? 'border-zinc-100' : 'border-white/5'}`}>
              <button 
                onClick={onClose}
                className={`px-8 py-3 rounded-full font-bold text-xs transition-all uppercase tracking-widest ${
                  isLightMode ? 'bg-black text-white' : 'bg-white text-black hover:bg-purple-500 hover:text-white'
                }`}
              >
                Close Document
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
