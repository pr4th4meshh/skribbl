const WORDS_EN = [
  'apple', 'banana', 'car', 'house', 'dog', 'cat', 'tree', 'sun', 'moon', 'star',
  'book', 'phone', 'computer', 'pizza', 'guitar', 'bicycle', 'airplane', 'ship',
  'mountain', 'river', 'ocean', 'forest', 'volcano', 'desert', 'island', 'bridge',
  'castle', 'tower', 'lighthouse', 'hospital', 'school', 'library', 'museum',
  'robot', 'alien', 'dragon', 'unicorn', 'mermaid', 'ghost', 'zombie', 'vampire',
  'rainbow', 'cloud', 'thunder', 'lightning', 'tornado', 'snowflake', 'snowman',
  'football', 'basketball', 'tennis', 'swimming', 'boxing', 'skateboard', 'surfboard',
  'spaghetti', 'hamburger', 'hotdog', 'sushi', 'taco', 'sandwich', 'ice cream',
  'elephant', 'giraffe', 'lion', 'tiger', 'penguin', 'kangaroo', 'dolphin', 'shark',
  'butterfly', 'spider', 'bee', 'ant', 'dinosaur', 'parrot', 'owl', 'eagle',
  'doctor', 'teacher', 'firefighter', 'astronaut', 'pirate', 'knight', 'wizard',
  'camera', 'television', 'radio', 'headphones', 'microphone', 'keyboard', 'mouse',
  'scissors', 'hammer', 'screwdriver', 'wrench', 'paintbrush', 'pencil', 'ruler',
  'umbrella', 'backpack', 'suitcase', 'glasses', 'hat', 'shoe', 'crown', 'ring',
  'clock', 'mirror', 'lamp', 'chair', 'table', 'bed', 'sofa', 'window', 'door',
  'candle', 'balloon', 'kite', 'compass', 'telescope', 'microscope', 'hourglass',
];

export function getRandomWords(count = 3): string[] {
  const shuffled = [...WORDS_EN].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getWordHint(word: string): string {
  return word
    .split('')
    .map((c) => (c === ' ' ? ' ' : '_'))
    .join('');
}

export function revealLetter(
  word: string,
  hint: string,
  revealed: number[],
): { hint: string; newIndex: number | null } {
  const unrevealed = word
    .split('')
    .reduce<number[]>((acc, c, i) => {
      if (c !== ' ' && !revealed.includes(i)) acc.push(i);
      return acc;
    }, []);

  if (unrevealed.length === 0) return { hint, newIndex: null };

  const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)]!;
  const chars = hint.split('');
  chars[idx] = word[idx]!;
  return { hint: chars.join(''), newIndex: idx };
}
