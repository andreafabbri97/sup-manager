export function formatDatePretty(date?: string | Date | null): string {
  if (!date) return '—'
  try {
    // Accept ISO date string (YYYY-MM-DD or full ISO), Date object, or other parseable strings
    const d = typeof date === 'string' ? new Date(date) : new Date(date as Date)
    if (isNaN(d.getTime())) return String(date)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  } catch (e) {
    return String(date)
  }
}

export default formatDatePretty
