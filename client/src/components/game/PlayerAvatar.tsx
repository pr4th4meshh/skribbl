import { hashUsername, AVATAR_BG_COLORS, SKIN_TONES } from '@/utils/avatar'

interface Props {
  username: string
  size?: number
  className?: string
}


function EyesDots() {
  return (
    <>
      <circle cx="38" cy="46" r="4.5" fill="#1a1a1a" />
      <circle cx="62" cy="46" r="4.5" fill="#1a1a1a" />
      <circle cx="40" cy="44" r="1.5" fill="white" />
      <circle cx="64" cy="44" r="1.5" fill="white" />
    </>
  )
}

function EyesHappy() {
  return (
    <>
      <path d="M33 48 Q38 41 43 48" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      <path d="M57 48 Q62 41 67 48" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

function EyesWide() {
  return (
    <>
      <ellipse cx="38" cy="46" rx="6" ry="7" fill="white" />
      <ellipse cx="62" cy="46" rx="6" ry="7" fill="white" />
      <circle cx="39" cy="47" r="4" fill="#1a1a1a" />
      <circle cx="63" cy="47" r="4" fill="#1a1a1a" />
      <circle cx="40.5" cy="45.5" r="1.5" fill="white" />
      <circle cx="64.5" cy="45.5" r="1.5" fill="white" />
    </>
  )
}

function EyesSleepy() {
  return (
    <>
      <path d="M33 46 Q38 42 43 46" fill="#1a1a1a" />
      <path d="M33 46 Q38 50 43 46" fill="none" stroke="#1a1a1a" strokeWidth="2" />
      <path d="M57 46 Q62 42 67 46" fill="#1a1a1a" />
      <path d="M57 46 Q62 50 67 46" fill="none" stroke="#1a1a1a" strokeWidth="2" />
    </>
  )
}

const EYES = [EyesDots, EyesHappy, EyesWide, EyesSleepy]

// ── Mouths ─────────────────────────────────────────────────────────────────────

function MouthSmile() {
  return <path d="M38 62 Q50 72 62 62" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
}

function MouthGrin() {
  return (
    <>
      <path d="M36 61 Q50 74 64 61" fill="#1a1a1a" />
      <path d="M36 61 Q50 68 64 61" fill="white" />
    </>
  )
}

function MouthNeutral() {
  return <path d="M40 65 Q50 67 60 65" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
}

const MOUTHS = [MouthSmile, MouthGrin, MouthNeutral]


function Beanie({ color }: { color: string }) {
  return (
    <>
      <ellipse cx="50" cy="28" rx="24" ry="12" fill={color} />
      <rect x="26" y="32" width="48" height="8" rx="4" fill={color} />
      <circle cx="50" cy="18" r="5" fill={color} />
    </>
  )
}

function CatEars({ color }: { color: string }) {
  return (
    <>
      <polygon points="24,34 30,12 40,30" fill={color} />
      <polygon points="60,30 70,12 76,34" fill={color} />
      <polygon points="27,32 31,18 38,29" fill="#f9a8d4" />
      <polygon points="62,29 69,18 73,32" fill="#f9a8d4" />
    </>
  )
}

function Headband({ color }: { color: string }) {
  return <rect x="24" y="29" width="52" height="9" rx="4.5" fill={color} />
}

const ACCESSORIES = [null, Beanie, CatEars, Headband] as const



export function PlayerAvatar({ username, size = 40, className }: Props) {
  const h = hashUsername(username)

  const bg = AVATAR_BG_COLORS[h % AVATAR_BG_COLORS.length]!
  const skin = SKIN_TONES[(h >>> 4) % SKIN_TONES.length]!
  const Eyes = EYES[(h >>> 8) % EYES.length]!
  const Mouth = MOUTHS[(h >>> 12) % MOUTHS.length]!
  const AccIndex = (h >>> 16) % ACCESSORIES.length
  const Accessory = ACCESSORIES[AccIndex]

  // Accessory color: pick a contrasting bg color offset by 3
  const accentBg = AVATAR_BG_COLORS[(h % AVATAR_BG_COLORS.length + 3) % AVATAR_BG_COLORS.length]!

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
    >
      {/* Background */}
      <circle cx="50" cy="50" r="50" fill={bg} />

      {/* Accessory (behind face) */}
      {Accessory && <Accessory color={accentBg} />}

      {/* Face */}
      <ellipse cx="50" cy="55" rx="26" ry="28" fill={skin} />

      {/* Features */}
      <Eyes />
      <Mouth />
    </svg>
  )
}
