import { useEffect, useRef, useState } from 'react'
import { SWIRL_EVENT, type SwirlDetail } from '../lib/swirl'
import styles from '../styles/app.module.css'

interface Particle {
  id: number
  emoji: string
  /** End-of-flight offsets and spin. */
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

/**
 * One flying emoji, animated via the Web Animations API. We deliberately avoid
 * CSS `@keyframes` with `var(--x)` custom properties: iOS Safari drops those, so
 * the swirl would silently do nothing there. element.animate() works everywhere.
 */
function ParticleSpan({ p }: { p: Particle }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rot = reduce ? 0 : p.rot
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(0.2)', opacity: 0 },
        { opacity: 1, offset: 0.12 },
        {
          transform: `translate(-50%, -50%) translate(${p.tx}px, ${p.ty}px) rotate(${rot}deg) scale(1)`,
          opacity: 0,
        },
      ],
      {
        duration: p.durMs,
        delay: p.delayMs,
        easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
        fill: 'both',
      },
    )
    return () => anim.cancel()
  }, [p])

  return (
    <span ref={ref} className={styles.swirlParticle} style={{ fontSize: `${p.size}rem` }}>
      {p.emoji}
    </span>
  )
}

/** Page-wide overlay that renders emoji swirls on demand (see lib/swirl.ts). */
export function EmojiSwirl() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    let nextId = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const onSwirl = (e: Event) => {
      const emoji = (e as CustomEvent<SwirlDetail>).detail?.emoji
      if (!emoji) return
      const burst = makeBurst(nextId++, emoji)
      setBursts((b) => [...b, burst])
      timers.push(
        setTimeout(() => {
          setBursts((b) => b.filter((x) => x.id !== burst.id))
        }, burst.ttlMs),
      )
    }
    window.addEventListener(SWIRL_EVENT, onSwirl)
    return () => {
      window.removeEventListener(SWIRL_EVENT, onSwirl)
      timers.forEach(clearTimeout)
    }
  }, [])

  if (bursts.length === 0) return null

  return (
    <div className={styles.swirlOverlay} aria-hidden>
      {bursts.flatMap((burst) =>
        burst.particles.map((p) => <ParticleSpan key={`${burst.id}-${p.id}`} p={p} />),
      )}
    </div>
  )
}
