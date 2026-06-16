/**
 * Get today's date string (YYYY-MM-DD) in a given IANA timezone.
 * Falls back to browser local date if timezone is invalid.
 */
export function todayInTz(ianaTimezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}

/**
 * Format a UTC datetime string as a human-readable date+time in the given timezone.
 */
export function formatInTz(utcDateStr, ianaTimezone, opts = {}) {
  if (!utcDateStr) return '';
  try {
    const date = new Date(utcDateStr);
    return date.toLocaleString('en-IN', {
      timeZone: ianaTimezone,
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
      ...opts,
    });
  } catch {
    return new Date(utcDateStr).toLocaleString();
  }
}

/**
 * Format just the time portion in the given timezone.
 */
export function formatTimeInTz(utcDateStr, ianaTimezone) {
  if (!utcDateStr) return '';
  try {
    return new Date(utcDateStr).toLocaleTimeString('en-IN', {
      timeZone: ianaTimezone,
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return new Date(utcDateStr).toLocaleTimeString();
  }
}

/**
 * Format just the date portion (short) in the given timezone.
 */
export function formatDateInTz(utcDateStr, ianaTimezone) {
  if (!utcDateStr) return '';
  try {
    return new Date(utcDateStr).toLocaleDateString('en-IN', {
      timeZone: ianaTimezone,
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return new Date(utcDateStr).toLocaleDateString();
  }
}
