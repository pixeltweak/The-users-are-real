/**
 * ============================================================================
 * VEO PROMPT INSTRUCTIONS & CONFIGURATION
 * Single location file for all Google Veo video generation prompt engineering,
 * system instructions, stage feedback messages, and model parameters.
 * ============================================================================
 */

export interface VeoPromptOptions {
  candidateName: string;
  quote: string;
  setting?: string;
  shotType?: string;
  cameraMotion?: string;
  mode?: '8s' | 'extended';
  isContinuation?: boolean;
  segmentIndex?: number;
  totalSegments?: number;
}

/**
 * System-level guidelines for the Veo video model.
 * Outlines the high-fidelity persona, lighting, audio articulation, and camera rules.
 */
export const VEO_SYSTEM_INSTRUCTIONS = `
You are generating high-fidelity, photorealistic video clips of authentic user research participants.
Key directives for cinematic realism:
1. CHARACTER CONSISTENCY: Preserve the participant's facial structure, hair color, skin tone, and attire exactly as provided in the master candidate portrait.
2. ACCENT & VOCAL CADENCE: The participant speaks in a natural, authentic British accent with clear British vocal articulation and natural phrasing.
3. LIMITED MOVEMENT: Calm and restrained physical composure. Use a locked-off camera with minimal head movement, subtle blinking, and restrained natural facial expressions without swaying or excessive gestures.
4. ARTICULATION & KINEMATICS: Natural mouth shapes, lips and jaw movement matching the cadence of speaking the provided quote in a British accent.
5. DOCUMENTARY LIGHTING: Soft, diffused office or natural daylight setting, avoiding harsh shadows or artificial studio saturation.
6. FRAMING: Clean 16:9 cinematic medium-close-up shot, participant centered, shallow depth of field with gently blurred authentic background.
`.trim();

/**
 * Master prompt builder function.
 * Generates the unified, optimal video prompt sent to Google Veo 3.1.
 */
export function buildVeoPrompt(options: VeoPromptOptions): string {
  const {
    candidateName = 'Hermione',
    quote = 'User research statement',
    setting = 'an authentic, softly-lit modern office meeting room with shallow depth of field',
    shotType = 'Medium close-up portrait, eye-level framing',
    cameraMotion = 'Locked-off static camera with limited movement, steady cinematic composure',
    mode = '8s',
    isContinuation = false,
    segmentIndex = 0,
    totalSegments = 1,
  } = options;

  const cleanQuote = quote.replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '').trim();

  // Performance directive tailored to the selected duration mode
  let performanceDirective = `${candidateName} maintains calm, composed eye contact with the camera, speaking with subtle natural expressions and an authentic British interview cadence.`;

  if (mode === '8s') {
    // Mode '8s': Add natural, thoughtful silence to comfortably pad the 8s clip without rushing
    performanceDirective =
      `${candidateName} maintains steady, composed eye contact. She articulates the statement cleanly in an authentic British accent at an unhurried conversational cadence, then naturally pauses in calm, thoughtful silence with subtle natural breathing and attentive composure for the remainder of the 8-second clip. Do not loop or rush the delivery.`;
  } else if (isContinuation) {
    // Mode 'extended' (Clip 2+): Seamless continuation from previous video segment
    performanceDirective =
      `Direct interview continuation (Part ${segmentIndex + 1} of ${totalSegments}). ${candidateName} maintains the exact same sitting position, lighting, and wardrobe, seamlessly continuing the dialogue with natural British speech articulation, steady composure, and locked-off framing.`;
  }

  return (
    `Photorealistic documentary 16:9 medium close-up of ${candidateName}, a research interview participant in a user testing session. ` +
    `Framing: ${shotType}, 16:9 widescreen composition. ` +
    `Setting: ${setting}. ` +
    `Camera: ${cameraMotion}, 50mm cinematic lens, beautiful bokeh, static framing. ` +
    `Lighting: Soft diffused directional daylight, natural skin tones. ` +
    `Performance: ${performanceDirective} ` +
    `Interview statement: "${cleanQuote}". ` +
    `High quality, cinematic, 4k master look, professional color grading, true-to-life physical presence.`
  );
}

/**
 * Default parameters for Google Veo generation
 */
export const VEO_CONFIG_DEFAULTS = {
  defaultModel: 'veo-3.1-lite-generate-preview' as const,
  supportedModels: [
    'veo-3.1-lite-generate-preview',
    'veo-3.1-generate-preview',
  ] as const,
  resolution: '720p' as const,
  aspectRatio: '16:9' as const,
  numberOfVideos: 1,
  durationSec: 6.0,
};

/**
 * Progressive feedback messages displayed to users during the generation polling loop.
 */
export const VEO_STAGE_MESSAGES = [
  'Submitting candidate image & quote to Google Veo neural engine...',
  'Veo is analyzing participant facial contours and lighting...',
  'Synthesizing lifelike candidate expressions and vocal kinematics...',
  'Rendering character-consistent 16:9 video frames...',
  'Refining natural movement, head tilt, and eye contact...',
  'Finalizing video encoding and assembling 16:9 MP4 container...',
];

/**
 * Maximum video duration in seconds supported by Google Veo for a single generation call.
 * Google Veo produces clips between 5 and 8 seconds.
 */
export const VEO_MAX_DURATION_SECONDS = 8;
export const VEO_DEFAULT_DURATION_SECONDS = 6;

/**
 * Splits a longer research quote into clean, coherent semantic soundbite segments.
 * Target: ~10-14 words per segment so each segment fits naturally in an 8-second Veo clip.
 */
export function splitQuoteIntoSegments(quote: string): string[] {
  const clean = quote.trim();
  if (!clean) return [];

  const totalWords = clean.split(/\s+/).filter(Boolean);
  if (totalWords.length <= 14) {
    return [clean];
  }

  // 1. Try splitting on sentence punctuation (. ! ?)
  const sentenceMatches = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [clean];
  const sentences = sentenceMatches.map((s) => s.trim()).filter(Boolean);

  const segments: string[] = [];
  let currentSegment = '';

  for (const sentence of sentences) {
    const combined = currentSegment ? `${currentSegment} ${sentence}` : sentence;
    const wordCount = combined.split(/\s+/).filter(Boolean).length;

    if (wordCount <= 14) {
      currentSegment = combined;
    } else {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = '';
      }

      // Check if this single sentence itself is > 14 words
      const sentWords = sentence.split(/\s+/).filter(Boolean);
      if (sentWords.length > 15) {
        // Try splitting on comma, semicolon, dash, or conjunctions
        const clauseParts = sentence.split(/[,;—–]|\b(?:but|and|so|because|although)\b/gi);
        if (clauseParts.length > 1) {
          let clauseBuf = '';
          for (const part of clauseParts) {
            const pTrim = part.trim();
            if (!pTrim) continue;
            const testBuf = clauseBuf ? `${clauseBuf}, ${pTrim}` : pTrim;
            if (testBuf.split(/\s+/).filter(Boolean).length <= 14) {
              clauseBuf = testBuf;
            } else {
              if (clauseBuf) segments.push(clauseBuf);
              clauseBuf = pTrim;
            }
          }
          if (clauseBuf) currentSegment = clauseBuf;
        } else {
          // Chunk words evenly into ~12 word segments
          for (let i = 0; i < sentWords.length; i += 12) {
            const slice = sentWords.slice(i, i + 12).join(' ');
            if (i + 12 >= sentWords.length) {
              currentSegment = slice;
            } else {
              segments.push(slice);
            }
          }
        }
      } else {
        currentSegment = sentence;
      }
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments.filter((s) => s.trim().length > 0);
}

/**
 * Calculates word count and estimates spoken delivery duration in seconds.
 * Average natural conversational British speech cadence is ~2.3 words per second (135-140 words per minute).
 */
export function estimateSpeechDuration(
  quote: string,
  mode: '8s' | 'extended' = '8s'
): {
  wordCount: number;
  estimatedSeconds: number;
  status: 'optimal' | 'warning' | 'too-long';
  recommendation: string;
  segments: string[];
  totalExtendedSeconds: number;
} {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  // ~2.3 words per second including natural micro-pauses
  const estimatedSeconds = Math.round((wordCount / 2.3) * 10) / 10;
  const segments = splitQuoteIntoSegments(quote);
  const totalExtendedSeconds = Math.max(segments.length * 8, 8);

  if (wordCount === 0) {
    return {
      wordCount: 0,
      estimatedSeconds: 0,
      status: 'optimal',
      recommendation: mode === '8s'
        ? 'Enter a research quote (up to 14 words). Silence will pad the rest of the 8s.'
        : 'Enter a research statement. Long quotes will be automatically split into chained clips.',
      segments: [],
      totalExtendedSeconds: 8,
    };
  }

  if (mode === 'extended') {
    return {
      wordCount,
      estimatedSeconds,
      status: 'optimal',
      recommendation: `Split into ${segments.length} chained clip${segments.length > 1 ? 's' : ''} (~${totalExtendedSeconds}s total interview). Zero jump-cuts between clips.`,
      segments,
      totalExtendedSeconds,
    };
  }

  // Mode: '8s' (Single clip with silence padding)
  if (wordCount <= 14) {
    const silenceSeconds = Math.max(0, Math.round((8 - estimatedSeconds) * 10) / 10);
    return {
      wordCount,
      estimatedSeconds,
      status: 'optimal',
      recommendation: `Spoken speech is ~${estimatedSeconds}s. Veo will add ~${silenceSeconds}s of calm, thoughtful silence with attentive eye contact to complete the 8s clip.`,
      segments: [quote],
      totalExtendedSeconds: 8,
    };
  }

  if (wordCount <= 18) {
    return {
      wordCount,
      estimatedSeconds,
      status: 'warning',
      recommendation: `Quote is ~${estimatedSeconds}s. It fills nearly all 8s with minimal silence. Switch to "Extended" if you want room to breathe.`,
      segments: [quote],
      totalExtendedSeconds: 8,
    };
  }

  return {
    wordCount,
    estimatedSeconds,
    status: 'too-long',
    recommendation: `Quote is ~${estimatedSeconds}s and will be cropped at 8s! Switch to "Extended" to generate a continuous multi-clip interview.`,
    segments,
    totalExtendedSeconds,
  };
}

/**
 * Sample user quotes representing authentic discovery and usability research sessions.
 * Sized to fit comfortably within Veo's 5-8 second video budget.
 */
export const VEO_SAMPLE_QUOTES = [
  {
    label: 'Parking permit (13 words · ~5.5s)',
    quote: 'Applying for the local resident parking permit took less than five minutes on my phone.',
  },
  {
    label: 'Claim confirmation (12 words · ~5.0s)',
    quote: 'The digital form was clear, but I waited for email confirmation before closing.',
  },
  {
    label: 'Guidance text (11 words · ~4.8s)',
    quote: 'The font size was clear, but finding the return link was tricky.',
  },
  {
    label: 'Helpline wait (10 words · ~4.3s)',
    quote: 'I got confused at step two, so I phoned the helpline.',
  },
];
