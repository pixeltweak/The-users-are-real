import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  X,
  Maximize2,
  FileText,
  Loader2,
  Check
} from 'lucide-react';

export interface VideoSegmentItem {
  id: string;
  quote: string;
  durationSec: number;
  videoUrl?: string;
  videoBlob?: Blob;
}

export interface VeoVideoPlayerProps {
  quote: string;
  candidateName: string;
  candidateImage: string;
  generatedDate: string;
  videoUrl?: string;
  videoBlob?: Blob;
  segments?: VideoSegmentItem[];
  onClose: () => void;
  onDownload: () => void;
}

/**
 * Dedicated Google Veo 16:9 Video Player.
 * Supports single clips (8s with silence) and seamless multi-clip Extended Interviews.
 */
export const VeoVideoPlayer: React.FC<VeoVideoPlayerProps> = ({
  quote,
  candidateName,
  candidateImage,
  generatedDate,
  videoUrl,
  videoBlob,
  segments,
  onClose,
  onDownload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const hasMultipleSegments = !!(segments && segments.length > 1);
  const activeSegment = hasMultipleSegments ? segments[activeSegmentIndex] : undefined;

  const currentQuote = activeSegment?.quote || quote;
  const currentUrl = activeSegment?.videoUrl || videoUrl;
  const currentBlob = activeSegment?.videoBlob || videoBlob;

  const [activeSrc, setActiveSrc] = useState<string | undefined>(currentUrl);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Manage blob object URL lifecycle cleanly
  useEffect(() => {
    if (currentUrl) {
      setActiveSrc(currentUrl);
      return;
    }
    if (currentBlob) {
      const url = URL.createObjectURL(currentBlob);
      setActiveSrc(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setActiveSrc(undefined);
  }, [currentUrl, currentBlob, activeSegmentIndex]);

  // Auto-play when advancing segment
  useEffect(() => {
    if (videoRef.current && activeSrc) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [activeSrc, activeSegmentIndex]);

  // Keyboard accessibility (Escape to close, Space to toggle play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (
        e.key === ' ' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Unified Play / Pause action
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Autoplay prevented or interrupted:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(`"${quote}" — ${candidateName}`);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = duration > 0 ? duration : 6;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="veo-player-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#3c4245]/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-4xl bg-[#3c4245] border border-[#719192] shadow-2xl overflow-hidden flex flex-col focus:outline-hidden"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#5f6769] border-b border-[#719192]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#719192] animate-dot-pulse" />
            <span id="veo-player-title" className="text-xs font-mono tracking-wider uppercase text-[#dfcdc3]">
              Google Veo 3.1 · 16:9 Cinema Playback
            </span>
            <span className="text-[#dfcdc3]/70 font-mono text-[11px] hidden sm:inline">
              · {candidateName}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn p-1"
            aria-label="Close video player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 16:9 Video Display Container */}
        <div className="relative w-full aspect-[16/9] bg-[#3c4245] overflow-hidden flex items-center justify-center select-none group">
          {activeSrc ? (
            <>
              <video
                ref={videoRef}
                src={activeSrc}
                playsInline
                autoPlay
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  if (hasMultipleSegments && activeSegmentIndex < (segments?.length || 1) - 1) {
                    setActiveSegmentIndex((prev) => prev + 1);
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(false);
                  }
                }}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => {
                  const d = videoRef.current?.duration || 0;
                  if (d > 0 && !isNaN(d)) setDuration(d);
                }}
                onDurationChange={() => {
                  const d = videoRef.current?.duration || 0;
                  if (d > 0 && !isNaN(d)) setDuration(d);
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
              />

              {/* Viewfinder reticles */}
              <div className="reticle-tl" />
              <div className="reticle-tr" />
              <div className="reticle-bl" />
              <div className="reticle-br" />

              {/* Buffering spinner */}
              {isBuffering && (
                <div className="absolute inset-0 bg-[#3c4245]/50 pointer-events-none flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#719192] animate-spin" />
                </div>
              )}

              {/* Centered Play Button overlay when video is paused */}
              {!isPlaying && !isBuffering && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 bg-[#3c4245]/40 flex items-center justify-center cursor-pointer transition-opacity"
                  title="Click to play"
                >
                  <div className="w-16 h-16 rounded-full bg-[#5f6769] border border-[#719192] text-[#dfcdc3] flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                    <Play className="w-7 h-7 fill-[#dfcdc3] translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Closed Caption overlay */}
              {showSubtitles && (
                <div className="absolute bottom-4 inset-x-4 pointer-events-none flex justify-center">
                  <div className="bg-[#3c4245]/95 backdrop-blur-xs border border-[#719192] text-[#dfcdc3] text-sm sm:text-base px-5 py-2.5 rounded-[4px] max-w-xl text-center shadow-2xl leading-relaxed">
                    <span className="text-[#dfcdc3]/80 font-sans font-medium mr-2">{candidateName}:</span>
                    <span className="font-serif italic text-[#dfcdc3]">&ldquo;{currentQuote}&rdquo;</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#3c4245]">
              <img
                src={candidateImage}
                alt={candidateName}
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
              />
              <div className="relative z-10 max-w-md space-y-2 text-center">
                <p className="text-sm font-medium text-[#dfcdc3]">{candidateName}</p>
                <p className="text-xs text-[#dfcdc3]/80 line-clamp-3 font-serif italic">
                  &ldquo;{currentQuote}&rdquo;
                </p>
                <p className="text-[11px] font-mono text-[#719192] pt-2">
                  Google Veo 16:9 Video Stream
                </p>
              </div>
            </div>
          )}

          {/* Engine indicator badge */}
          <div className="frame-tag absolute top-3 left-3 pointer-events-none z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#719192] animate-dot-pulse" />
            <span>
              Google Veo 3.1 · 16:9 MP4
              {hasMultipleSegments ? ` · Part ${activeSegmentIndex + 1}/${segments?.length}` : ' · 8s'}
            </span>
          </div>

          {/* Extended Sequence Pill in Top Right */}
          {hasMultipleSegments && (
            <div className="frame-tag absolute top-3 right-3 pointer-events-none z-10 bg-[#3c4245]/90 border border-emerald-500/50 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Chained Extended Interview</span>
            </div>
          )}
        </div>

        {/* Extended Segments Navigation Track */}
        {hasMultipleSegments && segments && (
          <div className="px-4 py-2 bg-[#525a5c] border-t border-[#719192]/60 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-[#dfcdc3]/75 uppercase tracking-wider">
                Interview Sequence:
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {segments.map((seg, idx) => (
                <button
                  key={seg.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveSegmentIndex(idx);
                    setIsPlaying(true);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeSegmentIndex === idx
                      ? 'bg-[#dfcdc3] text-[#3c4245] font-bold shadow-xs'
                      : 'bg-[#3c4245] text-[#dfcdc3]/75 hover:bg-[#5f6769] hover:text-[#dfcdc3]'
                  }`}
                  title={seg.quote}
                >
                  <span>Part {idx + 1}</span>
                  <span className="text-[10px] opacity-70">({seg.durationSec || 8}s)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Video Player Controls Bar */}
        <div className="p-4 bg-[#5f6769] border-t border-[#719192] space-y-3">
          {/* Seeker timeline bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#dfcdc3]/70 w-10 text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center h-4">
              <input
                type="range"
                min={0}
                max={effectiveDuration}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-[#3c4245] rounded-none appearance-none cursor-pointer accent-[#dfcdc3] focus:outline-hidden"
                aria-label="Seek video position"
              />
              <div
                className="absolute top-[7.5px] left-0 h-1 bg-[#dfcdc3] pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="text-xs font-mono text-[#dfcdc3]/70 w-10 shrink-0">
              {formatTime(effectiveDuration)}
            </span>
          </div>

          {/* Bottom control buttons */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="icon-btn p-2 text-[#dfcdc3]"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="icon-btn p-2"
                title="Replay from start"
                aria-label="Replay video"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 pl-2 border-l border-[#719192]">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="icon-btn p-1.5"
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-[#3c4245] appearance-none cursor-pointer accent-[#dfcdc3]"
                  aria-label="Volume slider"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`px-2.5 py-1 text-xs font-mono border transition-colors cursor-pointer rounded-xs ${
                  showSubtitles
                    ? 'border-[#dfcdc3] text-[#dfcdc3] bg-[#3c4245]'
                    : 'border-[#719192] text-[#dfcdc3]/70 hover:text-[#dfcdc3]'
                }`}
                title="Toggle subtitles / verbatim transcript"
              >
                CC
              </button>

              <button
                type="button"
                onClick={handleCopyTranscript}
                className="icon-btn p-2"
                title="Copy quote transcript"
                aria-label="Copy quote transcript"
              >
                {copiedTranscript ? (
                  <Check className="w-4 h-4 text-[#dfcdc3]" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleFullscreen}
                className="icon-btn p-2"
                title="Fullscreen"
                aria-label="Toggle fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="btn-primary py-1.5 px-3.5 text-xs ml-1"
                title="Download Google Veo MP4"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </button>
            </div>
          </div>
        </div>

        {/* Verbatim research card beneath video */}
        <div className="px-5 py-3.5 bg-[#3c4245] border-t border-[#719192] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-[#dfcdc3]/70 font-mono text-[11.5px]">
            <span className="text-[#dfcdc3] font-medium">{candidateName}</span>
            <span>·</span>
            <span>{generatedDate}</span>
            <span>·</span>
            <span className="text-[#719192]">Google Veo 3.1</span>
          </div>
          <div className="text-[11px] text-[#dfcdc3]/50 font-mono">
            16:9 · 720p HD · Public Sector Research Asset
          </div>
        </div>
      </div>
    </div>
  );
};
