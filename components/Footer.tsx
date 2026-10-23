import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current text-[#dfcdc3]/60" aria-hidden="true">
          <circle cx="50" cy="31" r="9" />
          <circle cx="69" cy="69" r="9" />
          <circle cx="31" cy="69" r="9" />
        </svg>
        <span>The Users Are Real · Synthetic Participant Video Studio</span>
      </div>
      <div className="font-mono text-[11px] text-[#dfcdc3]/40">
        British Accent · Limited Movement · Google Veo 3.1
      </div>
    </footer>
  );
};
