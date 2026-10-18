import type { Language, WordDifficulty } from '../types';
import { WORD_LISTS } from './wordLists';

export const COMBINATION_SEPARATOR = ' + ';

export interface WordOptions {
  language: Language;
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

function buildPool({ language, difficulty, customWords, customWordsOnly }: WordOptions): string[] {
  if (customWordsOnly && customWords.length) return [...new Set(customWords)];
  const pools = WORD_LISTS[language] ?? WORD_LISTS.english;
  const base = difficulty === 'mixed' ? [...pools.easy, ...pools.medium, ...pools.hard] : pools[difficulty];
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

// Accents are dropped so "cafe" matches "café" in non-English word lists
export function normalizeGuess(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
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
