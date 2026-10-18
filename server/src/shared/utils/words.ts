import type { WordDifficulty } from '../types';

const WORDS_EASY = [
  'apple', 'banana', 'car', 'house', 'dog', 'cat', 'tree', 'sun', 'moon', 'star',
  'book', 'phone', 'pizza', 'ship', 'river', 'bridge', 'ghost', 'cloud', 'rainbow',
  'snowman', 'football', 'hotdog', 'taco', 'ice cream', 'lion', 'tiger', 'shark',
  'spider', 'bee', 'ant', 'owl', 'hat', 'shoe', 'crown', 'ring', 'clock', 'lamp',
  'chair', 'table', 'bed', 'door', 'window', 'candle', 'balloon', 'kite', 'fish',
  'bird', 'egg', 'cake', 'cookie', 'cheese', 'carrot', 'grapes', 'cherry', 'lemon',
  'flower', 'leaf', 'heart', 'key', 'cup', 'spoon', 'fork', 'knife', 'bottle',
  'ball', 'boat', 'train', 'bus', 'truck', 'rocket', 'robot', 'snake', 'frog',
  'duck', 'cow', 'pig', 'horse', 'sheep', 'bear', 'mouse', 'rabbit', 'monkey',
  'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'tooth', 'smile', 'pencil',
  'box', 'bag', 'sock', 'shirt', 'pants', 'glasses', 'drum', 'bell', 'fire',
  'tent', 'flag', 'map', 'gift', 'banana peel', 'snail', 'whale',
  'turtle', 'crab', 'octopus', 'mushroom', 'cactus', 'umbrella', 'ladder', 'sword',
];

const WORDS_MEDIUM = [
  'computer', 'guitar', 'bicycle', 'airplane', 'mountain', 'ocean', 'forest',
  'volcano', 'desert', 'island', 'castle', 'tower', 'lighthouse', 'hospital',
  'school', 'library', 'museum', 'alien', 'dragon', 'unicorn', 'mermaid', 'zombie',
  'vampire', 'thunder', 'lightning', 'tornado', 'snowflake', 'basketball', 'tennis',
  'swimming', 'boxing', 'skateboard', 'surfboard', 'spaghetti', 'hamburger', 'sushi',
  'sandwich', 'elephant', 'giraffe', 'penguin', 'kangaroo', 'dolphin', 'butterfly',
  'dinosaur', 'parrot', 'eagle', 'doctor', 'teacher', 'firefighter', 'astronaut',
  'pirate', 'knight', 'wizard', 'camera', 'television', 'radio', 'headphones',
  'microphone', 'keyboard', 'scissors', 'hammer', 'screwdriver', 'wrench',
  'paintbrush', 'ruler', 'backpack', 'suitcase', 'mirror', 'sofa', 'compass',
  'telescope', 'microscope', 'hourglass', 'waterfall', 'campfire', 'treasure',
  'skeleton', 'pyramid', 'igloo', 'windmill', 'scarecrow', 'parachute', 'helicopter',
  'submarine', 'tractor', 'ambulance', 'motorcycle', 'roller coaster', 'ferris wheel',
  'trampoline', 'swing', 'slide', 'sandcastle', 'beach', 'jungle', 'farm', 'zoo',
  'circus', 'clown', 'magician', 'ninja', 'cowboy', 'chef', 'police', 'princess',
  'superhero', 'vacuum', 'toaster', 'fridge', 'oven', 'blender', 'bathtub',
  'toothbrush', 'shower', 'pillow', 'blanket', 'wallet', 'necklace', 'bracelet',
  'lipstick', 'perfume', 'popcorn', 'pancake', 'donut', 'burrito', 'noodles',
  'pineapple', 'watermelon', 'coconut', 'avocado', 'broccoli', 'peacock', 'flamingo',
  'hedgehog', 'squirrel', 'raccoon', 'jellyfish', 'seahorse', 'lobster', 'scorpion',
];

const WORDS_HARD = [
  'gravity', 'electricity', 'photosynthesis', 'evolution', 'democracy', 'freedom',
  'nightmare', 'daydream', 'jealousy', 'nostalgia', 'echo', 'shadow', 'reflection',
  'eclipse', 'constellation', 'galaxy', 'black hole', 'satellite', 'meteor',
  'avalanche', 'earthquake', 'tsunami', 'hurricane', 'blizzard', 'quicksand',
  'stalactite', 'glacier', 'peninsula', 'archipelago', 'labyrinth', 'catapult',
  'guillotine', 'chandelier', 'escalator', 'elevator', 'thermometer', 'stethoscope',
  'metronome', 'accordion', 'saxophone', 'harmonica', 'xylophone', 'bagpipes',
  'origami', 'karaoke', 'yoga', 'meditation', 'hibernation', 'migration',
  'camouflage', 'mirage', 'hologram', 'time machine', 'virtual reality', 'wifi',
  'password', 'download', 'algorithm', 'blueprint', 'barcode', 'fingerprint',
  'passport', 'jet lag', 'traffic jam', 'rush hour', 'deadline', 'procrastination',
  'brainstorm', 'sleepwalking', 'hiccup', 'sneeze', 'goosebumps', 'stage fright',
  'applause', 'standing ovation', 'red carpet', 'paparazzi', 'autograph',
  'photobomb', 'selfie', 'influencer', 'recycling', 'pollution', 'global warming',
  'solar panel', 'wind turbine', 'nuclear', 'magnet', 'prism', 'vortex',
  'domino effect', 'chain reaction', 'butterfly effect', 'deja vu', 'telepathy',
  'invisibility', 'teleport', 'parallel universe', 'zombie apocalypse',
  'haunted house', 'treasure map', 'message in a bottle', 'ghost town',
  'secret agent', 'bank robbery', 'jailbreak', 'courtroom', 'lawyer', 'architect',
  'archaeologist', 'scientist', 'ventriloquist', 'acrobat', 'lumberjack',
];

const POOLS: Record<Exclude<WordDifficulty, 'mixed'>, string[]> = {
  easy: WORDS_EASY,
  medium: WORDS_MEDIUM,
  hard: WORDS_HARD,
};

export const COMBINATION_SEPARATOR = ' + ';

export interface WordOptions {
  difficulty: WordDifficulty;
  customWords: string[];
  customWordsOnly: boolean;
  exclude: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function buildPool({ difficulty, customWords, customWordsOnly }: WordOptions): string[] {
  if (customWordsOnly && customWords.length) return [...new Set(customWords)];
  const base = difficulty === 'mixed' ? [...WORDS_EASY, ...WORDS_MEDIUM, ...WORDS_HARD] : POOLS[difficulty];
  return [...new Set([...base, ...customWords])];
}

export function getRandomWords(count: number, opts: WordOptions): string[] {
  const pool = buildPool(opts);
  const exclude = new Set(opts.exclude);
  const fresh = pool.filter((w) => !exclude.has(w));
  // Once every word has been used, allow repeats rather than run dry
  const source = fresh.length >= count ? fresh : pool;
  return shuffle(source).slice(0, count);
}

// Each choice is two distinct words joined by COMBINATION_SEPARATOR
export function getRandomCombinations(count: number, opts: WordOptions): string[] {
  const words = getRandomWords(count * 2, opts);
  const pool = words.length >= 2 ? words : buildPool(opts);
  const choices: string[] = [];
  for (let i = 0; i < count; i++) {
    const [a, b] = shuffle(pool);
    if (a && b) choices.push(`${a}${COMBINATION_SEPARATOR}${b}`);
  }
  return choices;
}

const isLetter = (c: string) => /[\p{L}\p{N}]/u.test(c);

export function getWordHint(word: string): string {
  return word
    .split('')
    .map((c) => (isLetter(c) ? '_' : c))
    .join('');
}

export function countLetters(word: string): number {
  return word.split('').filter(isLetter).length;
}

export function revealLetter(
  word: string,
  hint: string,
  revealed: number[],
): { hint: string; newIndex: number | null } {
  const unrevealed = word
    .split('')
    .reduce<number[]>((acc, c, i) => {
      if (isLetter(c) && !revealed.includes(i)) acc.push(i);
      return acc;
    }, []);

  if (unrevealed.length === 0) return { hint, newIndex: null };

  const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)]!;
  const chars = hint.split('');
  chars[idx] = word[idx]!;
  return { hint: chars.join(''), newIndex: idx };
}

// ── Guess matching ───────────────────────────────────────────────────

export function normalizeGuess(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

function isClose(guess: string, target: string): boolean {
  if (!guess || !target) return false;
  const maxDist = target.length <= 5 ? 1 : 2;
  return Math.abs(guess.length - target.length) <= maxDist && levenshtein(guess, target) <= maxDist;
}

export type GuessResult = 'correct' | 'partial' | 'close' | 'wrong';

export function checkGuess(text: string, word: string): GuessResult {
  const guess = normalizeGuess(text);
  if (!guess) return 'wrong';

  const parts = word.split(COMBINATION_SEPARATOR).map(normalizeGuess);
  const targets = parts.length === 2 ? [parts[0]! + parts[1]!, parts[1]! + parts[0]!] : [parts[0]!];

  if (targets.includes(guess)) return 'correct';
  if (parts.length === 2 && parts.includes(guess)) return 'partial';
  if (targets.some((t) => isClose(guess, t))) return 'close';
  if (parts.length === 2 && parts.some((p) => isClose(guess, p))) return 'close';
  return 'wrong';
}
