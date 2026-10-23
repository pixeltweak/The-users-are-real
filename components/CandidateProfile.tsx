import { Check, Plus } from 'lucide-react';

export interface Candidate {
  id: string;
  name: string;
  imageUrl: string;
  fileName?: string;
}

export const DEFAULT_CANDIDATES: Candidate[] = [
  {
    id: 'hermione',
    name: 'Hermione',
    imageUrl: '/candidates/hermione.png',
    fileName: 'hermione.png',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    imageUrl: '/candidates/marcus.jpg',
    fileName: 'marcus.jpg',
  },
  {
    id: 'priya',
    name: 'Priya',
    imageUrl: '/candidates/priya.jpg',
    fileName: 'priya.jpg',
  },
  {
    id: 'arthur',
    name: 'Arthur',
    imageUrl: '/candidates/arthur.jpg',
    fileName: 'arthur.jpg',
  },
  {
    id: 'fatima',
    name: 'Fatima',
    imageUrl: '/candidates/fatima.jpg',
    fileName: 'fatima.jpg',
  },
  {
    id: 'callum',
    name: 'Callum',
    imageUrl: '/candidates/callum.jpg',
    fileName: 'callum.jpg',
  },
];

interface CandidateProfileProps {
  candidates: Candidate[];
  selectedCandidateId: string;
  candidateName: string;
  candidateImage: string;
  onSelectCandidate: (candidate: Candidate) => void;
  onAddCandidateClick: () => void;
}

export const CandidateProfile: React.FC<CandidateProfileProps> = ({
  candidates,
  selectedCandidateId,
  candidateName,
  candidateImage,
  onSelectCandidate,
  onAddCandidateClick,
}) => {
  return (
    <section aria-labelledby="candidate-profile-heading" className="app-section space-y-4">
      {/* Section Divider Header */}
      <div className="app-section-divider">
        <h2 id="candidate-profile-heading" className="app-section-heading">
          <span>01. Candidate Profile &amp; Master Model</span>
        </h2>
      </div>

      {/* Candidate Selector Row: 6 16:9 images with names underneath + Add Candidate button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#dfcdc3]/80">
          <span className="uppercase tracking-wider font-semibold">Candidate Selector</span>
          <span className="text-[11px] text-[#dfcdc3]/60 hidden md:inline">Select participant source material for Veo</span>
          <span className="text-[11px] text-[#dfcdc3]/60 md:hidden flex items-center gap-1 font-mono">
            <span>Scroll &larr; &rarr;</span>
          </span>
        </div>

        {/* Scrollable left-to-right on mobile breakpoint; 7-column grid on desktop (md:) */}
        <div className="flex md:grid md:grid-cols-7 gap-3 overflow-x-auto md:overflow-visible pb-2.5 pt-0.5 px-0.5 -mx-1 sm:mx-0 overscroll-x-contain touch-pan-x">
          {candidates.map((cand) => {
            const isSelected =
              cand.id === selectedCandidateId ||
              cand.imageUrl === candidateImage ||
              cand.name.toLowerCase() === candidateName.toLowerCase();

            return (
              <button
                key={cand.id}
                type="button"
                onClick={() => onSelectCandidate(cand)}
                className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-xs transition-all text-left cursor-pointer shrink-0 flex-none w-28 sm:w-32 md:w-auto ${
                  isSelected
                    ? 'ring-2 ring-[#dfcdc3] bg-[#525a5c]'
                    : 'hover:bg-[#525a5c]/50 bg-[#3c4245]/60 border border-[#719192]/30 opacity-80 hover:opacity-100'
                }`}
                title={`Select ${cand.name}`}
              >
                <div className="w-full aspect-video overflow-hidden rounded-xs bg-[#3c4245] border border-[#719192]/50 relative">
                  <img
                    src={cand.imageUrl}
                    alt={cand.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#dfcdc3] text-[#3c4245] rounded-full flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs truncate w-full text-center ${
                    isSelected ? 'text-[#dfcdc3] font-bold' : 'text-[#dfcdc3]/80 font-medium'
                  }`}
                >
                  {cand.name}
                </span>
              </button>
            );
          })}

          {/* Button at the end of the row: + Add Candidate */}
          <button
            type="button"
            onClick={onAddCandidateClick}
            className="flex flex-col items-center gap-1.5 p-1.5 rounded-xs transition-all text-center cursor-pointer hover:bg-[#525a5c]/60 bg-[#3c4245]/40 border border-dashed border-[#719192]/60 hover:border-[#dfcdc3] group opacity-85 hover:opacity-100 shrink-0 flex-none w-28 sm:w-32 md:w-auto"
            title="Upload custom candidate portrait"
          >
            <div className="w-full aspect-video rounded-xs bg-[#3c4245]/50 flex flex-col items-center justify-center text-[#dfcdc3]/80 group-hover:text-[#dfcdc3] transition-colors">
              <Plus className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Custom</span>
            </div>
            <span className="text-xs font-medium text-[#dfcdc3]/80 group-hover:text-[#dfcdc3] truncate w-full text-center">
              + Add Candidate
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
