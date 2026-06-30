import { type CSSProperties, useEffect, useState } from 'react'
import { SWIRL_EVENT, type SwirlDetail } from '../lib/swirl'
import styles from '../styles/app.module.css'

interface Particle {
  id: number
  emoji: string
  /** End-of-flight offsets and spin, fed to the CSS keyframe as custom props. */
  tx: number
  ty: number
  rot: number
  delayMs: number
  durMs: number
  size: number
}

interface Burst {
  id: number
  particles: Particle[]
  /** When the whole burst can be removed from the DOM. */
  ttlMs: number
}

const COUNT = 28

/** Build one swirl: emojis pinwheel out from the center, staggered so they spin. */
function makeBurst(id: number, emoji: string): Burst {
  const reach = Math.max(window.innerWidth, window.innerHeight)
  const particles: Particle[] = []
  let maxEnd = 0
  for (let i = 0; i < COUNT; i++) {
    // Stagger the launch angle by index so the burst reads as a rotating swirl.
    const angle = (i / COUNT) * Math.PI * 2 + i * 0.18
    const radius = reach * (0.35 + Math.random() * 0.4)
    const delayMs = i * 28
    const durMs = 1300 + Math.random() * 600
    maxEnd = Math.max(maxEnd, delayMs + durMs)
    particles.push({
      id: i,
      emoji,
      tx: Math.cos(angle) * radius,
      ty: Math.sin(angle) * radius,
      rot: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
      delayMs,
      durMs,
      size: 1.4 + Math.random() * 1.8,
    })
  }
  return { id, particles, ttlMs: maxEnd + 100 }
}

/** Page-wide overlay that renders emoji swirls on demand (see lib/swirl.ts). */
export function EmojiSwirl() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    let nextId = 0
    let timers: ReturnType<typeof setTimeout>[] = []
    const onSwirl = (e: Event) => {
      const emoji = (e as CustomEvent<SwirlDetail>).detail?.emoji
      if (!emoji) return
      const burst = makeBurst(nextId++, emoji)
      setBursts((b) => [...b, burst])
      const t = setTimeout(() => {
        setBursts((b) => b.filter((x) => x.id !== burst.id))
      }, burst.ttlMs)
      timers.push(t)
    }
    window.addEventListener(SWIRL_EVENT, onSwirl)
    return () => {
      window.removeEventListener(SWIRL_EVENT, onSwirl)
      timers.forEach(clearTimeout)
      timers = []
    }
  }, [])

  if (bursts.length === 0) return null

  return (
    <div className={styles.swirlOverlay} aria-hidden>
      {bursts.flatMap((burst) =>
        burst.particles.map((p) => (
          <span
            key={`${burst.id}-${p.id}`}
            className={styles.swirlParticle}
            style={
              {
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                '--rot': `${p.rot}deg`,
                fontSize: `${p.size}rem`,
                animationDelay: `${p.delayMs}ms`,
                animationDuration: `${p.durMs}ms`,
              } as CSSProperties
            }
          >
            {p.emoji}
          </span>
        )),
      )}
    </div>
  )
}
