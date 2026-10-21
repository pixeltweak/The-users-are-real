import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  LogIn,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  signOutUser,
} from '../services/firebase';

interface AuthDialogProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  savedVideoCount: number;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  currentUser,
  isOpen,
  onClose,
  savedVideoCount,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      setSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      // If popup was blocked or closed
      if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Email sign in.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was cancelled.');
      } else {
        setError(err?.message || 'Could not complete Google sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        setSuccessMsg('Welcome back! Your videos are now synced.');
      } else {
        await signUpWithEmail(email, password, displayName);
        setSuccessMsg('Account created successfully! Your videos are now securely linked.');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Email auth error:', err);
      let friendly = err?.message || 'Authentication error';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        friendly = 'Incorrect email or password.';
      } else if (err?.code === 'auth/email-already-in-use') {
        friendly = 'An account with this email already exists. Try signing in.';
      } else if (err?.code === 'auth/weak-password') {
        friendly = 'Password should be at least 6 characters.';
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAsGuest('Researcher');
      setSuccessMsg('Signed in as Guest. Your videos are linked to this temporary session.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Could not initiate guest sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setSuccessMsg('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#3c4245] border border-[#719192]/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-[#dfcdc3] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#719192]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#dfcdc3]/60 hover:text-[#dfcdc3] hover:bg-[#5f6769]/50 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* ================================================================
             ALREADY SIGNED IN VIEW
             ================================================================ */
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#719192]/30 border border-[#719192] flex items-center justify-center overflow-hidden text-lg font-bold">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-[#dfcdc3]" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase font-mono tracking-wider text-[#719192]">Signed In Account</span>
                <h3 id="auth-modal-title" className="text-base font-semibold text-white">
                  {currentUser.displayName || currentUser.email || 'Researcher'}
                </h3>
                {currentUser.email && (
                  <span className="text-xs text-[#dfcdc3]/70">{currentUser.email}</span>
                )}
              </div>
            </div>

            {/* Account Storage Stats */}
            <div className="bg-[#5f6769]/40 border border-[#719192]/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-[#719192]" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Persistent Cloud Storage</span>
                  <span className="text-[11px] text-[#dfcdc3]/70">
                    Linked to Firestore Database
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 bg-[#3c4245] border border-[#719192]/40 rounded-lg text-xs font-mono text-[#dfcdc3]">
                {savedVideoCount} video{savedVideoCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-[#dfcdc3]/80 leading-relaxed bg-[#3c4245]/60 border border-[#719192]/20 rounded-xl p-3">
              <div className="flex items-center gap-2 text-[#719192]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-white">Zero-Loss Synchronization</span>
              </div>
              <p>
                All videos you render are automatically saved to your account in real-time. When you log in from any browser or device, your quotes and videos will automatically reload.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#719192]/20">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="py-2 px-4 bg-red-950/30 hover:bg-red-900/50 border border-red-850 hover:border-red-700 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================
             SIGN IN / REGISTER VIEW
             ================================================================ */
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#719192]">
                <Cloud className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider font-mono font-semibold">Account &amp; Storage</span>
              </div>
              <h3 id="auth-modal-title" className="text-xl font-bold text-white tracking-tight">
                {mode === 'signin' ? 'Sign in to sync your videos' : 'Create an account to store videos'}
              </h3>
              <p className="text-xs text-[#dfcdc3]/70 leading-relaxed">
                Connect your account so your Google Veo candidate videos remain permanently saved across sessions and devices.
              </p>
            </div>

            {/* 1-Click Google Sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-[#719192]/30 w-full" />
              <span className="bg-[#3c4245] px-3 text-[10px] uppercase font-mono tracking-wider text-[#dfcdc3]/50 shrink-0">
                Or with email
              </span>
              <div className="border-t border-[#719192]/30 w-full" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
              {mode === 'signup' && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-mono text-[#dfcdc3]/70 block mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-[#dfcdc3]/50 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Benjamin Hobson"
                      className="w-full bg-[#5f6769]/50 border border-[#719192]/40 focus:border-[#dfcdc3] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#dfcdc3]/40 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-[#dfcdc3]/70 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#dfcdc3]/50 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.gov.uk"
                    className="w-full bg-[#5f6769]/50 border border-[#719192]/40 focus:border-[#dfcdc3] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#dfcdc3]/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-mono text-[#dfcdc3]/70 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#dfcdc3]/50 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-[#5f6769]/50 border border-[#719192]/40 focus:border-[#dfcdc3] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#dfcdc3]/40 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 text-xs font-bold rounded-xl mt-1 flex items-center justify-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <div className="flex items-center justify-between text-xs text-[#dfcdc3]/70 pt-2 border-t border-[#719192]/20">
              <span>
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-[#dfcdc3] font-semibold underline hover:text-white"
              >
                {mode === 'signin' ? 'Register' : 'Sign in'}
              </button>
            </div>

            {/* Quick Guest mode */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleGuestSignIn}
                disabled={loading}
                className="text-[11px] text-[#719192] hover:text-[#dfcdc3] transition-colors"
              >
                Continue as Guest (Local persistence only)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
