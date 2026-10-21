import React from 'react';
import { Film, ArrowRight, Video, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  onNavigateToStudio: () => void;
  candidateImage: string;
  candidateName: string;
  videosCount?: number;
  totalDurationSeconds?: number;
  popularCandidate?: string;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToStudio,
  candidateImage,
  candidateName,
  videosCount = 0,
  totalDurationSeconds = 0,
  popularCandidate = 'Hermione',
}) => {
  // Format total clip duration into hours and minutes
  const formatDuration = (totalSecs: number) => {
    const totalMins = Math.floor(totalSecs / 60);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const remSecs = Math.floor(totalSecs % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${remSecs}s`;
    }
    return `${Math.max(0, remSecs)}s`;
  };

  return (
    <div className="space-y-16">
      {/* ========================================================
          HERO & EDITORIAL MISSION
         ======================================================== */}
      <section className="space-y-8 pt-2">
        {/* Main Editorial Headline */}
        <h1 className="app-hero-title">
          Bringing user research inside the public sector <em className="font-serif italic text-[#dfcdc3]">to life</em>.
        </h1>

        {/* User's Exact Specified Narrative Text */}
        <div className="max-w-3xl space-y-5 text-base sm:text-lg leading-relaxed text-[#dfcdc3]/90 font-normal">
          <p className="bg-[#5f6769]/30 border-l-2 border-[#719192] pl-5 py-2">
            The users are real was bourn out of a real need to help bring user research inside the public sector to life. The team would be interviewing candidates, collecting insights, behaviours and quotes. Once themed and synthesised all this juicy material would be presented as text, quotes on a page with reduced or removed emotion and impact.
          </p>

          <p className="text-[#dfcdc3]/85 text-base sm:text-[17px] leading-relaxed">
            Using these real quotes to generate box-pops style videos became attainable in April 2025 with VEO. The first versions of video generation handled character consistency with JSON files that were getting more reliable with every edit - now we use image files as references. This means that users can now add their own source images in line with their own interview environment.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="btn-primary"
          >
            <Film className="w-4 h-4 text-[#3c4245]" />
            <span>Launch Video Generator</span>
            <ArrowRight className="w-4 h-4 text-[#3c4245]" />
          </button>
        </div>

        {/* 3-Column Stats Grid matching page grid */}
        <div className="app-stats-strip">
          <div>
            <div className="app-stat-num">{videosCount}</div>
            <div className="app-stat-label">CLIPS CREATED</div>
          </div>
          <div>
            <div className="app-stat-num">{formatDuration(totalDurationSeconds)}</div>
            <div className="app-stat-label">CLIP LENGTH</div>
          </div>
          <div>
            <div className="app-stat-num truncate max-w-[140px]" title={popularCandidate}>
              {popularCandidate}
            </div>
            <div className="app-stat-label">POPULAR CANDIDATE</div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SPEC & METHODOLOGY TICKER
         ======================================================== */}
      <div className="app-ticker">
        <span>Public Sector User Research</span>
        <span className="text-[#719192]/60">·</span>
        <span>Box-Pops Video Generation</span>
        <span className="text-[#719192]/60">·</span>
        <span>Image Reference Character Consistency</span>
        <span className="text-[#719192]/60">·</span>
        <span>British Vocal Cadence &amp; Restrained Kinematics</span>
      </div>

      {/* ========================================================
          ARCHITECTURAL GRID: The Evolution of Vox-Pops Video
         ======================================================== */}
      <section className="app-section">
        <div className="app-section-divider">
          <h2 className="app-section-heading">
            <span>01. The Evolution of Research Synthesis</span>
          </h2>
          <span className="text-xs font-mono text-[#dfcdc3]/70">Architecture &amp; Methodology</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Column 1: The Problem */}
          <div className="bg-[#5f6769] border border-[#719192]/40 p-6 space-y-4 rounded-xs">
            <div className="w-8 h-8 rounded-xs bg-[#3c4245] border border-[#719192] flex items-center justify-center text-[#dfcdc3]">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-medium text-[#dfcdc3]">Static Text Limitation</h3>
            <p className="text-sm text-[#dfcdc3]/80 leading-relaxed">
              Synthesized interview findings and verbatim quotes traditionally sat locked in slide decks and spreadsheets, losing the emotional resonance and urgent conviction of the actual participant.
            </p>
          </div>

          {/* Column 2: JSON to Image References */}
          <div className="bg-[#5f6769] border border-[#719192]/40 p-6 space-y-4 rounded-xs">
            <div className="w-8 h-8 rounded-xs bg-[#3c4245] border border-[#719192] flex items-center justify-center text-[#dfcdc3]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-medium text-[#dfcdc3]">From JSON to Image References</h3>
            <p className="text-sm text-[#dfcdc3]/80 leading-relaxed">
              Early iterations attempted to preserve character consistency with complex descriptor JSON files. With modern Veo, single high-definition reference portraits preserve exact likeness, skin tone, and attire seamlessly.
            </p>
          </div>

          {/* Column 3: Custom Interview Environments */}
          <div className="bg-[#5f6769] border border-[#719192]/40 p-6 space-y-4 rounded-xs">
            <div className="w-8 h-8 rounded-xs bg-[#3c4245] border border-[#719192] flex items-center justify-center text-[#dfcdc3]">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-medium text-[#dfcdc3]">Your Source Images &amp; Context</h3>
            <p className="text-sm text-[#dfcdc3]/80 leading-relaxed">
              Upload your own source images matching your specific research environment—whether community centres, municipal offices, or remote testing setups—paired with calm British vocal delivery.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          PREVIEW CANDIDATE SPOTLIGHT & CTA
         ======================================================== */}
      <section className="app-section">
        <div className="app-section-divider">
          <h2 className="app-section-heading">
            <span>02. Active Master Candidate Model</span>
          </h2>
          <span className="text-xs font-mono text-[#dfcdc3]/70">16:9 Reference</span>
        </div>

        <div className="bg-[#5f6769] border border-[#719192] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 rounded-xs">
          {/* 16:9 Frame Preview */}
          <div className="w-full md:w-1/2 aspect-video relative overflow-hidden border border-[#719192] bg-[#3c4245] rounded-xs group">
            <img
              src={candidateImage}
              alt={candidateName}
              className="w-full h-full object-cover"
            />
            <div className="reticle-tl" />
            <div className="reticle-tr" />
            <div className="reticle-bl" />
            <div className="reticle-br" />
          </div>

          {/* Explanation & Action */}
          <div className="w-full md:w-1/2 space-y-5">
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#719192]">Master Model</span>
              <h3 className="text-2xl font-medium text-[#dfcdc3]">{candidateName}</h3>
              <p className="text-sm text-[#dfcdc3]/80 leading-relaxed">
                Configured for British vocal articulation, restrained head stillness, and authentic documentary interview framing. Ready to speak any verbatim public sector research quote.
              </p>
            </div>

            <ul className="space-y-2 text-xs font-mono text-[#dfcdc3]/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#719192]" />
                <span>British accent vocal articulation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#719192]" />
                <span>Limited movement &amp; static camera composure</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#719192]" />
                <span>Direct editable Veo prompt control</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#719192]" />
                <span>Persistent local video archive</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToStudio}
                className="btn-primary"
              >
                <span>Enter Studio &amp; Render Video</span>
                <ArrowRight className="w-4 h-4 text-[#3c4245]" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
