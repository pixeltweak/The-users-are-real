/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Character, PRESET_CHARACTERS } from './characters';
import { 
  PlusIcon, 
  XMarkIcon, 
  ArrowRightIcon, 
  SparklesIcon, 
  DownloadIcon, 
  ArrowPathIcon,
  FilmIcon
} from './icons';
import { generateVideo } from '../services/geminiService';
import { 
  AspectRatio, 
  GenerationMode, 
  Resolution, 
  VeoModel, 
  ImageFile 
} from '../types';

interface QueueItem {
  id: string;
  character: Character;
  quote: string;
  intonation: string;
  status: 'idle' | 'preparing' | 'generating' | 'success' | 'failed';
  videoUrl: string | null;
  videoBlob: Blob | null;
  error: string | null;
}

// Helper to convert remote URL to an ImageFile with base64 for sequential calls
const urlToImageFile = async (url: string, filename: string): Promise<ImageFile> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.statusText}`);
  }
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type });
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { file, base64 };
};

const RANDOM_MONOLOGUES = [
  {
    quote: "A nation that forgets its past has no future.",
    intonation: "Deep, solemn, with warning pauses, looking slightly downward before returning his gaze to the camera."
  },
  {
    quote: "I ask of you only one key condition: absolute authenticity in your hearts.",
    intonation: "Spoken with slow, peaceful conviction, highly reassuring with soft eyes."
  },
  {
    quote: "Courage is not the absence of fear, but rather the assessment that something else is more important.",
    intonation: "Delivered with intense determination and sharp oratorical emphasis."
  }
];

interface BulkGenerateViewProps {
  characters: Character[];
}

export const BulkGenerateView: React.FC<BulkGenerateViewProps> = ({ characters }) => {
  // Start with 2 initial default items to demonstrate usefulness
  const [queue, setQueue] = useState<QueueItem[]>(() => [
    {
      id: 'item-1',
      character: characters[0] || PRESET_CHARACTERS[0], // George Washington
      quote: (characters[0] || PRESET_CHARACTERS[0]).defaultQuote,
      intonation: "Whispering but clear, intense eye contact.",
      status: 'idle',
      videoUrl: null,
      videoBlob: null,
      error: null
    },
    {
      id: 'item-2',
      character: characters[1] || PRESET_CHARACTERS[1], // Abraham Lincoln
      quote: "Believe that you can, and you are halfway there.",
      intonation: "Delivered with deep historical gravitas.",
      status: 'idle',
      videoUrl: null,
      videoBlob: null,
      error: null
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);

  // Form options
  const [model, setModel] = useState<VeoModel>(VeoModel.VEO_LITE);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [resolution, setResolution] = useState<Resolution>(Resolution.P720);

  // Add Item
  const handleAddItem = () => {
    const randomChar = characters[Math.floor(Math.random() * characters.length)] || PRESET_CHARACTERS[0];
    const randomMonologue = RANDOM_MONOLOGUES[Math.floor(Math.random() * RANDOM_MONOLOGUES.length)];
    
    setQueue((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        character: randomChar,
        quote: randomChar.defaultQuote || randomMonologue.quote,
        intonation: randomChar.defaultIntonation || randomMonologue.intonation,
        status: 'idle',
        videoUrl: null,
        videoBlob: null,
        error: null
      }
    ]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (isProcessing) return; // Prevent edits during render run
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Update Item Property
  const handleUpdateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const handleUpdateCharacter = (id: string, charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (char) {
      handleUpdateItem(id, { character: char, quote: char.defaultQuote, intonation: char.defaultIntonation });
    }
  };

  // Pre-populate with 3 interesting candidates to run tests quickly
  const handleLoadDemoBatch = () => {
    if (isProcessing) return;
    const demoItems: QueueItem[] = [
      {
        id: `item-demo-1`,
        character: characters[2] || PRESET_CHARACTERS[2], // Churchill
        quote: "Direct speech brings authenticity in an age of replicas.",
        intonation: "Resolute, heavy pauses, nodding slowly.",
        status: 'idle',
        videoUrl: null,
        videoBlob: null,
        error: null
      },
      {
        id: `item-demo-2`,
        character: characters[5] || PRESET_CHARACTERS[5], // Elizabeth
        quote: "We shall conquer what destiny lays down before us today.",
        intonation: "Regal, sharp delivery, proud head raise.",
        status: 'idle',
        videoUrl: null,
        videoBlob: null,
        error: null
      },
      {
        id: `item-demo-3`,
        character: characters[7] || PRESET_CHARACTERS[7], // Einstein
        quote: "The secret to creativity is knowing how to hide your sources.",
        intonation: "Gentle academic, with a playful spark in the gaze.",
        status: 'idle',
        videoUrl: null,
        videoBlob: null,
        error: null
      }
    ];
    setQueue(demoItems);
  };

  // Trigger sequential asynchronous render queue
  const handleRenderBatch = async () => {
    if (queue.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setQueue((prev) => prev.map((item) => ({ ...item, status: item.status === 'success' ? 'success' : 'idle', error: null })));

    // Sequential Loop
    for (let i = 0; i < queue.length; i++) {
      const currentItem = queue[i];
      if (!currentItem) continue;

      if (currentItem.status === 'success' && currentItem.videoUrl) {
        continue; // Skip already successfully generated ones
      }

      setCurrentProcessingIndex(i);
      
      // Update state to preparing startFrame
      setQueue((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'preparing' } : item));

      try {
        // 1. Convert portrait URL to startImage Base64
        const finalStartFrame = await urlToImageFile(currentItem.character.imageUrl, `${currentItem.character.id}.jpg`);

        // Update state to generating
        setQueue((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'generating' } : item));

        // 2. Compile prompt with strict static camera limits
        const compiledPrompt = `A high-fidelity cinematic video close up portrait of ${currentItem.character.visualPrompt}. The character is ${currentItem.character.name}, looking straight, speaking directly to the camera, saying the words: "${currentItem.quote.replace(/"/g, '\\"')}". The delivery tone and intonation of the reading is: ${currentItem.intonation.trim() || 'natural speech'}. Their lips and mouth move perfectly synchronized with the spoken quote, with realistic lifelike facial expressions, subtle gaze, and natural head nods. Portrait studio lighting, high production values. STRICT CAMERA CONSTRAINT: The camera must remain absolutely static and fixed with zero camera movement, no panning, tilting, panning, zooming, or rotating. The background must remain completely still and identical to the starting frame, with zero scene transitions or background shifts. Only the character present in the provided starting frame image should move their lips and face to speak. No outer camera motions, no scene transitions, and no environment scaling allowed.`;

        // 3. Make real generate call
        const result = await generateVideo({
          prompt: compiledPrompt,
          model,
          aspectRatio,
          resolution,
          mode: GenerationMode.FRAMES_TO_VIDEO,
          startFrame: finalStartFrame,
          endFrame: null,
          referenceImages: [],
          styleImage: null,
          inputVideo: null,
          inputVideoObject: null,
          isLooping: false,
        });

        // Update state on success
        setQueue((prev) => prev.map((item, idx) => idx === i ? { 
          ...item, 
          status: 'success', 
          videoUrl: result.objectUrl, 
          videoBlob: result.blob 
        } : item));

      } catch (err: any) {
        console.error(`Item ${i + 1} failed:`, err);
        const errorMsg = err instanceof Error ? err.message : 'An unknown generation error occurred.';
        
        let clientFriendlyMsg = errorMsg;
        if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid') || errorMsg.toLowerCase().includes('permission denied')) {
          clientFriendlyMsg = "Invalid API key or insufficient permissions.";
        }

        setQueue((prev) => prev.map((item, idx) => idx === i ? { 
          ...item, 
          status: 'failed', 
          error: clientFriendlyMsg 
        } : item));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(null);
  };

  const handleDownloadVideo = (item: QueueItem) => {
    if (item.videoUrl && item.videoBlob) {
      const url = item.videoUrl;
      const a = document.createElement('a');
      a.href = url;
      a.download = `voiceover-${item.character.id}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleResetQueue = () => {
    if (isProcessing) return;
    setQueue([]);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300" id="bulk-generate-view">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111112]/40 border border-gray-900 rounded-2xl p-5">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FilmIcon className="w-5 h-5 text-indigo-400" />
            Bulk Speech Synthesis
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 max-w-lg">
            Create an entire campaign at once. Queue up to 10 unique scripts and run sequential render jobs inside a highly responsive canvas.
          </p>
        </div>

        {/* Preset Tools */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadDemoBatch}
            disabled={isProcessing}
            className="px-3 py-1.5 border border-indigo-500/20 bg-indigo-950/10 hover:bg-indigo-950/20 text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors"
          >
            Load Demo Trio
          </button>
          <button
            type="button"
            disabled={queue.length === 0 || isProcessing}
            onClick={handleResetQueue}
            className="px-3 py-1.5 border border-gray-800 hover:border-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Configuration presets for the entire batch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900/15 border border-gray-900 rounded-xl p-4">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Queue VEO Model</label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value as VeoModel)}
            disabled={isProcessing}
            className="w-full bg-[#18181a] border border-gray-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-gray-300"
          >
            <option value={VeoModel.VEO_LITE}>Lite (⚡ Fast preview)</option>
            <option value={VeoModel.VEO_FAST}>Fast (Moderate speed)</option>
            <option value={VeoModel.VEO}>High Quality (Detailed portrait)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Aspect Ratio</label>
          <select 
            value={aspectRatio} 
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            disabled={isProcessing}
            className="w-full bg-[#18181a] border border-gray-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-gray-300"
          >
            <option value={AspectRatio.LANDSCAPE}>Landscape Movie (16:9)</option>
            <option value={AspectRatio.PORTRAIT}>Portrait Social (9:16)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Video Resolution</label>
          <select 
            value={resolution} 
            onChange={(e) => setResolution(e.target.value as Resolution)}
            disabled={isProcessing}
            className="w-full bg-[#18181a] border border-gray-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-gray-300"
          >
            <option value={Resolution.P720}>720p (High speed execution)</option>
            <option value={Resolution.P1080}>1080p (Crystal HD)</option>
          </select>
        </div>
      </div>

      {/* Main Queue List */}
      <div className="flex flex-col gap-4">
        {queue.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-950 rounded-2xl bg-[#0a0a0c]/20">
            <SparklesIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-gray-400">Your Batch Queue is Empty</h4>
            <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
              Add your first script card to orchestrate custom portraits or select "Load Demo Trio" to start.
            </p>
            <button
              onClick={handleAddItem}
              className="mt-4 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
            >
              <PlusIcon className="w-4 h-4" />
              Add First Script
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((item, idx) => {
              const isActive = currentProcessingIndex === idx;
              return (
                <div 
                  key={item.id} 
                  className={`relative border rounded-xl overflow-hidden transition-all ${
                    isActive 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/5' 
                      : item.status === 'success' 
                        ? 'border-green-600/30 bg-green-950/5' 
                        : item.status === 'failed'
                          ? 'border-red-900/60 bg-red-950/5'
                          : 'border-gray-900 bg-[#111112]/30 hover:border-gray-800'
                  }`}
                >
                  {/* Absolute Progress indicator overlay */}
                  {isActive && (
                    <div className="absolute top-0 left-0 bg-indigo-500 h-1 transition-all duration-1000 w-full animate-pulse" />
                  )}

                  {/* Main Grid Content */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Index & Portrait */}
                    <div className="md:col-span-2 flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-600">#{idx + 1}</span>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-800">
                        <img 
                          src={item.character.imageUrl} 
                          alt={item.character.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Speaker</span>
                        <select
                          value={item.character.id}
                          onChange={(e) => handleUpdateCharacter(item.id, e.target.value)}
                          disabled={isProcessing}
                          className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer border-b border-dashed border-gray-700"
                        >
                          {characters.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#18181a] text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Speech Text Inputs */}
                    <div className="md:col-span-4">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-0.5">Words To Speak (Quote)</label>
                      <textarea
                        rows={2}
                        value={item.quote}
                        onChange={(e) => handleUpdateItem(item.id, { quote: e.target.value })}
                        disabled={isProcessing}
                        placeholder="Write words to speaking..."
                        className="w-full bg-[#18181a]/50 border border-gray-800/80 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-700 resize-none focus:outline-none focus:border-gray-700"
                      />
                    </div>

                    {/* Intonation */}
                    <div className="md:col-span-3">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-0.5">Intonation Tone</label>
                      <input
                        type="text"
                        value={item.intonation}
                        onChange={(e) => handleUpdateItem(item.id, { intonation: e.target.value })}
                        disabled={isProcessing}
                        placeholder="e.g. Whispering with direct eye contact"
                        className="w-full bg-[#18181a]/50 border border-gray-800/80 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-700"
                      />
                    </div>

                    {/* Status Feedback, Inline Player OR Action */}
                    <div className="md:col-span-3 flex items-center justify-between gap-2.5">
                      
                      {/* Interactive View / Result State */}
                      <div className="flex-grow">
                        {item.status === 'idle' && (
                          <span className="text-xs text-gray-500 font-medium">Ready in batch</span>
                        )}

                        {item.status === 'preparing' && (
                          <div className="flex items-center gap-2 text-indigo-400">
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs font-medium">Preparing picture...</span>
                          </div>
                        )}

                        {item.status === 'generating' && (
                          <div className="flex items-center gap-2 text-yellow-500">
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs font-medium">Rendering VEO...</span>
                          </div>
                        )}

                        {item.status === 'success' && item.videoUrl && (
                          <div className="flex items-center gap-2">
                            {/* Simple light box expand / Inline micro-video preview */}
                            <video 
                              src={item.videoUrl} 
                              className="w-16 h-10 object-cover rounded border border-green-600/30"
                              controls
                            />
                            <button
                              type="button"
                              onClick={() => handleDownloadVideo(item)}
                              title="Download mp4 rendering"
                              className="p-1 px-1.5 bg-green-950/30 hover:bg-green-600 border border-green-500/20 hover:border-green-400 text-green-400 hover:text-white rounded text-xs flex items-center gap-1 transition-all"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                              Save
                            </button>
                          </div>
                        )}

                        {item.status === 'failed' && (
                          <div className="flex flex-col gap-0.5 max-w-[160px]">
                            <span className="text-[11px] font-bold text-red-500">Failed</span>
                            <span className="text-[9px] text-red-400 leading-tight line-clamp-2" title={item.error || 'Server error'}>
                              {item.error || 'Check key connection'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cancel / Remove Trigger */}
                      {!isProcessing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 hover:bg-gray-850 hover:text-red-500 rounded-full text-gray-600 transition-colors"
                          title="Remove from batch"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Float Controls bottom of list */}
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={isProcessing || queue.length >= 10}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-[#111112] border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <PlusIcon className="w-4 h-4" />
                Add Monologue Card
              </button>

              <button
                type="button"
                onClick={handleRenderBatch}
                disabled={queue.length === 0 || isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:scale-100 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Rendering Queue ({currentProcessingIndex !== null ? currentProcessingIndex + 1 : 0}/{queue.length})...
                  </>
                ) : (
                  <>
                    <ArrowRightIcon className="w-4 h-4" />
                    Render Batch Monologues ({queue.length})
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* API Key warnings when bulk processing */}
      <div className="bg-[#1c1c1e]/40 p-4 border border-gray-900 rounded-xl text-[11px] text-gray-500 leading-relaxed flex flex-col gap-1.5">
        <p className="font-semibold text-gray-450 uppercase tracking-wider text-[10px]">Important Note Regarding Batch Remastering</p>
        <p>The system executes speech calls sequentially in the background. Generating 1080p full portraits may trigger temporary service delays depending on your active Google AI Studio billing tier. Do not close or refresh this browser tab while generations are in progress to safeguard active blob references.</p>
      </div>

    </div>
  );
};
