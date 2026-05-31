
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import {CurvedArrowDownIcon} from './components/icons';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import VideoResult from './components/VideoResult';
import {generateVideo} from './services/geminiService';
import {AboutView} from './components/AboutView';
import {BulkGenerateView} from './components/BulkGenerateView';
import {ManageCandidatesView} from './components/ManageCandidatesView';
import {Character, PRESET_CHARACTERS} from './components/characters';
import {
  AppState,
  AspectRatio,
  GenerateVideoParams,
  GenerationMode,
  Resolution,
  VeoModel,
  VideoFile,
} from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GenerateVideoParams | null>(
    null,
  );
  const [lastVideoObject, setLastVideoObject] = useState<Video | null>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  const [initialFormValues, setInitialFormValues] =
    useState<GenerateVideoParams | null>(null);

  // Load custom candidates and edits securely from localStorage
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('historical_characters_registry');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse cached historical characters registry', e);
      }
    }
    return PRESET_CHARACTERS;
  });

  const [activeTab, setActiveTab] = useState<'generate' | 'bulk' | 'candidates' | 'about'>('generate');

  const handleUpdateCharacters = (newChars: Character[]) => {
    setCharacters(newChars);
    localStorage.setItem('historical_characters_registry', JSON.stringify(newChars));
  };

  const handleAddCustomCharacter = (char: Character) => {
    const updated = [...characters, char];
    handleUpdateCharacters(updated);
  };

  const handleRemoveCustomCharacter = (id: string) => {
    const updated = characters.filter((c) => c.id !== id);
    handleUpdateCharacters(updated);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to restore the 10 original lookalike presets and delete any custom representatives?')) {
      handleUpdateCharacters(PRESET_CHARACTERS);
    }
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const showStatusError = (message: string) => {
    setErrorMessage(message);
    setAppState(AppState.ERROR);
  };

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        console.warn(
          'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
          error,
        );
        setShowApiKeyDialog(true);
        return;
      }
    }

    setAppState(AppState.LOADING);
    setErrorMessage(null);
    setLastConfig(params);
    setInitialFormValues(null);

    try {
      const {objectUrl, blob, video} = await generateVideo(params);
      setVideoUrl(objectUrl);
      setLastVideoBlob(blob);
      setLastVideoObject(video);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error('Video generation failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';

      let userFriendlyMessage = `Video generation failed: ${errorMessage}`;
      let shouldOpenDialog = false;

      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Requested entity was not found.')) {
          userFriendlyMessage =
            'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
          shouldOpenDialog = true;
        } else if (
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API key not valid') ||
          errorMessage.toLowerCase().includes('permission denied') ||
          errorMessage.includes('403')
        ) {
          userFriendlyMessage =
            'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
          shouldOpenDialog = true;
        }
      }

      setErrorMessage(userFriendlyMessage);
      setAppState(AppState.ERROR);

      if (shouldOpenDialog) {
        setShowApiKeyDialog(true);
      }
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastConfig) {
      handleGenerate(lastConfig);
    }
  }, [lastConfig, handleGenerate]);

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    if (appState === AppState.ERROR && lastConfig) {
      handleRetry();
    }
  };

  const handleNewVideo = useCallback(() => {
    setAppState(AppState.IDLE);
    setVideoUrl(null);
    setErrorMessage(null);
    setLastConfig(null);
    setLastVideoObject(null);
    setLastVideoBlob(null);
    setInitialFormValues(null);
  }, []);

  const handleTryAgainFromError = useCallback(() => {
    if (lastConfig) {
      setInitialFormValues(lastConfig);
      setAppState(AppState.IDLE);
      setErrorMessage(null);
    } else {
      handleNewVideo();
    }
  }, [lastConfig, handleNewVideo]);

  const handleExtend = useCallback(async () => {
    if (lastConfig && lastVideoBlob && lastVideoObject) {
      try {
        const file = new File([lastVideoBlob], 'last_video.mp4', {
          type: lastVideoBlob.type,
        });
        const videoFile: VideoFile = {file, base64: ''};

        setInitialFormValues({
          ...lastConfig,
          model: lastConfig.model === VeoModel.VEO_LITE ? VeoModel.VEO_FAST : lastConfig.model,
          mode: GenerationMode.EXTEND_VIDEO,
          prompt: '', 
          inputVideo: videoFile, 
          inputVideoObject: lastVideoObject, 
          resolution: Resolution.P720, 
          startFrame: null,
          endFrame: null,
          referenceImages: [],
          styleImage: null,
          isLooping: false,
        });

        setAppState(AppState.IDLE);
        setVideoUrl(null);
        setErrorMessage(null);
      } catch (error) {
        console.error('Failed to process video for extension:', error);
        const message =
          error instanceof Error ? error.message : 'An unknown error occurred.';
        showStatusError(`Failed to prepare video for extension: ${message}`);
      }
    }
  }, [lastConfig, lastVideoBlob, lastVideoObject]);

  const renderError = (message: string) => (
    <div className="text-center bg-red-900/20 border border-red-500 p-8 rounded-lg">
      <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
      <p className="text-red-300">{message}</p>
      <button
        onClick={handleTryAgainFromError}
        className="mt-6 px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  const canExtend = lastConfig?.resolution === Resolution.P720 && lastConfig?.model !== VeoModel.VEO_LITE;

  return (
    <div className="min-h-screen bg-black text-gray-200 flex flex-col font-sans overflow-y-auto pb-12">
      {showApiKeyDialog && (
        <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />
      )}

      {/* Consistent, elegant top navigation bar */}
      <header className="bg-[#0b0b0c]/90 backdrop-blur-md border-b border-gray-900 sticky top-0 z-40 w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Branding Logo & Back to Generate home */}
        <div 
          onClick={() => setActiveTab('generate')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-900/40 group-hover:scale-105 transition-transform">
            <span className="text-xs font-black text-white tracking-widest">UR</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold tracking-tight text-white group-hover:text-indigo-450 transition-colors">
              The Users Are Real
            </h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
              Historical voiceover synthesis
            </span>
          </div>
        </div>

        {/* Central visual navigation links */}
        <nav className="flex items-center gap-1 bg-[#121214] border border-gray-800 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'generate'
                ? 'bg-[#1c1c1e] text-indigo-400 font-bold border border-gray-800 shadow shadow-black'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            Generate
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'bulk'
                ? 'bg-[#1c1c1e] text-indigo-400 font-bold border border-gray-800 shadow shadow-black'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            Bulk Generate
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'candidates'
                ? 'bg-[#1c1c1e] text-indigo-400 font-bold border border-gray-800 shadow shadow-black'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            Candidates
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'about'
                ? 'bg-[#1c1c1e] text-indigo-400 font-bold border border-gray-800 shadow shadow-black'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            About
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto flex-grow flex flex-col p-4 mt-2">
        {activeTab === 'about' && (
          <AboutView />
        )}

        {activeTab === 'bulk' && (
          <BulkGenerateView characters={characters} />
        )}

        {activeTab === 'candidates' && (
          <ManageCandidatesView
            characters={characters}
            onUpdateCharacters={handleUpdateCharacters}
            onResetToDefaults={handleResetToDefaults}
          />
        )}

        {activeTab === 'generate' && (
          appState === AppState.IDLE ? (
            <div className="w-full bg-[#111112]/40 border border-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl">
              <PromptForm
                characters={characters}
                onGenerate={handleGenerate}
                initialValues={initialFormValues}
                onAddCustomCharacter={handleAddCustomCharacter}
                onRemoveCustomCharacter={handleRemoveCustomCharacter}
              />
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center w-full">
              {appState === AppState.LOADING && <LoadingIndicator />}
              {appState === AppState.SUCCESS && videoUrl && (
                <VideoResult
                  videoUrl={videoUrl}
                  onRetry={handleRetry}
                  onNewVideo={handleNewVideo}
                  onExtend={handleExtend}
                  canExtend={canExtend}
                  aspectRatio={lastConfig?.aspectRatio || AspectRatio.LANDSCAPE}
                />
              )}
              {appState === AppState.SUCCESS &&
                !videoUrl &&
                renderError(
                  'Video generated, but URL is missing. Please try again.',
                )}
              {appState === AppState.ERROR &&
                errorMessage &&
                renderError(errorMessage)}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;
