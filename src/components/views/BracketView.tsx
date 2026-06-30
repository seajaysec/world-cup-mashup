import { useMemo, useState } from 'react'
import type { FeedMatch, RosterEntry } from '../../types'
import { canonicalTeamName, getTeamMeta } from '../../data/teams'
import {
  formatKickoff,
  isSameLocalDay,
  parseKickoff,
  winnerSide,
  wasShootout,
} from '../../lib/format'
import { happyIcon, sadIcon } from '../../lib/icons'
import {
  buildSlotResolver,
  compareBracketMatches,
  computeGroupTables,
  type Slot,
} from '../../lib/bracket'
import { buildOwnerResolver } from '../../lib/ownership'
import { ROSTER } from '../../data/roster'
import { FavorMark, OwnerChip } from '../Badges'
import styles from '../../styles/app.module.css'

// Top → bottom: the trophy first, the first knockout round last (the group
// stage — the real start — sits below this, in its own section).
const ROUNDS: { key: string; label: string; sub?: string }[] = [
  { key: 'Final', label: 'Final', sub: 'last 2' },
  { key: 'Match for third place', label: '3rd-place playoff' },
  { key: 'Semi-final', label: 'Semi-finals', sub: 'last 4' },
  { key: 'Quarter-final', label: 'Quarter-finals', sub: 'last 8' },
  { key: 'Round of 16', label: 'Round of 16', sub: 'last 16' },
  { key: 'Round of 32', label: 'Round of 32', sub: 'first knockout round' },
]


type StatusTone = 'done' | 'today' | 'soon' | 'wait'

/** Plain-English temporal status, so it's obvious whether a game is past,
 * happening, or still to come. */
function matchStatus(match: FeedMatch, now: Date): { text: string; tone: StatusTone } {
  if (match.score?.ft) return { text: '✓ Played', tone: 'done' }
  const kickoff = parseKickoff(match.date, match.time)
  if (!kickoff) return { text: 'Upcoming', tone: 'soon' }
  if (isSameLocalDay(kickoff, now)) return { text: '● Playing today', tone: 'today' }
  if (kickoff.getTime() < now.getTime()) return { text: 'Awaiting result', tone: 'wait' }
  return { text: 'Upcoming', tone: 'soon' }
}

const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  done: styles.statusDone,
  today: styles.statusToday,
  soon: styles.statusSoon,
  wait: styles.statusWait,
}

/** One side of a tie: a real team, an "A or B" candidate, or TBD. */
function KoSlot({
  slot,
  goals,
  isWinner,
  isLoser,
  mood,
  owner,
  myTeam,
}: {
  slot: Slot
  goals?: number
  isWinner: boolean
  isLoser: boolean
  mood?: string
  /** The family member who owned this team on the match date, if any. */
  owner?: RosterEntry
  myTeam: string | null
}) {
  if (slot.kind === 'tbd') {
    return (
      <div className={`${styles.koTeam} ${styles.koTbd}`}>
        <span className={styles.koFlag} aria-hidden>
          ·
        </span>
        <span className={styles.koName}>To be decided</span>
      </div>
    )
  }

  if (slot.kind === 'candidates') {
    const fa = getTeamMeta(slot.a)?.flag ?? '·'
    const fb = getTeamMeta(slot.b)?.flag ?? '·'
    return (
      <div className={`${styles.koTeam} ${styles.koTbd}`}>
        <span className={styles.koFlag} aria-hidden>
          {fa}
        </span>
        <span className={styles.koName}>
          {slot.a} <span className={styles.koOr}>or</span> {slot.b}
        </span>
        <span className={styles.koFlag} aria-hidden>
          {fb}
        </span>
      </div>
    )
  }

  const team = slot.team
  const mine = myTeam === canonicalTeamName(team)
  const classes = [styles.koTeam]
  if (isWinner) classes.push(styles.koWin)
  if (isLoser) classes.push(styles.koLose)
  if (owner) classes.push(styles.fam)
  if (mine) classes.push(styles.koMine)

  return (
    <div className={classes.join(' ')}>
      <span aria-hidden className={styles.koFlag}>
        {getTeamMeta(team)?.flag ?? '·'}
      </span>
      <span className={styles.koName}>{team}</span>
      <FavorMark team={team} />
      {owner && <OwnerChip member={owner.member} />}
      {isWinner && <span className={styles.koResultWin}>WON</span>}
      {isLoser && <span className={styles.koResultOut}>OUT</span>}
      {mood && (
        <span aria-hidden className={styles.koMood}>
          {mood}
        </span>
      )}
      <span className={styles.koGoals}>{goals ?? ''}</span>
    </div>
  )
}

function GroupStage({
  matches,
  owners,
  myTeam,
  open,
  onToggle,
}: {
  matches: FeedMatch[]
  owners: Map<string, RosterEntry>
  myTeam: string | null
  open: boolean
  onToggle: () => void
}) {
  const tables = useMemo(() => computeGroupTables(matches), [matches])
  const summary = useMemo(() => {
    const groupGames = matches.filter((m) => m.group)
    const played = groupGames.filter((m) => m.score?.ft).length
    const dates = groupGames.map((m) => m.date).filter(Boolean).sort()
    const fmt = (d: string) =>
      new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${d}T00:00:00Z`),
      )
    const range = dates.length ? `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}` : ''
    return { played, total: groupGames.length, range }
  }, [matches])

  if (tables.length === 0) return null

  return (
    <div className={styles.koRound}>
      <button type="button" className={styles.koRoundHead} aria-expanded={open} onClick={onToggle}>
        <span className={styles.koChevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <span className={styles.koRoundLabel}>
          Group stage
          {summary.range && <span className={styles.koRoundDates}> · {summary.range}</span>}
        </span>
        <span className={styles.koRoundCount}>
          {summary.played}/{summary.total} played
        </span>
      </button>
      {open && (
        <div className={styles.groupGrid}>
          {tables.map(({ group, rows }) => (
            <div className={styles.groupCard} key={group}>
              <div className={styles.groupName}>{group}</div>
              {rows.map((row) => {
                const owner = owners.get(row.team)
                const mine = myTeam === row.team
                return (
                  <div
                    key={row.team}
                    className={`${styles.groupRow} ${row.advanced ? styles.groupAdv : ''} ${mine ? styles.koMine : ''}`}
                  >
                    <span className={styles.koFlag} aria-hidden>
                      {getTeamMeta(row.team)?.flag ?? '·'}
                    </span>
                    <span className={styles.groupTeam}>
                      {row.advanced ? '✅ ' : ''}
                      {row.team}
                      {owner && <span className={styles.groupOwner}> · {owner.member}</span>}
                    </span>
                    <FavorMark team={row.team} />
                    <span className={styles.groupPts}>{row.record.points}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BracketView({
  matches,
  owners,
  myTeam,
  now,
}: {
  matches: FeedMatch[]
  owners: Map<string, RosterEntry>
  myTeam: string | null
  now: Date
}) {
  const resolveSlot = useMemo(() => buildSlotResolver(matches), [matches])
  const ownerOf = useMemo(() => buildOwnerResolver(ROSTER), [])

  const rounds = useMemo(
    () =>
      ROUNDS.map((r) => {
        const games = matches
          .filter((m) => m.round === r.key)
          .sort((a, b) => compareBracketMatches(a, b, now))
        const played = games.filter((m) => m.score?.ft).length
        // "Live" if any game is decided or has two concrete teams ready to play.
        const active = games.some((m) => {
          if (m.score?.ft) return true
          const s1 = resolveSlot(m.team1)
          const s2 = resolveSlot(m.team2)
          return s1.kind === 'team' && s2.kind === 'team'
        })
        return { ...r, games, played, active }
      }).filter((r) => r.games.length > 0),
    [matches, resolveSlot, now],
  )

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const r of rounds) init[r.key] = r.active
    // Group-stage history starts open — it's the bulk of what's happened.
    init.__groups = true
    return init
  })
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  const final = matches.find((m) => m.round === 'Final')
  const finalWin = final ? winnerSide(final) : 0
  const finalWinner = finalWin === 1 ? final!.team1 : finalWin === 2 ? final!.team2 : null
  const championOwner = finalWinner ? ownerOf(finalWinner, final!.date) : undefined

  return (
    <section>
      <p className={styles.lbIntro}>
        The knockout road, trophy-first. Decided games show the score and who went through; upcoming
        ties show the real matchup (or the two teams a slot is waiting on). The completed group stage
        is at the bottom. Tap any round to fold it.
      </p>

      {finalWinner && (
        <div className={`${styles.card} ${styles.championBanner}`}>
          <span className={styles.heroFlag} aria-hidden>
            {getTeamMeta(finalWinner)?.flag ?? '🏆'}
          </span>
          <div>
            <div className={styles.championTitle}>🏆 {finalWinner} — World Champions</div>
            {championOwner && (
              <div className={styles.muted}>{championOwner.member} takes the crown!</div>
            )}
          </div>
        </div>
      )}

      {rounds.map((round) => {
        const isOpen = open[round.key] ?? round.active
        return (
          <div key={round.key} className={styles.koRound}>
            <button
              type="button"
              className={styles.koRoundHead}
              aria-expanded={isOpen}
              onClick={() => toggle(round.key)}
            >
              <span className={styles.koChevron} aria-hidden>
                {isOpen ? '▾' : '▸'}
              </span>
              <span className={styles.koRoundLabel}>
                {round.label}
                {round.sub && <span className={styles.koRoundSub}> · {round.sub}</span>}
              </span>
              <span className={styles.koRoundCount}>
                {round.played}/{round.games.length} played
              </span>
            </button>

            {isOpen && (
              <div className={styles.koList}>
                {round.games.map((match, i) => {
                  const ft = match.score?.ft
                  const win = winnerSide(match)
                  const seed = match.num ?? i
                  const s1 = resolveSlot(match.team1)
                  const s2 = resolveSlot(match.team2)
                  // Who owned each team on the day this game was played (or now,
                  // for upcoming games) — so a past game shows the right person.
                  const owner1 = s1.kind === 'team' ? ownerOf(s1.team, match.date) : undefined
                  const owner2 = s2.kind === 'team' ? ownerOf(s2.team, match.date) : undefined
                  const fam = Boolean(owner1 || owner2)
                  return (
                    <div
                      key={`${match.num ?? i}`}
                      className={`${styles.koMatch} ${fam ? styles.highlight : ''}`}
                    >
                      {(() => {
                        const st = matchStatus(match, now)
                        return (
                          <div className={`${styles.koStatus} ${STATUS_TONE_CLASS[st.tone]}`}>
                            {st.text}
                          </div>
                        )
                      })()}
                      <KoSlot
                        slot={s1}
                        goals={ft?.[0]}
                        isWinner={win === 1}
                        isLoser={win === 2}
                        mood={win === 1 ? happyIcon(seed) : win === 2 ? sadIcon(seed) : undefined}
                        owner={owner1}
                        myTeam={myTeam}
                      />
                      <KoSlot
                        slot={s2}
                        goals={ft?.[1]}
                        isWinner={win === 2}
                        isLoser={win === 1}
                        mood={win === 2 ? happyIcon(seed) : win === 1 ? sadIcon(seed) : undefined}
                        owner={owner2}
                        myTeam={myTeam}
                      />
                      <div className={styles.koMatchMeta}>
                        {formatKickoff(match)}
                        {match.ground ? ` · ${match.ground}` : ''}
                        {wasShootout(match) &&
                          ` · pens ${match.score!.p![0]}–${match.score!.p![1]}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <GroupStage
        matches={matches}
        owners={owners}
        myTeam={myTeam}
        open={open.__groups ?? true}
        onToggle={() => toggle('__groups')}
      />
    </section>
  )
}
