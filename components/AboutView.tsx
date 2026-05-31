/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PRESET_CHARACTERS } from './characters';
import { SparklesIcon, TvIcon, SlidersHorizontalIcon, FilmIcon } from './icons';

export const AboutView: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-10 text-gray-200 animate-in fade-in duration-300" id="about-view">
      {/* Hero Intro */}
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-3 py-4">
        <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Behind The Lens of History</span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          The Users Are Real.
        </h2>
        <p className="text-gray-400 text-base leading-relaxed mt-2">
          An advanced speech-to-video remastering sandbox. Resynthesize lost historic monologues and test delivery intonation by breathing movement and speech synchronization into high-fidelity candidate portraits using the state-of-the-art Google VEO 3.1 architecture.
        </p>
      </div>

      {/* Grid of Features / Mechanism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121214]/60 border border-gray-900 rounded-2xl p-6 flex flex-col gap-3 hover:border-gray-800 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center border border-indigo-900/40">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Visual Synthesis (VEO 3.1)</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Utilizes custom guided base64 starting frames. The generator references physical head shapes, clothing attire, and studio setups before initiating fluid sequential physical render processes.
          </p>
        </div>

        <div className="bg-[#121214]/60 border border-gray-900 rounded-2xl p-6 flex flex-col gap-3 hover:border-gray-800 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-purple-950/40 text-purple-400 flex items-center justify-center border border-purple-900/40">
            <SlidersHorizontalIcon className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Advanced Vocal Intonation</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            By segregating the words to be spoken from the vocal flow, you can orchestrate precise micro-gestures. Instruct candidates to whisper, deliver passionate battle cries, or display dry sarcasm.
          </p>
        </div>

        <div className="bg-[#121214]/60 border border-gray-900 rounded-2xl p-6 flex flex-col gap-3 hover:border-gray-800 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-pink-950/40 text-pink-400 flex items-center justify-center border border-pink-900/40">
            <FilmIcon className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Lip-Sync & Nods</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            The neural render tracks facial micro-expressions. Watch as eyes expand, cheeks elevate, and lips sync precisely to emphasize specific terms in the customized speech prompt.
          </p>
        </div>
      </div>

      {/* Meet the Candidates directory */}
      <div className="flex flex-col gap-6">
        <div className="border-b border-gray-900 pb-3">
          <h3 className="text-xl font-bold text-white">Candidate Slate</h3>
          <p className="text-xs text-gray-400 mt-0.5">Explore our list of ten predefined historical figures available for cinematic speech rendering.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_CHARACTERS.map((char) => (
            <div key={char.id} className="flex gap-4 p-4 bg-[#111112]/40 border border-gray-900 hover:border-gray-800 rounded-xl transition-all">
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-gray-800">
                <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-white">{char.name}</h4>
                <span className="text-xs text-indigo-400 font-medium mb-1.5">{char.title}</span>
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 italic" title={char.visualPrompt}>
                  Prompt: "{char.visualPrompt}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secret Prompt Tips */}
      <div className="bg-gradient-to-br from-indigo-950/20 via-black to-indigo-950/15 border border-indigo-900/40 rounded-2xl p-6 sm:p-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-indigo-400" />
          Tips for High-Fidelity Remastering
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-400 leading-relaxed">
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-gray-200">1. Punctuation Matters</h4>
            <p>
              Historical text reads better when structured. Use exclamation points (<span className="text-indigo-400 font-semibold">!</span>) for commanding moments and periods (<span className="text-indigo-400 font-semibold">.</span>) or ellipses (<span className="text-indigo-400 font-semibold">...</span>) to cause the candidates to breathe and display natural micro-pauses in speaking.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-gray-200">2. Upload custom High-Contrast faces</h4>
            <p>
              When uploading custom portraits to represent a spokesperson, use clear close-ups where the candidate is looking straight into the camera under bright lighting. This provides excellent keypoints for mouth synthesis.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-gray-200">3. Avoid conflicting intonations</h4>
            <p>
              Do not combine phrases like "whispering shouting". Stick to simple descriptors: "whispering with strict secrecy" or "delivering an aggressive national radio address."
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-gray-200">4. Resolution & Aspect Ratios</h4>
            <p>
              Choose <span className="text-indigo-400 font-semibold">Landscape (16:9)</span> for cinema projects and <span className="text-indigo-400 font-semibold">Portrait (9:16)</span> to test how historical figures would look speaking on mobile vertical feeds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
