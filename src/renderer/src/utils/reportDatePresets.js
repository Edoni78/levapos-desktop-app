/**
 * Dita e biznesit fillon në orën 05:00 (tregu mbyllet në 5 të mëngjesit).
 * Deri në 04:59 jemi ende në ditën e mëparshme.
 */
const BUSINESS_DAY_START_HOUR = 5

export function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Data e sotme e biznesit si Date (mesnata lokale e ditës aktuale të biznesit). */
export function businessToday() {
  const now = new Date()
  const shifted = new Date(now.getTime() - BUSINESS_DAY_START_HOUR * 60 * 60 * 1000)
  return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate())
}

/** Monday as first day of week */
export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function endOfWeek(d) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  return e
}

export const REPORT_PRESET_IDS = [
  'today',
  'yesterday',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'custom',
]

export function getPresetRange(presetId) {
  const today = businessToday()

  switch (presetId) {
    case 'today':
      return { start: isoDate(today), end: isoDate(today) }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { start: isoDate(y), end: isoDate(y) }
    }
    case 'thisWeek': {
      const s = startOfWeek(today)
      return { start: isoDate(s), end: isoDate(today) }
    }
    case 'lastWeek': {
      const thisWeekStart = startOfWeek(today)
      const lastEnd = new Date(thisWeekStart)
      lastEnd.setDate(lastEnd.getDate() - 1)
      const lastStart = startOfWeek(lastEnd)
      return { start: isoDate(lastStart), end: isoDate(lastEnd) }
    }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: isoDate(s), end: isoDate(today) }
    }
    case 'lastMonth': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const e = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: isoDate(s), end: isoDate(e) }
    }
    default:
      return null
  }
}

export function formatSqDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRangeLabel(start, end) {
  if (!start || !end) return ''
  if (start === end) return formatSqDate(start)
  return `${formatSqDate(start)} – ${formatSqDate(end)}`
}
