/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Character {
  id: string;
  name: string;
  title: string;
  imageUrl: string;
  visualPrompt: string;
  defaultQuote: string;
  defaultIntonation: string;
}

export const PRESET_CHARACTERS: Character[] = [
  {
    id: 'washington',
    name: 'George Washington',
    title: '1st U.S. President',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'George Washington, with powdered white hair, wearing a high-collared dark federalist coat and elegant white cravat, set in a wood-paneled stately presidential study',
    defaultQuote: 'Labor to keep alive in your breast that little spark of celestial fire called conscience.',
    defaultIntonation: 'Delivered with quiet, steady dignity, looking directly ahead with deep conviction.',
  },
  {
    id: 'lincoln',
    name: 'Abraham Lincoln',
    title: '16th U.S. President',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Abraham Lincoln, bearded, wearing a historic 19th-century black wool coat and bow tie, in a rustic, candle-lit wooden cabin study room',
    defaultQuote: 'Folks are usually about as happy as they make up their minds to be.',
    defaultIntonation: 'Spoken with rustic eloquence, slowly and with heartfelt, profound determination.',
  },
  {
    id: 'churchill',
    name: 'Winston Churchill',
    title: 'UK Prime Minister',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Winston Churchill, looking serious and resolute in a dark formal suit with pocket square, within a classic leather-bound library and mahogany office',
    defaultQuote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    defaultIntonation: 'In a booming, resolute British accent, pause-heavy, with iron-clad oratorical authority.',
  },
  {
    id: 'joan',
    name: 'Joan of Arc',
    title: 'French Heroine',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Joan of Arc wearing polished, weathered silver-plated medieval knight armor with a high collar, with a golden dramatic firelight reflecting on her determined face',
    defaultQuote: 'I am not afraid; I was born to do this.',
    defaultIntonation: 'Delivered with passionate fervor and absolute, heroic conviction.',
  },
  {
    id: 'caesar',
    name: 'Julius Caesar',
    title: 'Roman Dictator',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Julius Caesar, wearing a royal crimson and white draped Senate toga, a golden laurel wreath crowning his head, against ancient marble Senate columns',
    defaultQuote: 'Experience is the teacher of all things.',
    defaultIntonation: 'Spoken with majestic confidence, commanding and sharp-witted.',
  },
  {
    id: 'elizabeth',
    name: 'Elizabeth I',
    title: 'Queen of England',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Queen Elizabeth I, wearing a gold and jewel-encrusted royal gown, an intricate high lace ruff collar, with a royal palace hall background',
    defaultQuote: 'Though the sex to which I belong is considered weak, you will find me a rock that bends to no wind.',
    defaultIntonation: 'Delivered with majestic decree, highly articulate, regal, and proud.',
  },
  {
    id: 'cleopatra',
    name: 'Cleopatra',
    title: 'Queen of Egypt',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Cleopatra, Egyptian queen, wearing a structured gold headpiece with lapis lazuli accents, bold kohled eye makeup, and royal silks, set on a sunset Nile-facing balcony',
    defaultQuote: 'My honour was not yielded, but merely conquered by destiny.',
    defaultIntonation: 'Delivered in an alluring, calm, yet deadly confident and calculating tone.',
  },
  {
    id: 'einstein',
    name: 'Albert Einstein',
    title: 'Theoretical Physicist',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Albert Einstein, with wild grey-white hair, wearing a cozy knitted grey wool sweater, in front of a classroom chalkboard covered in mathematical equations',
    defaultQuote: 'Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.',
    defaultIntonation: 'In a gentle, academic grandfatherly tone, with a playful spark in the eyes.',
  },
  {
    id: 'napoleon',
    name: 'Napoleon Bonaparte',
    title: 'Emperor of France',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Napoleon Bonaparte, wearing his classic dark green military uniform coat with golden epaulets and buttons, looking intensely determined in an army command tent',
    defaultQuote: 'Victory belongs to the most persevering.',
    defaultIntonation: 'Spoken with a sharp, crisp, imposing French general cadence.',
  },
  {
    id: 'gandhi',
    name: 'Mahatma Gandhi',
    title: 'Freedom Fighter',
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=400',
    visualPrompt: 'Mahatma Gandhi, wearing simple handspun khadi cotton shawl, round wire-rimmed glasses, speaking with a serene and deeply compassionate smile in soft morning light',
    defaultQuote: 'In a gentle way, you can shake the world.',
    defaultIntonation: 'Delivered with absolute peace, gentle, humble, and slow-paced.',
  },
];
