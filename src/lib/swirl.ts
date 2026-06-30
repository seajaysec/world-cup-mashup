/**
 * Easter egg: tapping a for-fun pick's card swirls its emoji across the whole
 * page (🏀 for the Nuggets, 🌌 for the Galaxy). The card just fires an event;
 * the page-level <EmojiSwirl/> listens and renders the burst, so the trigger
 * stays decoupled from the animation.
 */
export const SWIRL_EVENT = 'fwc:swirl'

export interface SwirlDetail {
  emoji: string
}

export function triggerSwirl(emoji: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SwirlDetail>(SWIRL_EVENT, { detail: { emoji } }))
}
