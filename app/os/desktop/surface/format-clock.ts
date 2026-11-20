const pad = (n: number) => String(n).padStart(2, "0");

/** HH:MM, local time. */
export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
