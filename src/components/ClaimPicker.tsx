import { ROSTER } from '../data/roster'
import styles from '../styles/app.module.css'

/** A dropdown of family members; choosing one "claims" that identity. */
export function ClaimPicker({
  value,
  onClaim,
}: {
  value: string | null
  onClaim: (member: string) => void
}) {
  return (
    <label>
      <span className="visually-hidden">Choose your name</span>
      <select
        className={styles.select}
        value={value ?? ''}
        onChange={(event) => {
          if (event.target.value) onClaim(event.target.value)
        }}
      >
        <option value="" disabled>
          Pick your name…
        </option>
        {ROSTER.map((entry) => (
          <option key={entry.member} value={entry.member}>
            {entry.member} — {entry.flag} {entry.team}
          </option>
        ))}
      </select>
    </label>
  )
}
