/** Deterministic hash — same username always produces the same number */
export function hashUsername(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0
  }
  return h
}

export const AVATAR_BG_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#22c55e', // green
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#eab308', // yellow
  '#14b8a6', // teal
  '#f43f5e', // rose
]

export const SKIN_TONES = ['#FDDBB4', '#F5C18E', '#E8A76D', '#C68642', '#8D5524']

/** Pick an avatar BG color deterministically from a username */
export function avatarBg(username: string): string {
  return AVATAR_BG_COLORS[hashUsername(username) % AVATAR_BG_COLORS.length]!
}
