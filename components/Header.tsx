import React, { useState, useEffect } from 'react';
import { Cloud, Menu, X } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeView: 'home' | 'studio' | 'faq';
  onSelectView: (view: 'home' | 'studio' | 'faq') => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  candidateName?: string;
  clipsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  currentUser,
  onOpenAuth,
  candidateName = 'Hermione',
  clipsCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Auto-close mobile drawer if window expands to desktop viewport
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when full-screen mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Support ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#3c4245] border-b border-[#719192]/40 shadow-xs transition-all">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-12 h-11 sm:h-14 flex items-center justify-between">
        {/* Brand Wordmark with Home Action (Very compact on mobile) */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              onSelectView('home');
              setIsMobileMenuOpen(false);
            }}
            className="inline-flex items-center justify-center text-[#dfcdc3]/80 hover:text-[#dfcdc3] transition-colors cursor-pointer shrink-0"
            aria-label="Go to Home"
          >
            <svg viewBox="0 0 100 100" className="w-4 h-4 sm:w-5 sm:h-5 fill-current" aria-hidden="true">
              <circle cx="50" cy="31" r="9" />
              <circle cx="69" cy="69" r="9" />
              <circle cx="31" cy="69" r="9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectView('home');
              setIsMobileMenuOpen(false);
            }}
            className="hover:text-white transition-colors cursor-pointer font-medium tracking-tight text-xs sm:text-sm text-[#dfcdc3] truncate"
          >
            The Users Are Real
          </button>
        </div>

        {/* Desktop Navigation Links & Account */}
        <div className="hidden md:flex items-center gap-5 sm:gap-7 text-xs font-mono">
          <button
            type="button"
            onClick={() => onSelectView('home')}
            className={`transition-colors cursor-pointer ${
              activeView === 'home'
                ? 'text-[#dfcdc3] font-semibold border-b border-[#dfcdc3] pb-0.5'
                : 'text-[#dfcdc3]/70 hover:text-[#dfcdc3]'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onSelectView('studio')}
            className={`transition-colors cursor-pointer ${
              activeView === 'studio'
                ? 'text-[#dfcdc3] font-semibold border-b border-[#dfcdc3] pb-0.5'
                : 'text-[#dfcdc3]/70 hover:text-[#dfcdc3]'
            }`}
          >
            Video Generator
          </button>

          <button
            type="button"
            onClick={() => onSelectView('faq')}
            className={`transition-colors cursor-pointer ${
              activeView === 'faq'
                ? 'text-[#dfcdc3] font-semibold border-b border-[#dfcdc3] pb-0.5'
                : 'text-[#dfcdc3]/70 hover:text-[#dfcdc3]'
            }`}
          >
            FAQ
          </button>

          {/* Account & Persistent Cloud Storage */}
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 py-1 px-2.5 bg-[#5f6769]/50 hover:bg-[#5f6769] border border-[#719192]/60 hover:border-[#dfcdc3] rounded-lg text-xs transition-colors cursor-pointer"
              title={`Linked to ${currentUser.email || currentUser.displayName || 'your account'}`}
            >
              <div className="w-5 h-5 rounded-full bg-[#719192] flex items-center justify-center text-[10px] font-bold text-[#3c4245] overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <span className="max-w-[100px] sm:max-w-[140px] truncate font-sans text-xs">
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'Account'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Cloud Synced" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-[#5f6769]/30 hover:bg-[#5f6769]/70 border border-[#719192]/40 hover:border-[#dfcdc3] rounded-lg text-xs text-[#dfcdc3] transition-colors cursor-pointer"
              title="Sign in to link and persist your videos"
            >
              <Cloud className="w-3.5 h-3.5 text-[#719192]" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile Navigation Toggle (Very small, sleek button in sticky header) */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 bg-[#5f6769]/50 hover:bg-[#5f6769] border border-[#719192]/60 hover:border-[#dfcdc3] rounded-xs text-[#dfcdc3] transition-colors cursor-pointer"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Navigation Overlay with 'X' to close */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[100] w-full h-[100dvh] bg-[#3c4245] flex flex-col justify-between p-5 overflow-y-auto animate-in fade-in duration-200 md:hidden"
        >
          {/* Top Bar with Brand Wordmark & 'X' Close Button */}
          <div className="flex items-center justify-between pb-4 border-b border-[#719192]/40">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 100 100" className="w-5 h-5 fill-[#dfcdc3]" aria-hidden="true">
                <circle cx="50" cy="31" r="9" />
                <circle cx="69" cy="69" r="9" />
                <circle cx="31" cy="69" r="9" />
              </svg>
              <span className="font-medium text-sm text-[#dfcdc3] tracking-tight">The Users Are Real</span>
            </div>

            {/* Dedicated prominent 'X' button to close full-screen nav */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-1 text-[#dfcdc3] hover:text-white bg-[#525a5c]/60 hover:bg-[#525a5c] border border-[#719192]/60 hover:border-[#dfcdc3] rounded-xs transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Links - Large, touch-friendly font-mono editorial links */}
          <div className="py-8 flex flex-col gap-3 font-mono">
            <button
              type="button"
              onClick={() => {
                onSelectView('home');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xs transition-colors text-left cursor-pointer ${
                activeView === 'home'
                  ? 'bg-[#525a5c] text-[#dfcdc3] font-bold border-l-4 border-[#dfcdc3]'
                  : 'text-[#dfcdc3]/80 hover:bg-[#525a5c]/50 hover:text-[#dfcdc3]'
              }`}
            >
              <span className="text-lg">Home</span>
              {activeView === 'home' && (
                <span className="text-xs font-sans uppercase tracking-wider px-2 py-0.5 rounded-xs bg-[#719192]/30 text-[#dfcdc3]">
                  Active
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectView('studio');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xs transition-colors text-left cursor-pointer ${
                activeView === 'studio'
                  ? 'bg-[#525a5c] text-[#dfcdc3] font-bold border-l-4 border-[#dfcdc3]'
                  : 'text-[#dfcdc3]/80 hover:bg-[#525a5c]/50 hover:text-[#dfcdc3]'
              }`}
            >
              <span className="text-lg">Video Generator Studio</span>
              {activeView === 'studio' && (
                <span className="text-xs font-sans uppercase tracking-wider px-2 py-0.5 rounded-xs bg-[#719192]/30 text-[#dfcdc3]">
                  Active
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectView('faq');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xs transition-colors text-left cursor-pointer ${
                activeView === 'faq'
                  ? 'bg-[#525a5c] text-[#dfcdc3] font-bold border-l-4 border-[#dfcdc3]'
                  : 'text-[#dfcdc3]/80 hover:bg-[#525a5c]/50 hover:text-[#dfcdc3]'
              }`}
            >
              <span className="text-lg">FAQ &amp; Methodology</span>
              {activeView === 'faq' && (
                <span className="text-xs font-sans uppercase tracking-wider px-2 py-0.5 rounded-xs bg-[#719192]/30 text-[#dfcdc3]">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Account & Details Footer inside Full Screen Menu */}
          <div className="space-y-4 pt-4 border-t border-[#719192]/40">
            {currentUser ? (
              <div className="p-3 bg-[#525a5c]/70 border border-[#719192]/60 rounded-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#719192] flex items-center justify-center text-xs font-bold text-[#3c4245] shrink-0 overflow-hidden">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm text-[#dfcdc3] font-medium truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Cloud Synced</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="text-xs font-mono text-[#dfcdc3] underline px-2.5 py-1.5 bg-[#3c4245] border border-[#719192]/60 rounded-xs hover:border-[#dfcdc3] cursor-pointer"
                >
                  Manage
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#525a5c] hover:bg-[#525a5c]/80 border border-[#719192] text-sm text-[#dfcdc3] font-mono rounded-xs cursor-pointer transition-colors"
              >
                <Cloud className="w-4 h-4 text-[#719192]" />
                <span>Sign In to Sync Videos</span>
              </button>
            )}

            <div className="flex items-center justify-between text-xs font-mono text-[#dfcdc3]/60 pt-1">
              <span>Candidate: {candidateName} (16:9)</span>
              <span>{clipsCount} clips recorded</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
