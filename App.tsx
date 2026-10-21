import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Trash2,
  Loader2,
  Play,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Film,
  X,
  AlertCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cloud,
  User as UserIcon,
  Clock,
  AlertTriangle,
  Sparkles,
  Layers,
  Menu,
} from 'lucide-react';
import { VeoVideoPlayer } from './components/VeoVideoPlayer';
import { HomePage } from './components/HomePage';
import { FaqPage } from './components/FaqPage';
import {
  generateVeoVideo,
  generateVeoExtendedSequence,
  checkVeoServerStatus,
} from './services/geminiService';
import {
  buildVeoPrompt,
  estimateSpeechDuration,
  splitQuoteIntoSegments,
  VEO_MAX_DURATION_SECONDS,
} from './promptInstructions';
import {
  saveStoredVideo,
  getAllStoredVideos,
  deleteStoredVideo,
  exportStoredVideo,
  StoredVideo
} from './services/videoStorage';
import { User } from 'firebase/auth';
import {
  testFirestoreConnection,
  subscribeToAuth,
  saveUserVideoToFirestore,
  deleteUserVideoFromFirestore,
  subscribeToUserVideos,
} from './services/firebase';
import { AuthDialog } from './components/AuthDialog';

export type PastQuoteItem = StoredVideo;

// Master candidate portrait representation (User uploaded Hermione asset)
const DEFAULT_CANDIDATE_IMAGE = '/assets/aistudio/Hermione_c64626e7.png';

// Blank initial archive list per request
const INITIAL_MOCK_QUOTES: PastQuoteItem[] = [];

const LOCAL_STORAGE_IMAGE_KEY = 'synthetic_participant_base_image';

export const App: React.FC = () => {
  // Navigation active view ('home', 'studio', or 'faq')
  const [activeView, setActiveView] = useState<'home' | 'studio' | 'faq'>('home');

  // Candidate Image state (defaulting to uploaded Hermione asset)
  const [candidateImage, setCandidateImage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_IMAGE_KEY);
      if (saved && !saved.includes('unsplash.com')) {
        return saved;
      }
      return DEFAULT_CANDIDATE_IMAGE;
    } catch {
      return DEFAULT_CANDIDATE_IMAGE;
    }
  });

  const candidateName = 'Hermione';
  const [imageFileName, setImageFileName] = useState<string>('Hermione_c64626e7.png');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_IMAGE_KEY);
      return !!saved && !saved.includes('unsplash.com') && saved !== DEFAULT_CANDIDATE_IMAGE;
    } catch {
      return false;
    }
  });

  // App core state (Google Veo)
  const [quoteInput, setQuoteInput] = useState<string>('');
  const [clipDurationOption, setClipDurationOption] = useState<'8s' | 'extended'>('8s');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isPromptManuallyEdited, setIsPromptManuallyEdited] = useState<boolean>(false);
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Derived speech estimation & segmentation (memoized for efficiency)
  const speechEstimate = React.useMemo(
    () => estimateSpeechDuration(quoteInput, clipDurationOption),
    [quoteInput, clipDurationOption]
  );

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStage, setRenderStage] = useState<string>('');

  // Past Quotes with Persistent IndexedDB & Cloud Firestore backing
  const [pastQuotes, setPastQuotes] = useState<PastQuoteItem[]>(INITIAL_MOCK_QUOTES);

  // Computed clip metrics for homepage stats and efficiency
  const { totalClipDurationSeconds, popularCandidateName } = React.useMemo(() => {
    let totalSecs = 0;
    const counts: Record<string, number> = {};

    for (const q of pastQuotes) {
      totalSecs += Number(q.durationSec) || 8;
      const name = q.candidateName || 'Hermione';
      counts[name] = (counts[name] || 0) + 1;
    }

    let popular = 'Hermione';
    let max = 0;
    for (const [name, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        popular = name;
      }
    }

    return {
      totalClipDurationSeconds: totalSecs,
      popularCandidateName: popular,
    };
  }, [pastQuotes]);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [activePreviewQuote, setActivePreviewQuote] = useState<PastQuoteItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-close mobile drawer if window expands to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Auth & Firestore connection on boot
  useEffect(() => {
    checkVeoServerStatus().catch((e) => console.warn('Could not query Veo status', e));
    testFirestoreConnection().catch((e) => console.warn('Firestore initial check:', e));

    const unsubscribeAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        showNotification(`Signed in as ${user.displayName || user.email || 'User'}. Your videos are linked to this account.`, 'success');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync videos: When user is authenticated, sync with Firestore; otherwise use IndexedDB
  useEffect(() => {
    if (!currentUser?.uid) {
      // Offline / guest mode: Load persisted videos from local IndexedDB storage
      getAllStoredVideos()
        .then((stored) => {
          if (stored && stored.length > 0) {
            setPastQuotes(stored);
          }
        })
        .catch((err) => console.warn('IndexedDB initial load error:', err));
      return;
    }

    // Authenticated user: Listen to Firestore real-time cloud collection
    const unsubscribeVideos = subscribeToUserVideos(
      currentUser.uid,
      async (cloudVideos) => {
        if (cloudVideos && cloudVideos.length > 0) {
          // Re-hydrate local cached binary blobs from IndexedDB if available
          try {
            const localVideos = await getAllStoredVideos();
            const localMap = new Map<string, { blob?: Blob; url?: string }>();
            localVideos.forEach((lv) => {
              if (lv.videoBlob) localMap.set(lv.id, { blob: lv.videoBlob, url: lv.videoUrl });
            });

            const merged = cloudVideos.map((cv) => {
              const cached = localMap.get(cv.id);
              return {
                ...cv,
                videoBlob: cached?.blob,
                videoUrl: cached?.url || cv.videoUrl,
              };
            });
            setPastQuotes(merged);
          } catch {
            setPastQuotes(cloudVideos);
          }
        } else {
          // If Firestore is empty but user has local items, offer to keep them
          getAllStoredVideos().then((stored) => {
            if (stored && stored.length > 0) {
              setPastQuotes(stored);
            }
          });
        }
      },
      (err) => console.warn('Firestore user videos subscription warning:', err)
    );

    return () => unsubscribeVideos();
  }, [currentUser]);

  // Sync default prompt with British accent & limited movement when quote changes (if not manually edited)
  useEffect(() => {
    if (!isPromptManuallyEdited) {
      const generated = buildVeoPrompt({
        candidateName,
        quote: quoteInput.trim() || 'User research statement',
        mode: clipDurationOption,
      });
      setCustomPrompt(generated);
    }
  }, [quoteInput, candidateName, isPromptManuallyEdited, clipDurationOption]);

  // Auto-dismiss toast notification
  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // Handle image upload from user
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload a valid image file (PNG, JPG, WebP).', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCandidateImage(dataUrl);
        setImageFileName(file.name);
        setIsCustomImage(true);
        setImageLoadError(false);
        try {
          localStorage.setItem(LOCAL_STORAGE_IMAGE_KEY, dataUrl);
        } catch (storageErr) {
          console.warn('Could not save custom image to localStorage', storageErr);
        }
        showNotification(`Source image updated to ${file.name}`);
      }
    };
    reader.onerror = () => {
      showNotification('Failed to read image file.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleResetImage = () => {
    setCandidateImage(DEFAULT_CANDIDATE_IMAGE);
    setImageFileName('Hermione_c64626e7.png');
    setIsCustomImage(false);
    setImageLoadError(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_IMAGE_KEY);
    } catch {}
    showNotification('Reset to master Hermione candidate portrait.');
  };

  // Trigger Google Veo 3.1 video render
  const handleRender = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quoteInput.trim();
    if (!trimmed) {
      showNotification('Please enter a user quote before rendering.', 'info');
      return;
    }

    setIsRendering(true);
    setRenderProgress(5);
    setRenderStage(
      clipDurationOption === 'extended'
        ? 'Preparing extended multi-clip chained interview sequence...'
        : 'Submitting candidate image and 8s unhurried prompt to Google Veo...'
    );

    try {
      let finalBlob: Blob;
      let finalUrl: string;
      let finalDurationSec: number;
      let finalSegments: PastQuoteItem['segments'] | undefined = undefined;

      const segments = splitQuoteIntoSegments(trimmed);

      if (clipDurationOption === 'extended' && segments.length > 1) {
        setRenderStage(`Initiating chained interview across ${segments.length} continuous segments...`);
        const seqResult = await generateVeoExtendedSequence({
          segments,
          candidateName,
          baseImage: candidateImage,
          onProgress: (pct, stage) => {
            setRenderProgress(pct);
            setRenderStage(stage);
          },
        });

        finalBlob = seqResult.primaryBlob;
        finalUrl = seqResult.primaryUrl;
        finalDurationSec = seqResult.totalDurationSec;
        finalSegments = seqResult.segments;
      } else {
        // Mode '8s': Single clip with silence padding
        const veoResult = await generateVeoVideo({
          quote: trimmed,
          candidateName,
          imageBase64: candidateImage,
          customPrompt: customPrompt.trim() || undefined,
          model: 'veo-3.1-lite-generate-preview',
          resolution: '720p',
          durationSeconds: 8,
          onProgress: (pct, stage) => {
            setRenderProgress(pct);
            setRenderStage(stage);
          },
        });

        finalBlob = veoResult.videoBlob;
        finalUrl = veoResult.videoUrl;
        finalDurationSec = 8.0;
        finalSegments = undefined;
      }

      setRenderProgress(100);
      setRenderStage('Finalizing 16:9 Google Veo video asset...');

      const now = new Date();
      const formattedDate =
        now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) +
        ', ' +
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

      const newQuoteItem: PastQuoteItem = {
        id: 'quote-' + Date.now(),
        quote: trimmed,
        candidateName,
        generatedDate: formattedDate,
        thumbnailUrl: candidateImage,
        durationSec: finalDurationSec,
        videoBlob: finalBlob,
        videoUrl: finalUrl,
        promptUsed: customPrompt.trim(),
        createdAt: Date.now(),
        mode: clipDurationOption,
        segments: finalSegments,
      };

      // Persist to isolated IndexedDB storage for offline & immediate blob caching
      saveStoredVideo(newQuoteItem).catch((storageErr) => {
        console.warn('Failed to persist video to IndexedDB:', storageErr);
      });

      // Persist to Firestore cloud database linked to authenticated user account
      if (currentUser?.uid) {
        saveUserVideoToFirestore(currentUser.uid, newQuoteItem).catch((fsErr) => {
          console.warn('Failed to persist video to Firestore account:', fsErr);
        });
      }

      setPastQuotes((prev) => [newQuoteItem, ...prev]);
      setQuoteInput('');
      setIsPromptManuallyEdited(false);
      setIsRendering(false);
      setRenderProgress(100);

      // Auto-open video player so the user immediately sees the generated video playing
      setActivePreviewQuote(newQuoteItem);
    } catch (err: any) {
      console.error('Google Veo rendering error:', err);
      setIsRendering(false);
      const rawMsg = String(err?.message || err || '');
      let displayMsg = 'Veo generation could not complete. Please try again.';
      if (rawMsg.includes('filtered') || rawMsg.includes('safety') || rawMsg.includes('audio')) {
        displayMsg = 'The request was filtered by content safety guidelines. Please modify the quote text and retry.';
      } else if (rawMsg.includes('API key') || rawMsg.includes('GEMINI_API_KEY')) {
        displayMsg = 'Please verify your Gemini API key in Settings > Secrets.';
      } else if (rawMsg) {
        displayMsg = rawMsg;
      }
      showNotification(displayMsg, 'info');
    }
  };

  // Handle deleting a past quote item
  const handleDelete = (id: string) => {
    // Remove from in-memory state
    setPastQuotes((prev) => prev.filter((item) => item.id !== id));
    if (activePreviewQuote?.id === id) {
      setActivePreviewQuote(null);
    }
    // Remove from local persistent storage
    deleteStoredVideo(id).catch((err) => console.warn('Could not delete from storage', err));

    // Remove from Firestore cloud account
    if (currentUser?.uid) {
      deleteUserVideoFromFirestore(currentUser.uid, id).catch((err) => {
        console.warn('Could not delete from Firestore cloud account', err);
      });
    }

    showNotification('Item removed from video archive.', 'info');
  };

  // Handle downloading Google Veo video (.mp4)
  const handleDownload = (item: PastQuoteItem) => {
    if (item.videoBlob || item.videoUrl) {
      exportStoredVideo(item);
      showNotification(`Downloading Google Veo MP4...`);
      return;
    }

    // If item has no blob yet, navigate to studio and populate quote
    setActiveView('studio');
    setQuoteInput(item.quote);
    showNotification('Quote loaded into composer. Click "Render Video with Veo" to generate.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#3c4245] text-[#dfcdc3] antialiased selection:bg-[#dfcdc3]/25 selection:text-[#dfcdc3]">
      {/* Hidden file input for uploading base portrait */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-[#5f6769] border border-[#719192] text-[#dfcdc3] px-4 py-3 shadow-2xl flex items-center justify-between gap-3 text-xs rounded-xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#719192] animate-dot-pulse" />
            <span className="font-normal">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="icon-btn p-1 text-[#dfcdc3]/70 hover:text-[#dfcdc3]"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout Shell (1180px Max Width Grid) */}
      <div className="app-shell space-y-16">
        {/* ========================================================
            TOP NAVIGATION: Brand, Page Switcher & Direct Actions
           ======================================================== */}
        <header className="relative z-30">
          <nav className="app-nav">
            {/* Brand Wordmark with Home Action */}
            <div className="app-nav-brand">
              <button
                type="button"
                onClick={() => {
                  setActiveView('home');
                  setIsMobileMenuOpen(false);
                }}
                className="inline-flex items-center justify-center text-[#dfcdc3]/80 hover:text-[#dfcdc3] transition-colors cursor-pointer"
                aria-label="Go to Home"
              >
                <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current" aria-hidden="true">
                  <circle cx="50" cy="31" r="9" />
                  <circle cx="69" cy="69" r="9" />
                  <circle cx="31" cy="69" r="9" />
                </svg>
              </button>
              <div className="app-nav-title">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  The Users Are Real
                </button>
                <span className="app-nav-dot">.</span>
                <span className="app-nav-subtitle hidden sm:inline">Public Sector User Research Video Synthesis</span>
              </div>
            </div>

            {/* Desktop Navigation Links & Action (Visible on tablet/desktop) */}
            <div className="hidden md:flex items-center gap-5 sm:gap-7 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveView('home')}
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
                onClick={() => setActiveView('studio')}
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
                onClick={() => setActiveView('faq')}
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
                  onClick={() => setIsAuthDialogOpen(true)}
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
                  onClick={() => setIsAuthDialogOpen(true)}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-[#5f6769]/30 hover:bg-[#5f6769]/70 border border-[#719192]/40 hover:border-[#dfcdc3] rounded-lg text-xs text-[#dfcdc3] transition-colors cursor-pointer"
                  title="Sign in to link and persist your videos"
                >
                  <Cloud className="w-3.5 h-3.5 text-[#719192]" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {/* Direct Render Action */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('studio');
                  setTimeout(() => {
                    const el = document.getElementById('user-quote');
                    el?.focus();
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }}
                className="btn-primary py-1.5 px-4 text-xs font-semibold"
              >
                New Render
              </button>
            </div>

            {/* Mobile Actions: Compact Render Action + Hamburger Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveView('studio');
                  setIsMobileMenuOpen(false);
                  setTimeout(() => {
                    const el = document.getElementById('user-quote');
                    el?.focus();
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }}
                className="btn-primary py-1 px-3 text-xs font-semibold"
              >
                Render
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 bg-[#5f6769]/50 hover:bg-[#5f6769] border border-[#719192]/60 hover:border-[#dfcdc3] rounded-xs text-[#dfcdc3] transition-colors cursor-pointer"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>

          {/* Mobile Drawer Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-[#525a5c] border border-[#719192] p-4 rounded-xs shadow-2xl space-y-3 z-50">
              <div className="space-y-1 font-mono text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xs transition-colors text-left cursor-pointer ${
                    activeView === 'home'
                      ? 'bg-[#3c4245] text-[#dfcdc3] font-bold border-l-2 border-[#dfcdc3]'
                      : 'text-[#dfcdc3]/80 hover:bg-[#3c4245]/50 hover:text-[#dfcdc3]'
                  }`}
                >
                  <span>Home</span>
                  {activeView === 'home' && <span className="text-[10px] uppercase text-[#719192]">Active</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('studio');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xs transition-colors text-left cursor-pointer ${
                    activeView === 'studio'
                      ? 'bg-[#3c4245] text-[#dfcdc3] font-bold border-l-2 border-[#dfcdc3]'
                      : 'text-[#dfcdc3]/80 hover:bg-[#3c4245]/50 hover:text-[#dfcdc3]'
                  }`}
                >
                  <span>Video Generator Studio</span>
                  {activeView === 'studio' && <span className="text-[10px] uppercase text-[#719192]">Active</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('faq');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xs transition-colors text-left cursor-pointer ${
                    activeView === 'faq'
                      ? 'bg-[#3c4245] text-[#dfcdc3] font-bold border-l-2 border-[#dfcdc3]'
                      : 'text-[#dfcdc3]/80 hover:bg-[#3c4245]/50 hover:text-[#dfcdc3]'
                  }`}
                >
                  <span>FAQ &amp; Methodology</span>
                  {activeView === 'faq' && <span className="text-[10px] uppercase text-[#719192]">Active</span>}
                </button>
              </div>

              {/* User Account Section */}
              <div className="pt-2 border-t border-[#719192]/40">
                {currentUser ? (
                  <div className="p-2.5 bg-[#3c4245] border border-[#719192]/50 rounded-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#719192] flex items-center justify-center text-[10px] font-bold text-[#3c4245] shrink-0 overflow-hidden">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs text-[#dfcdc3] font-medium truncate">
                          {currentUser.displayName || currentUser.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Cloud Synced</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAuthDialogOpen(true);
                      }}
                      className="text-xs font-mono text-[#dfcdc3]/80 hover:text-white underline p-1 cursor-pointer shrink-0"
                    >
                      Manage
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAuthDialogOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#3c4245] hover:bg-[#3c4245]/80 border border-[#719192]/50 text-xs text-[#dfcdc3] font-mono rounded-xs cursor-pointer transition-colors"
                  >
                    <Cloud className="w-3.5 h-3.5 text-[#719192]" />
                    <span>Sign In to Sync Account</span>
                  </button>
                )}
              </div>

              {/* Quick Spec info */}
              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-[#dfcdc3]/60">
                <span>Candidate: {candidateName} (16:9)</span>
                <span>{pastQuotes.length} clips recorded</span>
              </div>
            </div>
          )}
        </header>

        {/* ========================================================
            VIEW ROUTING: Homepage, FAQ, or Video Generator Studio
           ======================================================== */}
        {activeView === 'home' ? (
          <HomePage
            onNavigateToStudio={() => {
              setActiveView('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            candidateImage={candidateImage}
            candidateName={candidateName}
            videosCount={pastQuotes.length}
            totalDurationSeconds={totalClipDurationSeconds}
            popularCandidate={popularCandidateName}
          />
        ) : activeView === 'faq' ? (
          <FaqPage
            onNavigateToStudio={() => {
              setActiveView('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="space-y-12">

            {/* ========================================================
                01. CANDIDATE PROFILE STAGE
               ======================================================== */}
            <section aria-labelledby="candidate-profile-heading" className="app-section">
              <div className="app-section-divider">
                <h2 id="candidate-profile-heading" className="app-section-heading">
                  <span>01. Candidate Profile &amp; Master Model</span>
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    title="Select Hermione.png or upload a new base photo"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Base Image</span>
                  </button>
                  {isCustomImage && (
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="inline-flex items-center gap-1 text-xs text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:underline p-1 cursor-pointer"
                      title="Reset to default candidate portrait"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 16:9 Master Candidate Frame */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isCustomImage) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`master-frame ${
                  isDraggingOver ? 'border-[#dfcdc3] ring-1 ring-[#dfcdc3] bg-[#525a5c]' : 'border-[#719192]/60'
                } group cursor-pointer`}
                title="Click or drag & drop to update base image"
              >
                {!imageLoadError ? (
                  <img
                    src={candidateImage}
                    alt={`${candidateName}, research participant candidate portrait in 16:9 frame`}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-[#5f6769] flex flex-col items-center justify-center p-6 text-center">
                    <ImageIcon className="w-16 h-16 text-[#719192] mb-2 stroke-[1.25]" />
                    <p className="text-sm font-semibold text-[#dfcdc3]">{candidateName}</p>
                    <p className="text-xs text-[#dfcdc3]/70 mt-1 font-mono">16:9 Master Video Candidate Frame</p>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-[#3c4245]/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[#dfcdc3] p-4 text-center backdrop-blur-xs">
                  <Upload className="w-6 h-6 mb-1 text-[#dfcdc3]" />
                  <p className="text-sm font-medium">Replace Base Candidate Image</p>
                  <p className="text-xs text-[#dfcdc3]/80 mt-0.5 font-mono">Click to choose file or drag &amp; drop Hermione.png</p>
                </div>

                {/* Viewfinder reticles */}
                <div className="reticle-tl" />
                <div className="reticle-tr" />
                <div className="reticle-bl" />
                <div className="reticle-br" />

                {/* Top left mono tag */}
                <div className="frame-tag absolute top-3 left-3 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#719192] animate-dot-pulse" />
                  <span>16:9 · Master Video Candidate Frame</span>
                </div>

                {/* Bottom tag indicating candidate asset */}
                <div className="frame-tag absolute bottom-3 left-3 shadow-sm">
                  <span className="text-[#dfcdc3]/70">ASSET:</span>
                  <span className="text-[#dfcdc3] font-medium">{imageFileName || 'Hermione_c64626e7.png'}</span>
                </div>

                {isCustomImage && (
                  <div className="frame-tag absolute bottom-3 right-3 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#719192]" />
                    <span>Custom File Active</span>
                  </div>
                )}
              </div>

              {/* Candidate identification banner (clean, without edit button or subtitle) */}
              <div className="pt-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-medium text-[#dfcdc3] tracking-tight">
                    {candidateName}
                  </h3>
                  <span className="text-[11px] font-mono bg-[#5f6769] text-[#dfcdc3]/80 px-2 py-0.5 uppercase tracking-wider border border-[#719192]/60">
                    Candidate #04
                  </span>
                </div>
              </div>
            </section>

            {/* ========================================================
                02. INPUT AREA & RESEARCH STATEMENT
               ======================================================== */}
            <section aria-labelledby="input-area-heading" className="app-section">
              <form onSubmit={handleRender} className="space-y-4">
                <div className="app-section-divider">
                  <label
                    htmlFor="user-quote"
                    className="app-section-heading"
                  >
                    02. Enter User Quote &amp; Research Statement
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#dfcdc3]/70">
                      {speechEstimate.wordCount} words · {quoteInput.length} chars
                    </span>
                  </div>
                </div>

                {/* Duration Control, Pacing & Verbatim Quote in Single Container */}
                <div className="p-4 bg-[#525a5c]/40 border border-[#719192]/40 rounded-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#719192]" />
                      <span className="text-[#dfcdc3]/80">Clip Duration:</span>
                      <div className="inline-flex rounded-xs border border-[#719192]/60 overflow-hidden">
                        <button
                          key="8s"
                          type="button"
                          onClick={() => setClipDurationOption('8s')}
                          disabled={isRendering}
                          className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                            clipDurationOption === '8s'
                              ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                              : 'bg-[#3c4245] text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:bg-[#5f6769]'
                          }`}
                        >
                          <span>8s</span>
                          <span className={`text-[10px] ${clipDurationOption === '8s' ? 'text-[#3c4245]/80 font-normal' : 'text-[#dfcdc3]/50'}`}>
                            (adds silence)
                          </span>
                        </button>

                        <button
                          key="extended"
                          type="button"
                          onClick={() => setClipDurationOption('extended')}
                          disabled={isRendering}
                          className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 border-l border-[#719192]/60 ${
                            clipDurationOption === 'extended'
                              ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                              : 'bg-[#3c4245] text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:bg-[#5f6769]'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>Extended</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#dfcdc3]/70">Pacing:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-xs border ${
                          clipDurationOption === 'extended'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                            : speechEstimate.status === 'optimal'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : speechEstimate.status === 'warning'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {clipDurationOption === 'extended'
                          ? `${speechEstimate.segments.length || 1} chained clip${(speechEstimate.segments.length || 1) > 1 ? 's' : ''} (~${speechEstimate.totalExtendedSeconds}s total)`
                          : `~${speechEstimate.estimatedSeconds}s / 8s (pads silence)`}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim quote textarea inside the same container (white background, no ghost text) */}
                  <div className="relative pt-1">
                    <textarea
                      id="user-quote"
                      name="user-quote"
                      rows={4}
                      value={quoteInput}
                      onChange={(e) => setQuoteInput(e.target.value)}
                      disabled={isRendering}
                      className="w-full bg-white text-gray-900 border border-[#719192] p-3.5 text-sm sm:text-base font-serif rounded-xs focus:outline-none focus:ring-2 focus:ring-[#3c4245] focus:border-[#3c4245] leading-relaxed resize-vertical shadow-xs"
                    />
                  </div>
                </div>

                {/* Extended Multi-Clip Breakdown Preview */}
                {clipDurationOption === 'extended' && speechEstimate.segments.length > 1 && (
                  <div className="p-3 bg-[#525a5c]/60 border border-blue-500/40 rounded-xs space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-blue-200 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Interview Sequence Breakdown ({speechEstimate.segments.length} Continuous Clips)
                      </span>
                      <span className="text-[11px] text-[#dfcdc3]/70 font-normal">
                        ~{speechEstimate.totalExtendedSeconds}s Total Duration
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      {speechEstimate.segments.map((seg, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 p-2 bg-[#3c4245] border border-[#719192]/40 rounded-xs text-[11px] text-[#dfcdc3]/90"
                        >
                          <span className="font-bold text-[#dfcdc3] shrink-0">Part {sIdx + 1} (8s):</span>
                          <span className="font-serif italic flex-1">&ldquo;{seg}&rdquo;</span>
                          <span className="text-[10px] text-[#dfcdc3]/60 shrink-0">
                            {seg.split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#dfcdc3]/60 italic">
                      Zero jump-cut guarantee: Part 2 begins from the exact final facial posture and camera frame of Part 1.
                    </p>
                  </div>
                )}

                {/* Speech timing status / warning banner */}
                {quoteInput.trim().length > 0 && (
                  <div
                    className={`p-3 rounded-xs border text-xs leading-relaxed ${
                      clipDurationOption === 'extended'
                        ? 'bg-blue-900/20 border-blue-500/40 text-blue-200'
                        : speechEstimate.status === 'optimal'
                        ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-200'
                        : speechEstimate.status === 'warning'
                        ? 'bg-amber-900/25 border-amber-500/40 text-amber-200'
                        : 'bg-rose-900/30 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {clipDurationOption === 'extended' ? (
                        <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      ) : speechEstimate.status === 'too-long' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : speechEstimate.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {clipDurationOption === 'extended'
                            ? `Continuous interview workflow enabled: ${speechEstimate.segments.length} chained clips (~${speechEstimate.totalExtendedSeconds}s)`
                            : speechEstimate.status === 'too-long'
                            ? `Quote will be cropped: ~${speechEstimate.estimatedSeconds}s estimated speech vs 8s limit`
                            : speechEstimate.status === 'warning'
                            ? `Quote is near 8s limit (~${speechEstimate.estimatedSeconds}s)`
                            : `Optimal pacing: ~${speechEstimate.estimatedSeconds}s fits naturally within 8s (pads silence)`}
                        </div>
                        <p className="text-[11px] opacity-90">
                          {speechEstimate.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discrete 'Advanced Options' Box */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedPrompt(!showAdvancedPrompt)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#dfcdc3]/75 hover:text-[#dfcdc3] transition-colors py-1 cursor-pointer select-none"
                    aria-expanded={showAdvancedPrompt}
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#719192]" />
                    <span>Advanced Options</span>
                    {showAdvancedPrompt ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#719192]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#719192]" />
                    )}
                  </button>

                  {showAdvancedPrompt && (
                    <div className="mt-2.5 p-4 bg-[#525a5c] border border-[#719192]/60 rounded-xs space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#dfcdc3] font-medium uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#719192]" />
                          Google Veo Prompt (Directly Editable)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPromptManuallyEdited(false);
                            const fresh = buildVeoPrompt({
                              candidateName,
                              quote: quoteInput.trim() || 'User research statement',
                            });
                            setCustomPrompt(fresh);
                            showNotification('Prompt reset to default formula with British accent & limited movement.');
                          }}
                          className="text-[11px] text-[#dfcdc3]/75 hover:text-white underline cursor-pointer"
                        >
                          Reset to Default
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        value={customPrompt}
                        onChange={(e) => {
                          setCustomPrompt(e.target.value);
                          setIsPromptManuallyEdited(true);
                        }}
                        disabled={isRendering}
                        className="w-full bg-[#3c4245] border border-[#719192]/60 p-3 text-xs font-mono text-[#dfcdc3] rounded-xs focus:outline-none focus:border-[#dfcdc3] leading-relaxed resize-vertical"
                        placeholder="Inspect or edit prompt passed to Google Veo..."
                      />

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-[#dfcdc3]/65 gap-1 pt-0.5">
                        <span>Directives: British accent vocal articulation &amp; limited static movement included.</span>
                        <span>{customPrompt.length} characters</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Render Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isRendering || !quoteInput.trim()}
                    className="btn-primary"
                    aria-busy={isRendering}
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#3c4245]" />
                        <span>Generating with Veo ({renderProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4 text-[#3c4245]" />
                        <span>Render Video with Veo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Active progressive rendering pipeline status card */}
                {isRendering && (
                  <div
                    className="status-card"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-[#dfcdc3] animate-spin" />
                        <span className="text-[#dfcdc3] font-medium uppercase tracking-wider">
                          Rendering Pipeline Active
                        </span>
                      </div>
                      <span className="text-[#dfcdc3] font-bold">{renderProgress}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>

                    <div className="text-xs text-[#dfcdc3]/85 space-y-0.5">
                      <p className="font-medium text-[#dfcdc3]">{renderStage}</p>
                      <p className="text-[11px] text-[#dfcdc3]/65 font-mono">
                        Generating 16:9 cinematic video stream with British vocal delivery and limited movement.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </section>

            {/* ========================================================
                03. RENDER ARCHIVE (Persistent Storage)
               ======================================================== */}
            <section aria-labelledby="render-archive-heading" className="space-y-6 pt-4">
              <div className="app-section-divider">
                <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <h2 id="render-archive-heading" className="app-section-heading">
                      03. Render Archive
                    </h2>
                    <span className="text-[11px] font-mono text-[#dfcdc3]/70">
                      [{pastQuotes.length} {pastQuotes.length === 1 ? 'item' : 'items'} · {currentUser ? 'Linked to Account' : 'Stored Locally'}]
                    </span>
                  </div>

                  {currentUser ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-[#3c4245]/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{currentUser.email || currentUser.displayName || 'Account Synced'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAuthDialogOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-mono text-[#719192] hover:text-[#dfcdc3] underline cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Sign in to sync archive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* History Items - Blank state with placeholder & subtle login link */}
              {pastQuotes.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-[#719192]/40 bg-[#5f6769]/30 rounded-xs space-y-2">
                  <Film className="w-7 h-7 text-[#dfcdc3]/40 mx-auto mb-1" />
                  <p className="text-sm font-medium text-[#dfcdc3]">No rendered videos in archive</p>
                  <p className="text-xs text-[#dfcdc3]/70 max-w-sm mx-auto leading-relaxed">
                    Render a research quote above to begin your archive, or{' '}
                    <button
                      type="button"
                      onClick={() => setIsAuthDialogOpen(true)}
                      className="text-[#dfcdc3] underline hover:text-white transition-colors cursor-pointer font-medium"
                    >
                      login
                    </button>{' '}
                    to access previously saved clips.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#719192]/30" role="list">
                  {pastQuotes.map((item) => (
                    <li
                      key={item.id}
                      className="archive-item group"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Small 16:9 thumbnail */}
                        <div
                          className="video-thumbnail group/thumb"
                          onClick={() => setActivePreviewQuote(item)}
                          title="Click to play video"
                        >
                          <img
                            src={item.thumbnailUrl || candidateImage}
                            alt={`16:9 thumbnail of ${candidateName} delivering quote`}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/60 flex items-center justify-center transition-colors">
                            <div className="w-7 h-7 rounded-full bg-[#dfcdc3] text-[#3c4245] flex items-center justify-center shadow-md">
                              <Play className="w-3 h-3 fill-current translate-x-0.5" />
                            </div>
                          </div>

                          {/* Video duration badge */}
                          <div className="absolute bottom-1 right-1 bg-[#3c4245]/90 text-[#dfcdc3] font-mono text-[9.5px] px-1 py-0.2 rounded-2xs flex items-center gap-1">
                            {item.segments && item.segments.length > 1 ? (
                              <>
                                <Layers className="w-2.5 h-2.5 text-blue-300" />
                                <span>{Math.floor(item.durationSec || 16)}s ({item.segments.length}P)</span>
                              </>
                            ) : (
                              <span>{Math.floor(item.durationSec || 8)}s</span>
                            )}
                          </div>
                        </div>

                        {/* Text snippet of the quote & The date it was generated */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm sm:text-[15px] text-[#dfcdc3] line-clamp-2 leading-relaxed font-normal cursor-pointer hover:text-white"
                            onClick={() => setActivePreviewQuote(item)}
                          >
                            &ldquo;{item.quote}&rdquo;
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-[#dfcdc3]/70 flex-wrap">
                            <span className="font-medium text-[#dfcdc3]">{candidateName}</span>
                            <span>·</span>
                            <time dateTime={item.generatedDate} className="font-mono text-[11.5px] text-[#dfcdc3]/60">
                              {item.generatedDate}
                            </time>
                            <span>·</span>
                            <span className="badge-veo">
                              Google Veo 3.1
                            </span>
                            {item.segments && item.segments.length > 1 && (
                              <>
                                <span>·</span>
                                <span className="bg-blue-950/60 border border-blue-500/40 text-blue-300 px-1.5 py-0.5 rounded-2xs text-[10px] font-mono flex items-center gap-1">
                                  <Layers className="w-2.5 h-2.5" />
                                  Extended ({item.segments.length} Parts)
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => setActivePreviewQuote(item)}
                              className="font-medium text-[#dfcdc3]/90 hover:text-white underline underline-offset-3 decoration-[#719192] hover:decoration-[#dfcdc3] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Watch video</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Download & Delete */}
                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          className="icon-btn"
                          title="Download video file (.mp4)"
                          aria-label={`Download video clip for quote: ${item.quote.slice(0, 30)}...`}
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="icon-btn icon-btn-delete"
                          title="Delete quote"
                          aria-label={`Delete quote: ${item.quote.slice(0, 30)}...`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* Google Veo Video Player Modal */}
        {activePreviewQuote && (
          <VeoVideoPlayer
            quote={activePreviewQuote.quote}
            candidateName={candidateName}
            candidateImage={activePreviewQuote.thumbnailUrl || candidateImage}
            generatedDate={activePreviewQuote.generatedDate}
            videoBlob={activePreviewQuote.videoBlob}
            videoUrl={activePreviewQuote.videoUrl}
            segments={activePreviewQuote.segments}
            onClose={() => setActivePreviewQuote(null)}
            onDownload={() => handleDownload(activePreviewQuote)}
          />
        )}

        {/* User Account & Persistent Cloud Storage Modal */}
        <AuthDialog
          currentUser={currentUser}
          isOpen={isAuthDialogOpen}
          onClose={() => setIsAuthDialogOpen(false)}
          savedVideoCount={pastQuotes.length}
        />

        {/* ========================================================
            FOOTER: Service Details & Mission
           ======================================================== */}
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
      </div>
    </div>
  );
};

export default App;
