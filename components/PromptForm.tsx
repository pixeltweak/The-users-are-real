/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AspectRatio,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  VeoModel,
} from '../types';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  RectangleStackIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TvIcon,
} from './icons';
import { Character, PRESET_CHARACTERS } from './characters';
import { CharacterSelector } from './CharacterSelector';

interface PromptFormProps {
  onGenerate: (params: GenerateVideoParams) => void;
  initialValues?: GenerateVideoParams | null;
}

const CustomSelect: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ label, value, onChange, icon, children, disabled = false }) => (
  <div>
    <label
      className={`text-xs block mb-1.5 font-medium ${
        disabled ? 'text-gray-500' : 'text-gray-400'
      }`}>
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {icon}
      </div>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-[#1c1c1e] border border-gray-700 rounded-lg pl-10 pr-8 py-2 appearance-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-200 disabled:bg-gray-800 disabled:border-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed">
        {children}
      </select>
      <ChevronDownIcon
        className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          disabled ? 'text-gray-600' : 'text-gray-400'
        }`}
      />
    </div>
  </div>
);

// High-speed preset intonations to help the user trigger amazing deliveries easily
const INTONATION_PRESETS = [
  { label: 'Steady & solemn', value: 'Steady, solemn, commanding, speaking directly in a historical address format.' },
  { label: 'Whispering & devious', value: 'Devious whisper, quiet, dark cinematic tone, mysterious and close to camera.' },
  { label: 'Enthusiastic battle-cry', value: 'Incredibly passionate, energetic, high-volume heroic call to arms.' },
  { label: 'Calm & reassuring', value: 'Calm, gentle, slow conversational cadence, warm and deeply reassuring smile.' },
  { label: 'Sarcastic & sharp', value: 'Dry sarcastic delivery, smug facial expression, and smart fast cadence.' },
];

// Utility to convert remote URL to an ImageFile with base64 for VEO starting frame
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

const PromptForm: React.FC<PromptFormProps> = ({ onGenerate, initialValues }) => {
  // We select George Washington by default
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(PRESET_CHARACTERS[0]);
  const [customImage, setCustomImage] = useState<ImageFile | null>(null);

  // Split prompts as requested: words to be spoken & intonation/mood details
  const [spokenQuote, setSpokenQuote] = useState(PRESET_CHARACTERS[0].defaultQuote);
  const [intonation, setIntonation] = useState(PRESET_CHARACTERS[0].defaultIntonation);

  // Standard advanced VEO settings
  const [model, setModel] = useState<VeoModel>(initialValues?.model ?? VeoModel.VEO_LITE);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialValues?.aspectRatio ?? AspectRatio.LANDSCAPE);
  const [resolution, setResolution] = useState<Resolution>(initialValues?.resolution ?? Resolution.P720);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  // Synchronize when character changes (fills values automatically for amazing instant preview)
  const handleSelectCharacter = (char: Character | null) => {
    setSelectedCharacter(char);
    if (char) {
      setSpokenQuote(char.defaultQuote);
      setIntonation(char.defaultIntonation);
    }
  };

  // Pre-load from initialValues on retry or error retry
  useEffect(() => {
    if (initialValues) {
      setModel(initialValues.model ?? VeoModel.VEO_LITE);
      setAspectRatio(initialValues.aspectRatio ?? AspectRatio.LANDSCAPE);
      setResolution(initialValues.resolution ?? Resolution.P720);
      
      // Try to parse spoken quote and intonation back from raw prompt if possible
      const rawPrompt = initialValues.prompt ?? '';
      if (rawPrompt) {
        // Simple extraction fallback if it matches our pattern
        const quoteMatch = rawPrompt.match(/saying the words: "(.*)"/);
        const intonationMatch = rawPrompt.match(/delivery tone and intonation of the reading is: (.*)\. Their lips/);
        
        if (quoteMatch && quoteMatch[1]) {
          setSpokenQuote(quoteMatch[1]);
        } else {
          setSpokenQuote(rawPrompt);
        }

        if (intonationMatch && intonationMatch[1]) {
          setIntonation(intonationMatch[1]);
        }
      }
    }
  }, [initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spokenQuote.trim()) return;

    setIsPreparing(true);

    try {
      let finalStartFrame: ImageFile | null = null;

      // Acquire starting image
      if (customImage) {
        finalStartFrame = customImage;
      } else if (selectedCharacter) {
        // Pre-fetch candidate portrait and encode to base64
        finalStartFrame = await urlToImageFile(selectedCharacter.imageUrl, `${selectedCharacter.id}.jpg`);
      }

      // Compile beautiful VEO speaker simulation prompt
      const charName = selectedCharacter ? selectedCharacter.name : 'A historical actor';
      const visualDescriptor = selectedCharacter 
        ? selectedCharacter.visualPrompt 
        : 'A professional lookalike speaker in a high-fidelity studio environment';

      const compiledPrompt = `A high-fidelity cinematic video close up portrait of ${visualDescriptor}. The character is ${charName}, looking straight, speaking directly to the camera, saying the words: "${spokenQuote.replace(/"/g, '\\"')}". The delivery tone and intonation of the reading is: ${intonation.trim() || 'natural, clear speech'}. Their lips and mouth move perfectly synchronized with the spoken quote, with realistic lifelike facial expressions, subtle gaze, and natural head nods. Elegant portrait studio lighting, dramatic backlights, highly detailed, high production values.`;

      onGenerate({
        prompt: compiledPrompt,
        model,
        aspectRatio,
        resolution,
        mode: finalStartFrame ? GenerationMode.FRAMES_TO_VIDEO : GenerationMode.TEXT_TO_VIDEO,
        startFrame: finalStartFrame,
        endFrame: null,
        referenceImages: [],
        styleImage: null,
        inputVideo: null,
        inputVideoObject: null,
        isLooping: false,
      });

    } catch (err) {
      console.warn("Failed to fetch/encode reference frame, falling back to direct video instruction:", err);
      
      // Clean fallback using standard Text to Video
      const fallbackPrompt = `A high-fidelity cinematic video close up portait of a historical figure named ${selectedCharacter?.name || 'speaker'}. They are speaking directly to the camera, saying the words: "${spokenQuote.replace(/"/g, '\\"')}". The delivery tone and intonation of the reading is: ${intonation.trim() || 'clear voice'}. Perfect lip-sync and lifelike expressions.`;

      onGenerate({
        prompt: fallbackPrompt,
        model,
        aspectRatio,
        resolution,
        mode: GenerationMode.TEXT_TO_VIDEO,
        startFrame: null,
        endFrame: null,
        referenceImages: [],
        styleImage: null,
        inputVideo: null,
        inputVideoObject: null,
        isLooping: false,
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const isSubmitDisabled = !spokenQuote.trim() || isPreparing;

  return (
    <div className="w-full flex flex-col gap-6" id="prompt-form-wrapper">
      {/* 1. Candidate Gallery Selection */}
      <CharacterSelector
        selectedCharacter={selectedCharacter}
        onSelectCharacter={handleSelectCharacter}
        onCustomImageAdded={setCustomImage}
      />

      {/* Inputs Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
        {/* 2. Text boxes for Spoken Content & Intonation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Spoken Quote Box */}
          <div className="flex flex-col bg-[#111112] border border-gray-800 rounded-xl p-4 focus-within:ring-1 focus-within:ring-indigo-500">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2 flex items-center justify-between">
              <span>2. Words To Be Spoken (Quote)</span>
              {selectedCharacter && (
                <span className="text-[10px] text-indigo-400 normal-case font-medium">
                  Preset for {selectedCharacter.name}
                </span>
              )}
            </label>
            <textarea
              required
              rows={4}
              value={spokenQuote}
              onChange={(e) => setSpokenQuote(e.target.value)}
              placeholder={`Write the words you want the candidate to speak...`}
              className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
            />
          </div>

          {/* Intonation & Mood Box */}
          <div className="flex flex-col bg-[#111112] border border-gray-800 rounded-xl p-4 focus-within:ring-1 focus-within:ring-indigo-500 justify-between">
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2 block">
                3. Intonation & Subtle Mood
              </label>
              <textarea
                rows={2}
                value={intonation}
                onChange={(e) => setIntonation(e.target.value)}
                placeholder="Describe how the quote should be read (e.g. whispering, shouting, cheerful, serious)..."
                className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
              />
            </div>

            {/* Micro-pills presets to click-to-apply */}
            <div className="mt-4">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Intonation Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {INTONATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setIntonation(p.value)}
                    className="text-[10px] bg-gray-800/60 hover:bg-indigo-900/30 text-gray-300 hover:text-indigo-200 px-2 py-1 rounded transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Advanced Fine-Tuning Panel (Drawer setup code preserved) */}
        {isSettingsOpen && (
          <div className="p-4 bg-[#111112] rounded-xl border border-gray-800 animate-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CustomSelect
                label="A.I. Generation Model"
                value={model}
                onChange={(e) => setModel(e.target.value as VeoModel)}
                icon={<SparklesIcon className="w-4 h-4 text-gray-400" />}>
                <option value={VeoModel.VEO_LITE}>Lite (Veo 3.1 - Fast, 720p)</option>
                <option value={VeoModel.VEO_FAST}>Fast (Veo 3.1 - Medium latency)</option>
                <option value={VeoModel.VEO}>High Quality (Veo 3.1 - Deep detailed portrait)</option>
              </CustomSelect>

              <CustomSelect
                label="Camera Aspect Ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                icon={<RectangleStackIcon className="w-4 h-4 text-gray-400" />}>
                <option value={AspectRatio.LANDSCAPE}>Landscape Movie (16:9)</option>
                <option value={AspectRatio.PORTRAIT}>Portrait Social (9:16)</option>
              </CustomSelect>

              <CustomSelect
                label="Video Resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                icon={<TvIcon className="w-4 h-4 text-gray-400" />}>
                <option value={Resolution.P720}>720p (High Speed)</option>
                <option value={Resolution.P1080}>1080p (Crystal HD)</option>
                <option value={Resolution.P4K} disabled={model === VeoModel.VEO_LITE}>4K Ultra HD (Requires premium model)</option>
              </CustomSelect>
            </div>
          </div>
        )}

        {/* 4. Controls Footer */}
        <div className="flex items-center justify-between border-t border-gray-900 pt-4 mt-1">
          {/* Toggle advance button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isSettingsOpen 
                ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400' 
                : 'border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontalIcon className="w-4 h-4" />
            {isSettingsOpen ? 'Hide Camera Settings' : 'Advanced Camera Settings'}
          </button>

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            {isPreparing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing Character...
              </>
            ) : (
              <>
                <ArrowRightIcon className="w-4 h-4" />
                Animate Candidate Voiceover
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;
