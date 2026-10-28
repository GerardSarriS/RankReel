import {
  ArrowBigUpDash,
  Bell,
  BellRing,
  Bomb,
  Camera,
  CircleDot,
  Coins,
  Drum,
  Frown,
  Hand,
  HandMetal,
  HeartPulse,
  Music2,
  PartyPopper,
  Sparkles,
  Spline,
  Timer,
  TrendingUp,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  whoosh: Wind,
  swoosh: Spline,
  riser: TrendingUp,
  boom: Bomb,
  punch: HandMetal,
  heartbeat: HeartPulse,
  drumroll: Drum,
  tada: PartyPopper,
  ding: Bell,
  bell: BellRing,
  sparkle: Sparkles,
  applause: Hand,
  coin: Coins,
  powerup: ArrowBigUpDash,
  boing: CircleDot,
  'sad-trombone': Frown,
  buzzer: X,
  laser: Zap,
  pop: CircleDot,
  tick: Timer,
  shutter: Camera,
}

export function SfxIcon({ id, size = 15 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? Music2
  return <Icon size={size} strokeWidth={1.75} />
}
