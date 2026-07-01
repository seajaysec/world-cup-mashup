#!/usr/bin/env node
/**
 * Fetches the "just for fun" country indicators from Our World in Data and bakes
 * them into src/data/owid-stats.json — each World Cup country's LATEST value plus
 * its global RANK among all countries for that metric.
 *
 * We bake at build time rather than hitting OWID from the browser: it keeps the
 * app fast and avoids shipping ~200 countries × 10 metrics to every visitor.
 * Re-run with `npm run fetch:owid` to refresh.
 *
 * Source: Our World in Data grapher CSV endpoints. Note EIU's Democracy Index is
 * non-redistributable, so we use V-Dem's open electoral-democracy index.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const METRICS = [
  { key: 'democracy', title: 'Democracy', slug: 'electoral-democracy-index', dir: 'high',
    note: 'V-Dem electoral democracy index (0–1). #1 = most democratic.', fmt: (v) => v.toFixed(2) },
  { key: 'gdp', title: 'GDP per capita', slug: 'gdp-per-capita-worldbank', dir: 'high',
    note: 'World Bank, PPP. #1 = richest per person.', fmt: (v) => '$' + Math.round(v).toLocaleString('en-US') },
  { key: 'life', title: 'Life expectancy', slug: 'life-expectancy', dir: 'high',
    note: '#1 = longest-lived.', fmt: (v) => v.toFixed(1) + ' yrs' },
  { key: 'happiness', title: 'Happiness', slug: 'happiness-cantril-ladder', dir: 'high',
    note: 'Cantril ladder (0–10). #1 = happiest.', fmt: (v) => v.toFixed(2) },
  { key: 'gender', title: 'Gender equality', slug: 'gender-inequality-index-from-the-human-development-report', dir: 'low',
    note: 'UN Gender Inequality Index (lower = more equal). #1 = most equal.', fmt: (v) => v.toFixed(3) },
  { key: 'co2', title: 'CO₂ per capita', slug: 'consumption-co2-per-capita', dir: 'low',
    note: 'Consumption-based, tonnes/person (lower = greener). #1 = greenest.', fmt: (v) => v.toFixed(1) + ' t' },
  { key: 'debt', title: 'Public debt', slug: 'gross-public-sector-debt-as-a-proportion-of-gdp', dir: 'low',
    note: 'Gross public-sector debt, % of GDP (lower = less indebted). #1 = least debt.', fmt: (v) => Math.round(v) + '% GDP' },
  { key: 'military', title: 'Military spending', slug: 'military-expenditure-share-gdp', dir: 'high',
    note: 'Share of GDP. #1 = spends the most.', fmt: (v) => v.toFixed(1) + '% GDP' },
  { key: 'population', title: 'Population', slug: 'population', dir: 'high',
    note: '#1 = most populous.', fmt: (v) => Math.round(v).toLocaleString('en-US') },
]

// World Cup canonical team name → ISO3 country code (OWID's `code`).
// England & Scotland use the UK's data (OWID has no separate home-nations stats).
const TEAM_CODE = {
  Argentina: 'ARG', France: 'FRA', Spain: 'ESP', Brazil: 'BRA', England: 'GBR', Germany: 'DEU',
  Portugal: 'PRT', Netherlands: 'NLD', Belgium: 'BEL', USA: 'USA', Uruguay: 'URY', Croatia: 'HRV',
  Morocco: 'MAR', Colombia: 'COL', Japan: 'JPN', Senegal: 'SEN', Switzerland: 'CHE', Mexico: 'MEX',
  Norway: 'NOR', Sweden: 'SWE', 'South Korea': 'KOR', Ecuador: 'ECU', Canada: 'CAN', 'Ivory Coast': 'CIV',
  Austria: 'AUT', Turkey: 'TUR', Egypt: 'EGY', Australia: 'AUS', Paraguay: 'PRY', Iran: 'IRN',
  Ghana: 'GHA', 'Czech Republic': 'CZE', Algeria: 'DZA', Scotland: 'GBR', 'Bosnia & Herzegovina': 'BIH',
  Tunisia: 'TUN', 'DR Congo': 'COD', Panama: 'PAN', Qatar: 'QAT', 'Saudi Arabia': 'SAU',
  'South Africa': 'ZAF', Uzbekistan: 'UZB', Iraq: 'IRQ', Jordan: 'JOR', 'Cape Verde': 'CPV',
  'New Zealand': 'NZL', Haiti: 'HTI', Curaçao: 'CUW',
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

async function fetchMetric(metric) {
  const url = `https://ourworldindata.org/grapher/${metric.slug}.csv?csvType=full&useColumnShortNames=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${metric.slug}: HTTP ${res.status}`)
  const text = await res.text()
  const lines = text.split('\n').filter(Boolean)
  // columns: entity, code, year, <value>, [owid_region]
  const latest = new Map() // code -> { year, value }
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const code = cols[1]
    const year = Number(cols[2])
    const value = Number(cols[3])
    if (!/^[A-Z]{3}$/.test(code)) continue // ISO3 countries only (skip aggregates/OWID_*)
    if (!Number.isFinite(value) || !Number.isFinite(year)) continue
    const prev = latest.get(code)
    if (!prev || year > prev.year) latest.set(code, { year, value })
  }

  // Store the latest value per World Cup team. Ranking (among WC teams, or among
  // just the family's teams) is computed in the app so it can rank any subset —
  // this is a separate competition, not "vs the whole world".
  const data = {}
  for (const [team, code] of Object.entries(TEAM_CODE)) {
    const v = latest.get(code)
    if (!v) continue
    data[team] = { value: v.value, display: metric.fmt(v.value), year: v.year }
  }
  return data
}

const out = {
  generated: new Date().toISOString(),
  source: 'Our World in Data',
  metrics: METRICS.map((m) => ({
    key: m.key, title: m.title, slug: m.slug, dir: m.dir, note: m.note,
    page: `https://ourworldindata.org/grapher/${m.slug}`,
  })),
  data: {},
}

for (const metric of METRICS) {
  process.stdout.write(`Fetching ${metric.key} (${metric.slug})… `)
  try {
    out.data[metric.key] = await fetchMetric(metric)
    console.log(`${Object.keys(out.data[metric.key]).length} WC teams`)
  } catch (e) {
    console.log(`FAILED: ${e.message}`)
    out.data[metric.key] = {}
  }
}

const dest = fileURLToPath(new URL('../src/data/owid-stats.json', import.meta.url))
writeFileSync(dest, JSON.stringify(out, null, 2))
console.log(`\nWrote ${dest}`)
