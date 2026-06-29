import styles from '../styles/app.module.css'

export type TabKey = 'me' | 'leaderboard' | 'bracket' | 'roster' | 'schedule'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'me', label: 'My Team', icon: '⭐' },
  { key: 'leaderboard', label: 'Standings', icon: '🏆' },
  { key: 'bracket', label: 'Bracket', icon: '🗺️' },
  { key: 'roster', label: 'Roster', icon: '👪' },
  { key: 'schedule', label: 'Schedule', icon: '📅' },
]

export function Tabs({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <nav className={styles.tabBar} aria-label="Views">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`${styles.tab} ${active === tab.key ? styles.active : ''}`}
          aria-current={active === tab.key ? 'page' : undefined}
          onClick={() => onChange(tab.key)}
        >
          <span className={styles.icon} aria-hidden>
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
