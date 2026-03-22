
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full flex items-center justify-center gap-2 pb-12 text-[12px] font-medium text-[#454547] animate-fadeIn">
      <span>© 2025</span>
      <span>—</span>
      <a 
        href="https://x.com/alcovenews" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[#b5743f] hover:text-[#fecc86] transition-colors duration-400"
      >
        @AlcoveNews
      </a>
    </footer>
  );
};
