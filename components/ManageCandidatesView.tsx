/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Character, PRESET_CHARACTERS } from './characters';
import { PlusIcon, XMarkIcon, SparklesIcon, FileImageIcon, ArrowPathIcon } from './icons';
import { Pencil, Trash2, Camera, Check, RefreshCw, AlertCircle, Info, Lock, Unlock, KeyRound } from 'lucide-react';

interface ManageCandidatesProps {
  characters: Character[];
  onUpdateCharacters: (chars: Character[]) => void;
  onResetToDefaults: () => void;
}

export const ManageCandidatesView: React.FC<ManageCandidatesProps> = ({
  characters,
  onUpdateCharacters,
  onResetToDefaults,
}) => {
  // Authentication & Passcode protection states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('candidates_registry_auth') === 'true';
  });
  const [storedPassword, setStoredPassword] = useState<string>(() => {
    return localStorage.getItem('candidates_registry_password') || 'admin';
  });
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Customizing default security passcode
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');

  const [editingCharId, setEditingCharId] = useState<string | null>(null);

  // Form states for Editing or Creating
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editVisualPrompt, setEditVisualPrompt] = useState('');
  const [editDefaultQuote, setEditDefaultQuote] = useState('');
  const [editDefaultIntonation, setEditDefaultIntonation] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  // Floating trigger for "Create New Candidate"
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newVisualPrompt, setNewVisualPrompt] = useState('');
  const [newDefaultQuote, setNewDefaultQuote] = useState('Write your speech here.');
  const [newDefaultIntonation, setNewDefaultIntonation] = useState('Steady speaking cadence, clear voice.');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const triggerNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Convert uploaded image to Data URL to store in characters array securely
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCreating: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (isCreating) {
          setNewImageUrl(dataUrl);
          if (!newName) {
            setNewName(file.name.split('.')[0] || '');
          }
        } else {
          setEditImageUrl(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Turn on Edit Mode for a single candidate
  const startEditing = (char: Character) => {
    setEditingCharId(char.id);
    setEditName(char.name);
    setEditTitle(char.title);
    setEditVisualPrompt(char.visualPrompt);
    setEditDefaultQuote(char.defaultQuote);
    setEditDefaultIntonation(char.defaultIntonation);
    setEditImageUrl(char.imageUrl);
  };

  // Save changes to current edited candidate
  const saveCandidateChanges = (id: string) => {
    if (!editName.trim()) return;

    const updated = characters.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          name: editName.trim(),
          title: editTitle.trim(),
          visualPrompt: editVisualPrompt.trim(),
          defaultQuote: editDefaultQuote.trim(),
          defaultIntonation: editDefaultIntonation.trim(),
          imageUrl: editImageUrl || c.imageUrl,
        };
      }
      return c;
    });

    onUpdateCharacters(updated);
    setEditingCharId(null);
    triggerNotification(`Updated candidate details for "${editName}" successfully.`);
  };

  // Create brand new custom candidate
  const handleCreateCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Use a default avatar if no image uploaded
    const imgUrlToUse = newImageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400&h=400';

    const newChar: Character = {
      id: `candidate_${Date.now()}`,
      name: newName.trim(),
      title: newTitle.trim() || 'Custom Representative',
      visualPrompt: newVisualPrompt.trim() || 'A professional speaking naturally directly to the camera, studio background.',
      defaultQuote: newDefaultQuote.trim(),
      defaultIntonation: newDefaultIntonation.trim(),
      imageUrl: imgUrlToUse,
    };

    onUpdateCharacters([...characters, newChar]);
    
    // Reset Form
    setNewName('');
    setNewTitle('');
    setNewVisualPrompt('');
    setNewDefaultQuote('Write your speech here.');
    setNewDefaultIntonation('Steady speaking cadence, clear voice.');
    setNewImageUrl('');
    setShowCreateModal(false);

    triggerNotification(`Created custom representative "${newChar.name}"!`);
  };

  // Delete a customer candidate
  const deleteCandidate = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your candidates database?`)) {
      onUpdateCharacters(characters.filter((c) => c.id !== id));
      triggerNotification(`Removed representative "${name}".`);
    }
  };

  // Action handles for security locks
  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword.trim() === storedPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('candidates_registry_auth', 'true');
      setPasswordError('');
      setEnteredPassword('');
    } else {
      setPasswordError('Invalid credentials. Access Denied.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordVal.trim()) {
      alert('Password cannot be empty.');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      alert('Passwords do not match.');
      return;
    }

    setStoredPassword(newPasswordVal);
    localStorage.setItem('candidates_registry_password', newPasswordVal);
    setShowPasswordChangeModal(false);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    triggerNotification('Security passcode updated successfully.', 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('candidates_registry_auth');
    triggerNotification('Logged out from Candidate Workspace.', 'info');
  };

  // If unauthorized, return the Secure Login Screen
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto my-12 bg-[#111112]/40 border border-gray-900 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-in fade-in duration-300" id="registry-lock-box">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-550/30 flex items-center justify-center text-indigo-400 shadow-inner">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xl font-bold text-white tracking-tight">Security Credentials Required</h3>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
            Candidate Database Workspace
          </span>
          <p className="text-xs text-gray-400 leading-relaxed mt-2">
            The candidate list and starting frame references represent real people. To safeguard privacy, this environment requires session passcode validation.
          </p>
        </div>

        <form onSubmit={handleAuthenticate} className="w-full flex flex-col gap-4">
          <div className="relative">
            <input
              type="password"
              required
              placeholder="Enter passcode"
              value={enteredPassword}
              onChange={(e) => {
                setEnteredPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className="w-full bg-[#161618] border border-gray-850 hover:border-gray-800 transition-colors focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none text-center"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-[10px] mt-1.5 font-semibold text-center leading-none">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono tracking-wider shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            UNSHIELD REGISTRY
          </button>
        </form>

        <div className="border-t border-gray-900 w-full pt-4 text-[10px] text-gray-500 flex flex-col gap-1.5">
          <span>Standard developer trial credential: <strong className="font-mono text-gray-400 selection:bg-indigo-500">admin</strong></span>
          <span className="text-xs italic text-[9px] text-gray-600">Once logged in, you can configure your own customized password.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-300" id="manage-candidates-view">
      {/* Page Title Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111112]/40 border border-gray-900 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-indigo-400" />
            Candidate Registry
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
            View, upload, or replace front-facing studio frame portraits representing your speakers. The image starting frame acts as the precise visual baseline for downstream VEO video synthesis.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <button
            type="button"
            onClick={() => setShowPasswordChangeModal(true)}
            className="px-3 py-2 border border-gray-800 hover:border-indigo-500/80 hover:bg-indigo-950/20 text-gray-400 hover:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Change passcode passcode"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            Passcode
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 border border-gray-800 hover:border-red-500/80 bg-red-950/5 hover:bg-red-950/20 text-gray-400 hover:text-red-350 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Lock candidate environment"
          >
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            Lock
          </button>

          <button
            type="button"
            onClick={onResetToDefaults}
            className="px-3 py-1.5 border border-dashed border-gray-800 hover:border-gray-705 hover:bg-gray-900/20 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Restore original 10 historical lookalikes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restore Defaults
          </button>
          
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-900/20 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Floating Notifications */}
      {notification && (
        <div className="bg-indigo-950 border border-indigo-500/30 text-indigo-300 p-3 px-5 rounded-xl text-xs flex items-center gap-2 shadow-2xl animate-bounce">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Candidate Cards Base */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {characters.map((char) => {
          const isEditing = editingCharId === char.id;
          const isCustom = !PRESET_CHARACTERS.some((p) => p.id === char.id);

          return (
            <div
              key={char.id}
              className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                isEditing
                  ? 'border-indigo-500 bg-indigo-950/5 ring-1 ring-indigo-500/20'
                  : 'border-gray-900 bg-[#111112]/20 hover:border-gray-800 hover:bg-[#111112]/40'
              }`}
            >
              {/* Card visual layout */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                
                {/* Frame portrait avatar */}
                <div className="relative group shrink-0 w-28 h-28 mx-auto sm:mx-0 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 flex items-center justify-center">
                  <img
                    src={isEditing ? editImageUrl : char.imageUrl}
                    alt={char.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      Upload Frame
                    </button>
                  )}

                  {!isEditing && isCustom && (
                    <span className="absolute top-1 right-1 bg-purple-600 text-[8px] font-bold px-1.5 py-0.5 rounded text-white shadow-lg">
                      Custom
                    </span>
                  )}
                </div>

                {/* Candidate Information properties */}
                <div className="flex-grow w-full flex flex-col gap-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      {/* Name input */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Candidate Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>

                      {/* Title input */}
                      <div>
                        <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Title / Description</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-base font-bold text-white">{char.name}</h4>
                      <span className="text-xs text-indigo-400 font-medium">{char.title}</span>
                    </div>
                  )}

                  {/* Character visual prompt descriptor */}
                  <div className="text-xs">
                    <label className="text-[9px] uppercase font-semibold text-gray-500">Visual Prompt Descriptor</label>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={editVisualPrompt}
                        onChange={(e) => setEditVisualPrompt(e.target.value)}
                        placeholder="Describe clothes, scenery, and general physical face settings"
                        className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2 py-1 text-xs text-gray-300 resize-none focus:outline-none mt-1"
                      />
                    ) : (
                      <p className="text-gray-400 leading-relaxed italic mt-0.5 line-clamp-2" title={char.visualPrompt}>
                        "{char.visualPrompt}"
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Editing Default Quotes & Intonation presets */}
              {isEditing && (
                <div className="grid grid-cols-2 gap-3 mt-4 border-t border-indigo-900/30 pt-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-gray-500">Default Quote</label>
                    <textarea
                      rows={2}
                      value={editDefaultQuote}
                      onChange={(e) => setEditDefaultQuote(e.target.value)}
                      className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2 py-1 text-xs text-gray-300 resize-none focus:outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-gray-500">Default Intonation</label>
                    <textarea
                      rows={2}
                      value={editDefaultIntonation}
                      onChange={(e) => setEditDefaultIntonation(e.target.value)}
                      className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2 py-1 text-xs text-gray-300 resize-none focus:outline-none mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-5 border-t border-gray-900 pt-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingCharId(null)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveCandidateChanges(char.id)}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs flex items-center gap-1 font-bold transition-all shadow shadow-green-950"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Frame Details
                    </button>
                  </>
                ) : (
                  <>
                    {/* Delete Custom Candidate */}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => deleteCandidate(char.id, char.name)}
                        className="px-3 py-1.5 border border-red-900/40 hover:border-red-500 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded text-xs flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}

                    {/* Edit Details Trigger */}
                    <button
                      type="button"
                      onClick={() => startEditing(char)}
                      className="px-3 py-1.5 border border-gray-800 hover:border-indigo-500 bg-gray-950/20 hover:bg-indigo-950/10 text-gray-300 hover:text-indigo-300 rounded text-xs flex items-center gap-1 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                      Configure Candidate
                    </button>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Invisible file input for edits */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleImageFileChange(e, false)}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Modal for Adding Brand-New Candidates */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateCandidateSubmit}
            className="w-full max-w-lg bg-[#141416] border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
                Enroll New Custom Candidate
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-850 rounded-full text-gray-400 hover:text-white transition-colors animate-pulse"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Upload portrait image state */}
            <div className="flex flex-col sm:flex-row gap-5 items-center bg-[#0d0d0f] p-4 rounded-xl border border-gray-900">
              <div className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-800 bg-gray-950 shrink-0">
                {newImageUrl ? (
                  <img src={newImageUrl} alt="Preview custom portrait upload" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-gray-600 text-center px-1">
                    <Camera className="w-6 h-6 mb-1 text-gray-700" />
                    No Frame
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => createFileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-[9px] text-indigo-300 opacity-100 group-hover:bg-black/90 cursor-pointer"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  Upload Photo
                </button>
              </div>

              <div className="flex-grow flex flex-col gap-2 w-full">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Representative Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Eleanor Roosevelt"
                    className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none mt-0.5"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Title / Affiliation</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Diplomat & Activist"
                    className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Visual Descriptor Prompt */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Visual Descriptor Prompt</label>
              <textarea
                required
                rows={3}
                value={newVisualPrompt}
                onChange={(e) => setNewVisualPrompt(e.target.value)}
                placeholder="Describe details like clothing, backdrop, haircut, and posture of your uploaded speaker image..."
                className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded p-2.5 text-xs text-gray-250 focus:outline-none mt-1 resize-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Note: Describing facial features, hair, sunglasses, or clothing styles assists the VEO AI in capturing and maintaining the physical appearance of the candidate during lip-sync.
              </p>
            </div>

            {/* Default monologues */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Default quote</label>
                <textarea
                  rows={2}
                  value={newDefaultQuote}
                  onChange={(e) => setNewDefaultQuote(e.target.value)}
                  className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded p-2 text-xs text-gray-300 resize-none focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Default intonation</label>
                <textarea
                  rows={2}
                  value={newDefaultIntonation}
                  onChange={(e) => setNewDefaultIntonation(e.target.value)}
                  className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded p-2 text-xs text-gray-300 resize-none focus:outline-none mt-1"
                />
              </div>
            </div>

            {/* Action Group */}
            <div className="flex justify-end gap-2.5 border-t border-gray-900 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/40"
              >
                Save Representative
              </button>
            </div>

            <input
              type="file"
              ref={createFileInputRef}
              onChange={(e) => handleImageFileChange(e, true)}
              accept="image/*"
              className="hidden"
            />
          </form>
        </div>
      )}

      {/* Strict Instruction Card */}
      <div className="bg-[#1c1c1e]/40 p-5 border border-indigo-950 rounded-2xl flex gap-4 items-start">
        <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest text-[10px]">Strict Camera Constraints Active</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            To preserve physical integrity, all speech animations generated in this application automatically enforce a strict anti-motion camera prompt. Downstream VEO runs prevent panning, tilting, or zooming, guaranteeing that only the speaking mouth and facial elements move against a static starting frame block.
          </p>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleChangePassword}
            className="w-full max-w-sm bg-[#141416] border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in shadow-indigo-950"
          >
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                Change Workspace Passcode
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChangeModal(false);
                  setNewPasswordVal('');
                  setConfirmPasswordVal('');
                }}
                className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">New Passcode</label>
                <input
                  type="password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Minimum 1 character"
                  className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Confirm Passcode</label>
                <input
                  type="password"
                  required
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Re-type new passcode"
                  className="w-full bg-[#161618] border border-gray-800 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-gray-900 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChangeModal(false);
                  setNewPasswordVal('');
                  setConfirmPasswordVal('');
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg"
              >
                Update Credentials
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
