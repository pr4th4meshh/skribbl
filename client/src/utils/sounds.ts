import { useSettingsStore } from '@/stores/settings.store'

export type SoundName = 'correct' | 'yourTurn' | 'tick' | 'tickFinal'

interface Note {
  freq: number
  start: number
  duration: number
  type?: OscillatorType
  gain?: number
}

// Synthesised so there are no audio files to load
const SOUNDS: Record<SoundName, Note[]> = {
  correct: [
    { freq: 784, start: 0, duration: 0.12 },
    { freq: 1175, start: 0.09, duration: 0.25 },
  ],
  yourTurn: [
    { freq: 523, start: 0, duration: 0.14, type: 'triangle' },
    { freq: 659, start: 0.12, duration: 0.14, type: 'triangle' },
    { freq: 784, start: 0.24, duration: 0.3, type: 'triangle' },
  ],
  tick: [{ freq: 1000, start: 0, duration: 0.05, type: 'square', gain: 0.04 }],
  tickFinal: [{ freq: 1400, start: 0, duration: 0.08, type: 'square', gain: 0.06 }],
}

let audioCtx: AudioContext | null = null

export function playSound(name: SoundName) {
  if (useSettingsStore.getState().muted) return
  try {
    audioCtx ??= new AudioContext()
    // Browsers start the context suspended until the page has had a user gesture
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const now = audioCtx.currentTime
    for (const note of SOUNDS[name]) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      const t = now + note.start
      osc.type = note.type ?? 'sine'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(note.gain ?? 0.15, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.duration)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t)
      osc.stop(t + note.duration + 0.02)
    }
  } catch {
    // No Web Audio support — play silently
  }
}
