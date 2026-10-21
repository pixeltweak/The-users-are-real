/**
 * Client service for interacting with the backend Google Veo video generation pipeline.
 * All @google/genai SDK operations are performed securely on the server.
 */
import { VEO_STAGE_MESSAGES, VEO_CONFIG_DEFAULTS } from '../promptInstructions';
import { GenerateVideoParams } from '../types';

export interface VeoGenerationRequest {
  quote: string;
  candidateName?: string;
  imageBase64?: string;
  customPrompt?: string;
  model?: 'veo-3.1-lite-generate-preview' | 'veo-3.1-generate-preview';
  resolution?: '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: 5 | 6 | 8;
  onProgress?: (progress: number, stageMessage: string) => void;
}

export interface VeoGenerationResult {
  videoBlob: Blob;
  videoUrl: string;
  durationSec: number;
}

/**
 * Safely parse JSON from a fetch Response, preventing WebKit's
 * DOMException: "The string did not match the expected pattern"
 * when a non-JSON or HTML error page is returned.
 */
async function safeJsonParse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    // If not valid JSON, treat as error text or fallback
    return { error: text.length < 300 ? text : `Server returned status ${res.status}` };
  }
}

export async function checkVeoServerStatus(): Promise<{ available: boolean; defaultModel: string }> {
  try {
    const res = await fetch('/api/veo/status');
    if (!res.ok) throw new Error('Status check failed');
    return await safeJsonParse(res);
  } catch {
    return { available: false, defaultModel: VEO_CONFIG_DEFAULTS.defaultModel };
  }
}

export async function generateVeoVideo(request: VeoGenerationRequest): Promise<VeoGenerationResult> {
  const {
    quote,
    candidateName = 'Hermione',
    imageBase64,
    customPrompt,
    model = VEO_CONFIG_DEFAULTS.defaultModel,
    resolution = VEO_CONFIG_DEFAULTS.resolution,
    durationSeconds = 6,
    onProgress,
  } = request;

  onProgress?.(5, 'Connecting to server and initiating Google Veo pipeline...');

  // 1. Start generation
  let startRes: Response;
  try {
    startRes = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote,
        candidateName,
        imageBase64,
        prompt: customPrompt?.trim() || undefined,
        model,
        resolution,
        aspectRatio: '16:9',
        durationSeconds,
      }),
    });
  } catch (netErr: any) {
    throw new Error(
      netErr?.message === 'Load failed'
        ? 'Could not connect to the video generation server. Please check your connection and retry.'
        : `Network error connecting to video pipeline: ${netErr?.message || netErr}`
    );
  }

  const startData = await safeJsonParse(startRes);
  if (!startRes.ok) {
    throw new Error(startData.error || `Veo initiation error (${startRes.status})`);
  }

  const { operationName } = startData;
  if (!operationName) {
    throw new Error('Server did not return a valid Veo operationName');
  }

  // 2. Poll for completion
  let done = false;
  let attempts = 0;
  const pollIntervalMs = 6500;
  let currentMsgIndex = 0;
  while (!done) {
    attempts++;
    // Smooth progress curve from 15% up to 94%
    const estimatedProgress = Math.min(94, 15 + Math.round((1 - Math.exp(-attempts * 0.12)) * 78));
    const msg = VEO_STAGE_MESSAGES[currentMsgIndex % VEO_STAGE_MESSAGES.length];
    currentMsgIndex++;
    onProgress?.(estimatedProgress, msg);

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    let pollRes: Response;
    try {
      pollRes = await fetch('/api/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
    } catch (pollErr: any) {
      console.warn('Transient polling network issue, will retry...', pollErr);
      continue;
    }

    if (!pollRes.ok) {
      console.warn('Transient polling issue, retrying...', pollRes.status);
      continue;
    }

    const pollData = await safeJsonParse(pollRes);
    if (pollData.error) {
      throw new Error(pollData.error.message || pollData.error || 'Veo generation operation failed');
    }

    if (pollData.done) {
      done = true;
    }
  }

  // 3. Download the finished video
  onProgress?.(96, 'Downloading high-definition video from Veo...');

  let downloadRes: Response;
  try {
    downloadRes = await fetch('/api/video-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName }),
    });
  } catch (dlNetErr: any) {
    throw new Error(
      dlNetErr?.message === 'Load failed'
        ? 'Video generation completed, but downloading the media failed. Please check your connection.'
        : `Failed to download video: ${dlNetErr?.message || dlNetErr}`
    );
  }

  if (!downloadRes.ok) {
    const errorData = await safeJsonParse(downloadRes);
    throw new Error(errorData.error || `Failed to download completed video (${downloadRes.status})`);
  }

  const videoBlob = await downloadRes.blob();
  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('Downloaded video data was empty.');
  }

  const videoUrl = URL.createObjectURL(videoBlob);

  onProgress?.(100, 'Video generation complete!');

  return {
    videoBlob,
    videoUrl,
    durationSec: Number(durationSeconds) || 8.0,
  };
}

/**
 * Extracts the last stable frame of a video blob or URL as a base64 image dataUrl.
 * Enables zero jump-cut keyframe chaining between continuous video clips.
 */
export async function extractLastFrame(videoSource: Blob | string): Promise<string> {
  if (typeof window === 'undefined') return '';
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const url = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
    video.src = url;

    let resolved = false;
    const cleanup = () => {
      if (typeof videoSource !== 'string') {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    };

    video.onloadedmetadata = () => {
      const seekTime = Math.max(0, video.duration - 0.25);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if (resolved) return;
      resolved = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve('');
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        console.warn('Could not extract frame from video canvas:', err);
        resolve('');
      }
    };

    video.onerror = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve('');
    };

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve('');
      }
    }, 4000);
  });
}

export interface GeneratedSegment {
  id: string;
  quote: string;
  durationSec: number;
  videoUrl: string;
  videoBlob: Blob;
}

export interface ExtendedSequenceResult {
  primaryBlob: Blob;
  primaryUrl: string;
  totalDurationSec: number;
  segments: GeneratedSegment[];
}

/**
 * Generates an extended multi-clip video interview with continuity chaining.
 * Automatically chains the last frame of each clip as the anchor for the next.
 */
export async function generateVeoExtendedSequence(options: {
  segments: string[];
  candidateName?: string;
  baseImage: string;
  onProgress?: (progress: number, stageMessage: string) => void;
}): Promise<ExtendedSequenceResult> {
  const { segments, candidateName = 'Hermione', baseImage, onProgress } = options;
  if (!segments || segments.length === 0) {
    throw new Error('No segments provided for extended video sequence.');
  }

  const generatedSegments: GeneratedSegment[] = [];
  let currentImage = baseImage;

  for (let i = 0; i < segments.length; i++) {
    const segQuote = segments[i];
    const isFirst = i === 0;
    const basePct = Math.round((i / segments.length) * 100);
    const segPctSpan = Math.round(100 / segments.length);

    onProgress?.(
      basePct + 5,
      `Rendering Part ${i + 1} of ${segments.length}: "${segQuote.slice(0, 32)}..."`
    );

    const result = await generateVeoVideo({
      quote: segQuote,
      candidateName,
      imageBase64: currentImage,
      durationSeconds: 8,
      onProgress: (pct, stage) => {
        const scaledPct = Math.min(
          99,
          basePct + Math.round((pct / 100) * segPctSpan)
        );
        onProgress?.(
          scaledPct,
          `Part ${i + 1}/${segments.length}: ${stage}`
        );
      },
    });

    generatedSegments.push({
      id: `seg-${Date.now()}-${i}`,
      quote: segQuote,
      durationSec: result.durationSec || 8.0,
      videoUrl: result.videoUrl,
      videoBlob: result.videoBlob,
    });

    // If there is a next clip, extract the last frame of this clip to guarantee zero jump-cut continuity
    if (i < segments.length - 1) {
      onProgress?.(
        basePct + segPctSpan,
        `Extracting last frame of Part ${i + 1} for seamless continuity into Part ${i + 2}...`
      );
      try {
        const lastFrameData = await extractLastFrame(result.videoBlob);
        if (lastFrameData && lastFrameData.startsWith('data:image/')) {
          currentImage = lastFrameData;
        } else {
          currentImage = baseImage;
        }
      } catch {
        currentImage = baseImage;
      }
    }
  }

  onProgress?.(100, `Extended interview complete (${generatedSegments.length} parts chained)!`);

  return {
    primaryBlob: generatedSegments[0].videoBlob,
    primaryUrl: generatedSegments[0].videoUrl,
    totalDurationSec: generatedSegments.length * 8.0,
    segments: generatedSegments,
  };
}

/**
 * Compatibility wrapper for BulkGenerateView and PromptForm components
 */
export async function generateVideo(params: GenerateVideoParams): Promise<{ objectUrl: string; blob: Blob }> {
  let imageBase64: string | undefined;
  if (params.startFrame?.base64) {
    imageBase64 = `data:image/jpeg;base64,${params.startFrame.base64}`;
  }

  const result = await generateVeoVideo({
    quote: params.prompt,
    customPrompt: params.prompt,
    imageBase64,
    model: params.model as any,
    resolution: params.resolution as any,
    aspectRatio: params.aspectRatio as any,
  });

  return {
    objectUrl: result.videoUrl,
    blob: result.videoBlob,
  };
}
