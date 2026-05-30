/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Character, PRESET_CHARACTERS } from './characters';
import { PlusIcon, XMarkIcon, SparklesIcon, FileImageIcon } from './icons';
import { ImageFile } from '../types';

interface CharacterSelectorProps {
  selectedCharacter: Character | null;
  onSelectCharacter: (character: Character | null) => void;
  onCustomImageAdded: (imageFile: ImageFile | null) => void;
}

const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (base64) {
        resolve({ file, base64 });
      } else {
        reject(new Error('Failed to read file as base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacter,
  onSelectCharacter,
  onCustomImageAdded,
}) => {
  // Store both presets and any uploaded custom characters in local state
  const [characters, setCharacters] = useState<Character[]>(PRESET_CHARACTERS);
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customVisualPrompt, setCustomVisualPrompt] = useState('');
  const [customImage, setCustomImage] = useState<ImageFile | null>(null);
  
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageFile = await fileToImageFile(file);
        setCustomImage(imageFile);
        setIsUploadingCustom(true);
        // Default values to assist fast filling
        if (!customName) setCustomName(file.name.split('.')[0] || 'My Candidate');
        if (!customTitle) setCustomTitle('Custom Character');
        if (!customVisualPrompt) setCustomVisualPrompt('A realistic close-up video of a person speaking directly to the camera, with expressive lips');
      } catch (err) {
        console.error('Failed to read custom character image:', err);
      }
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImage) return;

    const newChar: Character = {
      id: `custom_${Date.now()}`,
      name: customName.trim() || 'Custom Character',
      title: customTitle.trim() || 'Individual Portrait',
      imageUrl: URL.createObjectURL(customImage.file), // Use blob object URL for local display
      visualPrompt: customVisualPrompt.trim() || 'A person speaking to the camera',
      defaultQuote: 'Enter your quote here.',
      defaultIntonation: 'Delivered in a professional, clear voice.',
    };

    setCharacters((prev) => [...prev, newChar]);
    onSelectCharacter(newChar);
    onCustomImageAdded(customImage); // Propagate the actual ImageFile for rendering/VEO startFrame

    // Reset Form State
    setCustomImage(null);
    setCustomName('');
    setCustomTitle('');
    setCustomVisualPrompt('');
    setIsUploadingCustom(false);
  };

  const handleCancelCustom = () => {
    setCustomImage(null);
    setCustomName('');
    setCustomTitle('');
    setCustomVisualPrompt('');
    setIsUploadingCustom(false);
  };

  // Helper to remove any custom added character from the deck
  const handleRemoveCustomChar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedCharacter?.id === id) {
      onSelectCharacter(PRESET_CHARACTERS[0] || null);
      onCustomImageAdded(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="character-selector-wrapper">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">1. Choose Candidate</h3>
          <p className="text-xs text-gray-400">Select who will voice your quote or upload a photo to render your own voice actor</p>
        </div>
      </div>

      {/* Characters Deck Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-1 pad-scroll">
        {characters.map((char) => {
          const isSelected = selectedCharacter?.id === char.id;
          const isCustom = char.id.startsWith('custom_');
          
          return (
            <button
              key={char.id}
              type="button"
              onClick={() => {
                onSelectCharacter(char);
                // If it is custom, the custom ImageFile was already provided,
                // but if we toggle back to normal preset we should reset customImage in App/PromptForm.
                if (!isCustom) {
                  onCustomImageAdded(null);
                }
              }}
              className={`group relative flex flex-col items-center bg-[#212123] p-2.5 rounded-xl border transition-all text-center focus:outline-none ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/20'
                  : 'border-transparent hover:border-gray-600 hover:bg-[#2a2a2d]'
              }`}
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2 rounded-full overflow-hidden border border-gray-700 bg-gray-800">
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Custom badge indicator */}
                {isCustom && (
                  <span className="absolute top-0 right-0 px-1.5 py-0.5 bg-purple-600 text-[8px] font-bold text-white rounded-bl">
                    User
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center w-full">
                <span className="text-xs font-semibold text-gray-200 line-clamp-1 w-full">
                  {char.name}
                </span>
                <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 w-full">
                  {char.title}
                </span>
              </div>

              {/* Delete custom character button */}
              {isCustom && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveCustomChar(e, char.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove Custom Candidate"
                >
                  <XMarkIcon className="w-3" />
                </button>
              )}
            </button>
          );
        })}

        {/* Upload Custom Card Trigger */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="flex flex-col items-center justify-center bg-[#18181a] p-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-indigo-950/10 text-gray-400 hover:text-white transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-2">
            <PlusIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Upload Photo</span>
          <span className="text-[9px] text-gray-500 mt-1 line-clamp-2">PNG / JPG face portrait</span>
          <input
            type="file"
            ref={uploadInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </button>
      </div>

      {/* Upload Custom Modal Form */}
      {isUploadingCustom && customImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveCustom}
            className="w-full max-w-md bg-[#1f1f21] border border-gray-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-250"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                Setup Custom Candidate
              </h4>
              <button
                type="button"
                onClick={handleCancelCustom}
                className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview & Details */}
            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 rounded-xl border border-gray-700 overflow-hidden bg-gray-800 shrink-0 shadow-lg">
                <img
                  src={URL.createObjectURL(customImage.file)}
                  alt="custom upload raw preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-grow flex flex-col gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. My Boss, Queen Cleopatra Lookalike"
                    className="w-full bg-[#121214] border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. CEO, Senior Speaker"
                    className="w-full bg-[#121214] border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Prompt description of this user photo */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1 flex justify-between">
                <span>Visual Prompt Descriptor</span>
                <span className="text-indigo-400 hover:underline cursor-help" title="To help the VEO AI capture the exact details of your photo">Help</span>
              </label>
              <textarea
                value={customVisualPrompt}
                onChange={(e) => setCustomVisualPrompt(e.target.value)}
                placeholder="A detailed cinematic close-up of a person with dark hair, looking stately, wearing casual clothing, speaking and moving realistically."
                rows={3}
                className="w-full bg-[#121214] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
              />
              <p className="text-[10px] text-gray-500 mt-1 italic">
                Describe the eyes, hair, clothes, and scene of the uploaded picture so VEO matches the motion perfectly.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-800 pt-4 mt-2">
              <button
                type="button"
                onClick={handleCancelCustom}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
              >
                Save Candidate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
