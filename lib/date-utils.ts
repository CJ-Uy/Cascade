/**
 * Converts a Date to an ISO-like string in UTC+8 timezone.
 * Output format: "2026-03-07T14:30:00+08:00"
 */
export function toUTC8String(date: Date): string {
  // UTC+8 offset in minutes
  const offsetMinutes = 8 * 60;
  // Get the UTC time, then shift by +8 hours
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const utc8 = new Date(utcMs + offsetMinutes * 60000);

  const year = utc8.getFullYear();
  const month = String(utc8.getMonth() + 1).padStart(2, "0");
  const day = String(utc8.getDate()).padStart(2, "0");
  const hours = String(utc8.getHours()).padStart(2, "0");
  const minutes = String(utc8.getMinutes()).padStart(2, "0");
  const seconds = String(utc8.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

/**
 * Converts a Date (treating its local values as UTC+8) to an ISO string.
 * Use this when the Date object's local hours/minutes already represent UTC+8 time
 * (e.g., from a date picker where user selected the date visually).
 */
export function dateToUTC8String(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}T00:00:00+08:00`;
}
