import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { buildVeoPrompt, VEO_CONFIG_DEFAULTS } from './promptInstructions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();

// Enable JSON parser with sufficient limit for base64 image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get active Gemini API key
const getApiKey = (): string => {
  return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
};

// Initialize Gemini SDK with telemetry header
const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health and Veo capability status endpoint
app.get('/api/veo/status', (_req, res) => {
  const apiKey = getApiKey();
  res.json({
    available: !!apiKey,
    defaultModel: VEO_CONFIG_DEFAULTS.defaultModel,
    supportedModels: VEO_CONFIG_DEFAULTS.supportedModels,
  });
});

// Step 1: Start video generation with Veo
app.post('/api/generate-video', async (req, res) => {
  try {
    const {
      prompt,
      quote,
      candidateName = 'Hermione',
      imageBase64,
      model = VEO_CONFIG_DEFAULTS.defaultModel,
      resolution = VEO_CONFIG_DEFAULTS.resolution,
      aspectRatio = VEO_CONFIG_DEFAULTS.aspectRatio,
      durationSeconds = 6,
    } = req.body;

    const ai = getAiClient();

    // Prepare prompt using centralized prompt instruction generator
    const finalPrompt = prompt || buildVeoPrompt({ candidateName, quote: quote || 'User research feedback quote' });

    // Google Veo supports durationSeconds between 5 and 8 seconds
    const parsedDuration = Math.min(Math.max(Number(durationSeconds) || 6, 5), 8);

    const config: any = {
      numberOfVideos: VEO_CONFIG_DEFAULTS.numberOfVideos,
      resolution: resolution === '1080p' ? '1080p' : '720p',
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      durationSeconds: parsedDuration,
    };

    const payload: any = {
      model,
      prompt: finalPrompt,
      config,
    };

    // If an image was provided, add it to payload
    if (imageBase64 && typeof imageBase64 === 'string') {
      try {
        if (imageBase64.startsWith('data:')) {
          const match = imageBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
          if (match) {
            const mimeType = match[1];
            const cleanBase64 = match[2].replace(/\s+/g, '');
            payload.image = {
              mimeType,
              imageBytes: cleanBase64,
            };
          }
        } else if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
          // Fetch remote image and convert to base64
          const imgResponse = await fetch(imageBase64);
          if (imgResponse.ok) {
            const buffer = await imgResponse.arrayBuffer();
            const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
            payload.image = {
              mimeType,
              imageBytes: Buffer.from(buffer).toString('base64'),
            };
          }
        } else if (imageBase64.startsWith('/') || imageBase64.includes('assets/')) {
          // Read local file from public folder
          try {
            const fs = await import('fs/promises');
            const cleanPath = imageBase64.replace(/^\/+/, '');
            const possiblePaths = [
              path.join(__dirname, 'public', cleanPath),
              path.join(process.cwd(), 'public', cleanPath),
              path.join(__dirname, cleanPath),
              path.join(process.cwd(), cleanPath),
            ];
            let fileBuffer: Buffer | null = null;
            for (const p of possiblePaths) {
              try {
                fileBuffer = await fs.readFile(p);
                break;
              } catch {
                // Try next path
              }
            }
            if (fileBuffer) {
              const mimeType = imageBase64.endsWith('.png') ? 'image/png' : 'image/jpeg';
              payload.image = {
                mimeType,
                imageBytes: fileBuffer.toString('base64'),
              };
            }
          } catch (localErr) {
            console.warn('Failed to read local file for Veo:', localErr);
          }
        }
      } catch (imgErr) {
        console.warn('Failed to parse candidate image for Veo, continuing with text-to-video:', imgErr);
      }
    }

    console.log('Initiating Veo video generation with model:', model);
    const operation = await ai.models.generateVideos(payload);
    console.log('Veo operation created:', operation.name);

    res.json({
      operationName: operation.name,
      model,
      prompt: finalPrompt,
    });
  } catch (error: any) {
    console.error('Error starting Veo video generation:', error);
    res.status(500).json({
      error: error.message || 'Failed to start video generation',
      details: error.toString(),
    });
  }
});

// Step 2: Poll operation status
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    // Detect Responsible AI filtering or safety blocks
    const raiCount = updated.response?.raiMediaFilteredCount;
    const raiReasons = updated.response?.raiMediaFilteredReasons;
    if (raiCount || (raiReasons && raiReasons.length > 0)) {
      const message =
        raiReasons?.join(' ') ||
        'The generation request was filtered by Google content safety guidelines. Please modify the quote or prompt and try again.';
      return res.json({
        done: true,
        error: { message },
        filtered: true,
        responseSummary: 'Filtered by safety guidelines',
      });
    }

    if (updated.error) {
      return res.json({
        done: true,
        error: updated.error,
        responseSummary: 'Operation failed',
      });
    }

    res.json({
      done: !!updated.done,
      error: null,
      responseSummary: updated.done && updated.response ? 'Video ready' : 'Processing',
    });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    res.status(500).json({
      error: error.message || 'Failed to check video status',
    });
  }
});

// Step 3: Stream generated video back to client
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const apiKey = getApiKey();
    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    if (!updated.done) {
      return res.status(400).json({ error: 'Video is not yet finished generating.' });
    }

    // Check for filtering
    if (updated.response?.raiMediaFilteredReasons?.length) {
      return res.status(422).json({
        error: updated.response.raiMediaFilteredReasons.join(' '),
      });
    }

    const generatedVideo = updated.response?.generatedVideos?.[0]?.video;
    if (!generatedVideo) {
      return res.status(404).json({ error: 'Generated video was not found in response.' });
    }

    // Handle base64 video data directly if present
    const genVideoAny = generatedVideo as any;
    const rawData = genVideoAny.videoBytes || genVideoAny.data;
    if (rawData && typeof rawData === 'string') {
      const videoBuffer = Buffer.from(rawData, 'base64');
      res.setHeader('Content-Type', genVideoAny.mimeType || genVideoAny.mime_type || 'video/mp4');
      res.setHeader('Content-Length', videoBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="veo-candidate-video.mp4"');
      return res.end(videoBuffer);
    }

    // Handle URI download
    const videoUri = generatedVideo.uri;
    if (!videoUri) {
      return res.status(404).json({ error: 'Generated video URI was not found in response.' });
    }

    console.log('Downloading video from Veo URI for client delivery:', videoUri);

    // Fetch video with authentication
    const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
    const videoRes = await fetch(downloadUrl, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video from storage: ${videoRes.status} ${videoRes.statusText}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="veo-candidate-video.mp4"');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error downloading Veo video:', error);
    res.status(500).json({
      error: error.message || 'Failed to download generated video',
    });
  }
});

// Development vs Production serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (isProd: ${isProd})`);
  });
}

startServer();
