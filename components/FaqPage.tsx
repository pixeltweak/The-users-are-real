import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  Layers,
  Film,
  Camera,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface FaqPageProps {
  onNavigateToStudio: () => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string | React.ReactNode;
}

export const FaqPage: React.FC<FaqPageProps> = ({ onNavigateToStudio }) => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'item-8s': true,
    'item-extended': true,
    'item-duration': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const faqItems: FaqItem[] = [
    {
      id: 'item-8s',
      category: 'Duration & Pacing',
      question: 'What is 8s Mode and how does it handle silence?',
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-[#dfcdc3]">
            8s Mode: Candidate articulates the quote cleanly, then pauses in natural, thoughtful silence with attentive eye contact to comfortably pad the 8s window without rushing.
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            Because Google Veo generates video containers up to 8 seconds in length, short research soundbites (8–14 words) only take 3 to 5 seconds of spoken delivery. Rather than looping awkwardly or artificially stretching mouth kinematics, 8s mode directs the candidate to speak with authentic British cadence and then hold composed, thoughtful silence with natural breathing and locked-off eye contact for the remainder of the clip.
          </p>
        </div>
      ),
    },
    {
      id: 'item-extended',
      category: 'Duration & Pacing',
      question: 'How does Extended Mode maintain consistency across long quotes?',
      answer: (
        <div className="space-y-2">
          <p className="font-medium text-[#dfcdc3]">
            Extended Mode: Long quotes are split into continuous clips. The last frame of each clip is extracted to seed the next clip for zero jump-cuts and seamless continuous playback.
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            When a participant statement exceeds 15 words or contains multiple sentences, Extended Mode automatically divides it into coherent semantic clauses (~10–14 words each). Part 1 is rendered from the candidate portrait; its final video frame is captured and passed as the visual seed to Part 2 with continuity directives. The built-in player plays the segments back-to-back as one uninterrupted research interview.
          </p>
        </div>
      ),
    },
    {
      id: 'item-duration',
      category: 'Veo Specifications',
      question: 'What is the maximum video length from Google Veo?',
      answer: (
        <div className="space-y-2">
          <p className="text-[#dfcdc3]/90 text-sm leading-relaxed">
            A single generation pass in Google Veo (Veo 3.1 and Veo 2.0) has a hard architectural duration ceiling of <strong>8 seconds</strong> (supported range is 5 to 8 seconds).
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            Human speech proceeds at approximately 2.2 to 2.5 words per second (130–150 words per minute). In 8 seconds, the maximum comfortable spoken capacity is approximately 16 to 18 words. For monologues or multi-sentence research observations, use <strong>Extended Mode</strong> to chain multiple 8-second clips together.
          </p>
        </div>
      ),
    },
    {
      id: 'item-consistency',
      category: 'Character Consistency',
      question: 'How is character consistency preserved across clips?',
      answer: (
        <div className="space-y-2">
          <p className="text-[#dfcdc3]/90 text-sm leading-relaxed">
            We employ image-conditioned reference rendering. Rather than relying solely on text descriptions (which can drift between seeds), every clip is visually anchored to a high-resolution candidate master portrait (e.g., Hermione).
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            Our prompt instructions enforce fixed documentary parameters: locked-off tripod framing, 50mm cinematic lens, soft diffused directional office lighting, and calm physical composure with limited head movement.
          </p>
        </div>
      ),
    },
    {
      id: 'item-custom-image',
      category: 'Source Assets',
      question: 'Can I upload my own participant portrait or research environment?',
      answer: (
        <div className="space-y-2">
          <p className="text-[#dfcdc3]/90 text-sm leading-relaxed">
            Yes. You can upload any 16:9 or square portrait (PNG, JPG, WebP) directly in Stage 01 of the Video Generator Studio.
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            The neural engine will parse the facial contours, attire, and background lighting of your uploaded image and generate consistent video kinematics for your custom participant. You can reset to the default master candidate (Hermione) at any time.
          </p>
        </div>
      ),
    },
    {
      id: 'item-persistence',
      category: 'Storage & Account Sync',
      question: 'Where are my rendered videos stored?',
      answer: (
        <div className="space-y-2">
          <p className="text-[#dfcdc3]/90 text-sm leading-relaxed">
            Rendered videos are cached locally in your browser's persistent IndexedDB storage, allowing instant offline replay and MP4 export.
          </p>
          <p className="text-[#dfcdc3]/80 text-xs leading-relaxed">
            When you sign in with your Google or email account, your videos and multi-clip extended sequences are automatically synced to your private Cloud Firestore account, ensuring your render archive persists across different devices and sessions.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Header */}
      <section className="space-y-4 pt-2 border-b border-[#719192]/40 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-[#719192] uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          <span>Documentation &amp; Methodology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-medium text-[#dfcdc3] tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-base text-[#dfcdc3]/80 max-w-2xl leading-relaxed">
          Technical specifications, prompt kinematics, pacing guidelines, and architecture for synthetic user research video generation.
        </p>
      </section>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-[#5f6769]/40 border border-[#719192]/40 rounded-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#dfcdc3] font-semibold">
            <Clock className="w-4 h-4 text-[#719192]" />
            <span>8s Mode (Single Clip)</span>
          </div>
          <p className="text-xs text-[#dfcdc3]/80 leading-relaxed">
            Quotes up to 14 words. Candidate articulates the statement cleanly and transitions into calm, thoughtful silence with attentive eye contact.
          </p>
        </div>

        <div className="p-4 bg-[#5f6769]/40 border border-blue-500/40 rounded-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-200 font-semibold">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Extended Mode (Multi-Clip)</span>
          </div>
          <p className="text-xs text-[#dfcdc3]/80 leading-relaxed">
            Longer research paragraphs. Automatically partitioned into continuous 8s segments with last-frame keyframing for zero jump-cut playback.
          </p>
        </div>
      </div>

      {/* Accordion FAQ Items */}
      <section className="space-y-3">
        {faqItems.map((item) => {
          const isOpen = !!openItems[item.id];
          return (
            <div
              key={item.id}
              className="border border-[#719192]/50 bg-[#525a5c]/40 rounded-xs overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[#525a5c]/80 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#719192]">
                    {item.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-medium text-[#dfcdc3]">
                    {item.question}
                  </h3>
                </div>
                <div className="shrink-0 p-1 rounded-xs bg-[#3c4245] border border-[#719192]/60 text-[#dfcdc3]">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-sm border-t border-[#719192]/30">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* CTA Footer inside FAQ */}
      <div className="p-6 bg-[#5f6769] border border-[#719192] rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-medium text-[#dfcdc3]">Ready to synthesize user research quotes?</h4>
          <p className="text-xs text-[#dfcdc3]/80 mt-0.5">
            Render character-consistent documentary vox-pops in 16:9 cinematic video.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToStudio}
          className="btn-primary shrink-0"
        >
          <span>Open Video Generator</span>
          <ArrowRight className="w-4 h-4 text-[#3c4245]" />
        </button>
      </div>
    </div>
  );
};
