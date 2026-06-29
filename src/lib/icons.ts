/** Little mood icons for knockout results. Picked deterministically per match
 * (by match number) so a given game always shows the same face. */

const HAPPY = ['🎉', '🥳', '😎', '🔥', '🚀', '⭐', '💪', '😤', '🙌', '🦁']
const SAD = ['😭', '😢', '💀', '🪦', '😩', '👋', '🥀', '😞', '🫠', '📉']

function pick(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length]
}

export function happyIcon(seed: number): string {
  return pick(HAPPY, seed)
}

export function sadIcon(seed: number): string {
  // Offset the seed so a match's winner and loser don't land on the same index.
  return pick(SAD, seed + 7)
}
