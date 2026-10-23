import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  Film,
  X,
  AlertCircle,
  AlertTriangle,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { VeoVideoPlayer } from './components/VeoVideoPlayer';
import { HomePage } from './components/HomePage';
import { FaqPage } from './components/FaqPage';
import { Header } from './components/Header';
import {
  CandidateProfile,
  Candidate,
  DEFAULT_CANDIDATES,
} from './components/CandidateProfile';
import { RenderArchive } from './components/RenderArchive';
import { Footer } from './components/Footer';
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
const DEFAULT_CANDIDATE_IMAGE = '/candidates/hermione.png';

// Blank initial archive list per request
const INITIAL_MOCK_QUOTES: PastQuoteItem[] = [];

const LOCAL_STORAGE_IMAGE_KEY = 'synthetic_participant_base_image';

export const App: React.FC = () => {
  // Navigation active view ('home', 'studio', or 'faq')
  const [activeView, setActiveView] = useState<'home' | 'studio' | 'faq'>('home');

  // Candidate Selector list (6 diverse candidates + custom uploads)
  const [candidates, setCandidates] = useState<Candidate[]>(DEFAULT_CANDIDATES);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('hermione');

  // Active candidate name & image sent as source material to Veo
  const [candidateName, setCandidateName] = useState<string>('Hermione');
  const [candidateImage, setCandidateImage] = useState<string>(DEFAULT_CANDIDATE_IMAGE);
  const [imageFileName, setImageFileName] = useState<string>('hermione.png');
  const [isCustomImage, setIsCustomImage] = useState<boolean>(false);

  // App core state (Google Veo)
  const [quoteInput, setQuoteInput] = useState<string>('');
  const [clipDurationOption, setClipDurationOption] = useState<'8s' | 'auto' | 'extended'>('auto');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isPromptManuallyEdited, setIsPromptManuallyEdited] = useState<boolean>(false);
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState<boolean>(false);

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

  // Handle candidate selection from the Candidate Selector row
  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
    setCandidateName(candidate.name);
    setCandidateImage(candidate.imageUrl);
    setImageFileName(candidate.fileName || `${candidate.name.toLowerCase()}.jpg`);
    setImageLoadError(false);
    showNotification(`Candidate set to ${candidate.name}. Source material active for Veo.`);
  };

  // Handle custom image upload from user (via + Add Candidate)
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload a valid image file (PNG, JPG, WebP).', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const cleanName =
          file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[_-]/g, ' ')
            .trim() || 'Custom Candidate';

        const customCandidate: Candidate = {
          id: `custom-${Date.now()}`,
          name: cleanName,
          imageUrl: dataUrl,
          fileName: file.name,
        };

        setCandidates((prev) => [...prev, customCandidate]);
        setSelectedCandidateId(customCandidate.id);
        setCandidateName(cleanName);
        setCandidateImage(dataUrl);
        setImageFileName(file.name);
        setIsCustomImage(true);
        setImageLoadError(false);
        showNotification(`Added ${cleanName} to candidate selector.`);
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
        : clipDurationOption === 'auto'
        ? `Submitting candidate image and auto-timed (~${speechEstimate.autoSeconds}s) prompt to Google Veo...`
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
        // Mode '8s' or 'auto': Single clip pass
        const targetDuration = clipDurationOption === 'auto' ? speechEstimate.autoSeconds : 8;
        const veoResult = await generateVeoVideo({
          quote: trimmed,
          candidateName,
          imageBase64: candidateImage,
          customPrompt: customPrompt.trim() || undefined,
          model: 'veo-3.1-lite-generate-preview',
          resolution: '720p',
          durationSeconds: targetDuration,
          onProgress: (pct, stage) => {
            setRenderProgress(pct);
            setRenderStage(stage);
          },
        });

        finalBlob = veoResult.videoBlob;
        finalUrl = veoResult.videoUrl;
        finalDurationSec = targetDuration;
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

      {/* Sticky Header (Compact on mobile, full width sticky) */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthDialogOpen(true)}
        candidateName={candidateName}
        clipsCount={pastQuotes.length}
      />

      {/* Main Layout Shell (1180px Max Width Grid) */}
      <div className="app-shell space-y-16">

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
                01. CANDIDATE PROFILE STAGE (Candidate Selector)
               ======================================================== */}
            <CandidateProfile
              candidates={candidates}
              selectedCandidateId={selectedCandidateId}
              candidateName={candidateName}
              candidateImage={candidateImage}
              onSelectCandidate={handleSelectCandidate}
              onAddCandidateClick={() => fileInputRef.current?.click()}
            />

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
                </div>

                {/* Unified Container: Main Candidate Image and Verbatim Quote Textarea */}
                <div className="p-4 sm:p-5 bg-[#525a5c]/40 border border-[#719192]/40 rounded-xs">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Main Candidate Image & Selected Identity */}
                    <div className="md:col-span-5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-[#dfcdc3]/80">
                        <span className="uppercase tracking-wider font-semibold">Master Candidate Frame</span>
                        <span className="text-[11px] text-[#dfcdc3]/60 font-mono">16:9 &bull; Veo Source</span>
                      </div>

                      {/* 16:9 Master Candidate Frame (Clean, unlabelled source material) */}
                      <div className="master-frame border-[#719192]/60 overflow-hidden relative shadow-md bg-[#3c4245]">
                        {!imageLoadError ? (
                          <img
                            src={candidateImage}
                            alt={`${candidateName}, research participant candidate portrait in 16:9 frame`}
                            className="w-full h-full object-cover select-none"
                            referrerPolicy="no-referrer"
                            onError={() => setImageLoadError(true)}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#5f6769] flex flex-col items-center justify-center p-4 text-center">
                            <ImageIcon className="w-10 h-10 text-[#719192] mb-1 stroke-[1.25]" />
                            <p className="text-sm font-semibold text-[#dfcdc3]">{candidateName}</p>
                            <p className="text-[11px] text-[#dfcdc3]/70 font-mono">16:9 Master Video Frame</p>
                          </div>
                        )}
                      </div>

                      {/* Candidate Name underneath */}
                      <div className="flex items-center justify-between pt-0.5">
                        <h3 className="text-xl sm:text-2xl font-medium text-[#dfcdc3] tracking-tight truncate">
                          {candidateName}
                        </h3>
                        <span className="text-[11px] font-mono text-[#dfcdc3]/75 bg-[#3c4245] px-2 py-0.5 rounded-xs border border-[#719192]/50">
                          Active Model
                        </span>
                      </div>
                    </div>

                    {/* Verbatim Quote Textarea with Duration & Pacing Controls */}
                    <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="user-quote"
                          className="flex items-center justify-between text-xs font-mono text-[#dfcdc3]/80 font-semibold uppercase tracking-wider"
                        >
                          <span>Verbatim Quote / Script</span>
                          <span className="text-[11px] text-[#dfcdc3]/60 font-normal lowercase">spoken by {candidateName}</span>
                        </label>
                        <textarea
                          id="user-quote"
                          name="user-quote"
                          rows={5}
                          value={quoteInput}
                          onChange={(e) => setQuoteInput(e.target.value)}
                          disabled={isRendering}
                          placeholder="Type or paste the participant's exact statement..."
                          className="w-full bg-white text-gray-900 border border-[#719192] p-3.5 text-sm sm:text-base font-serif rounded-xs focus:outline-none focus:ring-2 focus:ring-[#3c4245] focus:border-[#3c4245] leading-relaxed resize-vertical shadow-xs min-h-[140px]"
                        />
                      </div>

                      {/* Bottom Info Bar: Duration Mode Indicator & Pacing Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1 border-t border-[#719192]/25">
                        <div className="flex items-center gap-2 text-xs text-[#dfcdc3]/75">
                          <Clock className="w-3.5 h-3.5 text-[#719192]" />
                          <span>Duration:</span>
                          <span className="font-semibold text-[#dfcdc3]">
                            {clipDurationOption === 'auto'
                              ? `AUTO (~${speechEstimate.autoSeconds}s)`
                              : clipDurationOption === 'extended'
                              ? `Extended (~${speechEstimate.totalExtendedSeconds}s)`
                              : '8s'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#dfcdc3]/70">Pacing:</span>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-xs border ${
                              clipDurationOption === 'extended'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                                : clipDurationOption === 'auto'
                                ? 'bg-cyan-950/60 text-cyan-200 border-cyan-500/40'
                                : speechEstimate.status === 'optimal'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : speechEstimate.status === 'warning'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {clipDurationOption === 'extended'
                              ? `${speechEstimate.segments.length || 1} chained clip${(speechEstimate.segments.length || 1) > 1 ? 's' : ''} (~${speechEstimate.totalExtendedSeconds}s total)`
                              : clipDurationOption === 'auto'
                              ? `Auto: ~${speechEstimate.autoSeconds}s (nearest sec)`
                              : `~${speechEstimate.estimatedSeconds}s / 8s (pads silence)`}
                          </span>
                        </div>
                      </div>
                    </div>
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
                    <div className="mt-2.5 p-4 bg-[#525a5c] border border-[#719192]/60 rounded-xs space-y-4">
                      {/* 1. Clip Duration & Controls (Stacked on mobile breakpoint) */}
                      <div className="p-3 bg-[#3c4245]/70 border border-[#719192]/50 rounded-xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                          <div className="flex items-center gap-2 text-[#dfcdc3] font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#719192]" />
                            <span className="uppercase tracking-wider">Clip Duration</span>
                          </div>
                          <span className="text-[11px] text-[#dfcdc3]/65">
                            {clipDurationOption === 'auto'
                              ? 'Automatically rounded to nearest second'
                              : clipDurationOption === '8s'
                              ? 'Fixed 8-second standard duration (pads silence)'
                              : 'Multi-scene chained interview sequence'}
                          </span>
                        </div>

                        {/* Buttons: stacked vertically on mobile breakpoint (< sm), inline-flex row on sm+ */}
                        <div className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto rounded-xs border border-[#719192]/60 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#719192]/60">
                          <button
                            key="auto"
                            type="button"
                            onClick={() => setClipDurationOption('auto')}
                            disabled={isRendering}
                            className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-center sm:justify-start gap-1.5 ${
                              clipDurationOption === 'auto'
                                ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                                : 'bg-[#3c4245] text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:bg-[#5f6769]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>AUTO</span>
                            <span
                              className={`text-[10px] ${
                                clipDurationOption === 'auto' ? 'text-[#3c4245]/80 font-normal' : 'text-[#dfcdc3]/50'
                              }`}
                            >
                              (nearest sec)
                            </span>
                          </button>

                          <button
                            key="8s"
                            type="button"
                            onClick={() => setClipDurationOption('8s')}
                            disabled={isRendering}
                            className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-center sm:justify-start gap-1.5 ${
                              clipDurationOption === '8s'
                                ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                                : 'bg-[#3c4245] text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:bg-[#5f6769]'
                            }`}
                          >
                            <span>8s</span>
                            <span
                              className={`text-[10px] ${
                                clipDurationOption === '8s' ? 'text-[#3c4245]/80 font-normal' : 'text-[#dfcdc3]/50'
                              }`}
                            >
                              (adds silence)
                            </span>
                          </button>

                          <button
                            key="extended"
                            type="button"
                            onClick={() => setClipDurationOption('extended')}
                            disabled={isRendering}
                            className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-center sm:justify-start gap-1.5 ${
                              clipDurationOption === 'extended'
                                ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                                : 'bg-[#3c4245] text-[#dfcdc3]/70 hover:text-[#dfcdc3] hover:bg-[#5f6769]'
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            <span>Extended</span>
                            <span
                              className={`text-[10px] ${
                                clipDurationOption === 'extended' ? 'text-[#3c4245]/80 font-normal' : 'text-[#dfcdc3]/50'
                              }`}
                            >
                              (chaining)
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Google Veo Prompt (Directly Editable) */}
                      <div className="space-y-2">
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
                                mode: clipDurationOption,
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
                03. RENDER ARCHIVE (Modular Include)
               ======================================================== */}
            <RenderArchive
              pastQuotes={pastQuotes}
              currentUser={currentUser}
              candidateName={candidateName}
              candidateImage={candidateImage}
              onOpenAuth={() => setIsAuthDialogOpen(true)}
              onPlayQuote={(item) => setActivePreviewQuote(item)}
              onDownloadQuote={handleDownload}
              onDeleteQuote={handleDelete}
            />
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
            FOOTER (Modular Include)
           ======================================================== */}
        <Footer />
      </div>
    </div>
  );
};

export default App;
