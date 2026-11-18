/**
 * The calendar day ("2026-11-18") an ISO timestamp falls on for the person holding the phone.
 * Cutting the UTC string (`iso.slice(0, 10)`) would put anything entered after midnight local
 * time on the previous day for people east of Greenwich, like Turkey (UTC+3).
 * `offsetMinutes` is only a parameter so that tests don't depend on the machine's time zone.
 */
export function localDayKey(iso: string, offsetMinutes = -new Date(iso).getTimezoneOffset()): string {
  return new Date(new Date(iso).getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10)
}
