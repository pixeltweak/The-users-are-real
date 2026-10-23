import React from 'react';
import { Cloud, Film, Play, Download, Trash2, Layers } from 'lucide-react';
import { User } from 'firebase/auth';
import { StoredVideo } from '../services/videoStorage';

export type PastQuoteItem = StoredVideo;

interface RenderArchiveProps {
  pastQuotes: PastQuoteItem[];
  currentUser: User | null;
  candidateName: string;
  candidateImage: string;
  onOpenAuth: () => void;
  onPlayQuote: (quote: PastQuoteItem) => void;
  onDownloadQuote: (quote: PastQuoteItem) => void;
  onDeleteQuote: (id: string) => void;
}

export const RenderArchive: React.FC<RenderArchiveProps> = ({
  pastQuotes,
  currentUser,
  candidateName,
  candidateImage,
  onOpenAuth,
  onPlayQuote,
  onDownloadQuote,
  onDeleteQuote,
}) => {
  return (
    <section aria-labelledby="render-archive-heading" className="space-y-6 pt-4">
      {/* Header bar */}
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
              onClick={onOpenAuth}
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
              onClick={onOpenAuth}
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
            <li key={item.id} className="archive-item group">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Small 16:9 thumbnail */}
                <div
                  className="video-thumbnail group/thumb"
                  onClick={() => onPlayQuote(item)}
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
                    onClick={() => onPlayQuote(item)}
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
                      onClick={() => onPlayQuote(item)}
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
                  onClick={() => onDownloadQuote(item)}
                  className="icon-btn"
                  title="Download video file (.mp4)"
                  aria-label={`Download video clip for quote: ${item.quote.slice(0, 30)}...`}
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteQuote(item.id)}
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
  );
};
