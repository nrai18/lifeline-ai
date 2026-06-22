/**
 * @file dateUtils.js
 * @description Pure-function date helpers for LifeLine AI.
 * No external dependencies — uses only the built-in Date / Intl APIs.
 * @module utils/dateUtils
 */

// ── Formatting ─────────────────────────────────────────────────────────

/**
 * Format a date using Intl.DateTimeFormat presets.
 *
 * Supported `format` strings:
 * | Format       | Example output              |
 * |--------------|-----------------------------|
 * | `'short'`    | 6/22/2026                   |
 * | `'medium'`   | Jun 22, 2026                |
 * | `'long'`     | June 22, 2026               |
 * | `'full'`     | Monday, June 22, 2026       |
 * | `'time'`     | 10:13 PM                    |
 * | `'datetime'` | Jun 22, 2026, 10:13 PM      |
 *
 * @param {Date|string|number} date — Any value accepted by `new Date()`
 * @param {'short'|'medium'|'long'|'full'|'time'|'datetime'} [format='medium']
 * @returns {string} Human-readable date string
 */
export function formatDate(date, format = 'medium') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  /** @type {Record<string, Intl.DateTimeFormatOptions>} */
  const presets = {
    short:    { month: 'numeric', day: 'numeric', year: 'numeric' },
    medium:   { month: 'short', day: 'numeric', year: 'numeric' },
    long:     { month: 'long', day: 'numeric', year: 'numeric' },
    full:     { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    time:     { hour: 'numeric', minute: '2-digit', hour12: true },
    datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
  };

  const options = presets[format] || presets.medium;
  return new Intl.DateTimeFormat('en-US', options).format(d);
}

/**
 * Return a human-friendly relative string such as "in 2 hours" or "3 days ago".
 *
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatRelative(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const now = Date.now();
  const diffMs = d.getTime() - now;
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const MINUTE = 60_000;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;
  const WEEK   = 7 * DAY;
  const MONTH  = 30 * DAY;

  /**
   * Build the relative phrase.
   * @param {number} value
   * @param {string} unit
   */
  const phrase = (value, unit) => {
    const plural = value === 1 ? '' : 's';
    return isFuture
      ? `in ${value} ${unit}${plural}`
      : `${value} ${unit}${plural} ago`;
  };

  if (absDiff < MINUTE)       return 'just now';
  if (absDiff < HOUR)         return phrase(Math.round(absDiff / MINUTE), 'minute');
  if (absDiff < DAY)          return phrase(Math.round(absDiff / HOUR),   'hour');
  if (absDiff < WEEK)         return phrase(Math.round(absDiff / DAY),    'day');
  if (absDiff < MONTH)        return phrase(Math.round(absDiff / WEEK),   'week');
  return phrase(Math.round(absDiff / MONTH), 'month');
}

// ── Deadline helpers ───────────────────────────────────────────────────

/**
 * @typedef {Object} TimeRemaining
 * @property {number}  days         — Whole days remaining (negative if overdue)
 * @property {number}  hours        — Remaining hours (0–23)
 * @property {number}  minutes      — Remaining minutes (0–59)
 * @property {number}  total        — Total milliseconds remaining (negative if overdue)
 * @property {boolean} isOverdue    — true when the deadline has passed
 * @property {'critical'|'urgent'|'normal'|'relaxed'} urgencyLevel
 */

/**
 * Calculate time remaining until a deadline.
 *
 * Urgency bands:
 * - `critical` — overdue or < 1 hour left
 * - `urgent`   — < 24 hours left
 * - `normal`   — < 3 days left
 * - `relaxed`  — 3 + days left
 *
 * @param {Date|string|number} deadline
 * @returns {TimeRemaining}
 */
export function getTimeRemaining(deadline) {
  const target = new Date(deadline);
  const total = target.getTime() - Date.now();
  const isOverdue = total < 0;

  const abs = Math.abs(total);
  const days    = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

  /** @type {'critical'|'urgent'|'normal'|'relaxed'} */
  let urgencyLevel;
  if (isOverdue || abs < 60 * 60 * 1000) {
    urgencyLevel = 'critical';
  } else if (abs < 24 * 60 * 60 * 1000) {
    urgencyLevel = 'urgent';
  } else if (abs < 3 * 24 * 60 * 60 * 1000) {
    urgencyLevel = 'normal';
  } else {
    urgencyLevel = 'relaxed';
  }

  return { days, hours, minutes, total, isOverdue, urgencyLevel };
}

// ── Day / week checks ─────────────────────────────────────────────────

/**
 * Check whether a date falls on today.
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export function isToday(date) {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth() &&
    d.getDate()     === now.getDate()
  );
}

/**
 * Check whether a date falls on tomorrow.
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export function isTomorrow(date) {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth()    === tomorrow.getMonth() &&
    d.getDate()     === tomorrow.getDate()
  );
}

/**
 * Check whether a date falls within the current calendar week (Mon–Sun).
 * @param {Date|string|number} date
 * @returns {boolean}
 */
export function isThisWeek(date) {
  const d = new Date(date);
  const start = getStartOfWeek(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

// ── Boundary helpers ───────────────────────────────────────────────────

/**
 * Return midnight (00:00:00.000) of the given date.
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
export function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the last millisecond (23:59:59.999) of the given date.
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
export function getEndOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Return midnight of the Monday that starts the given date's week.
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
export function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Arithmetic ─────────────────────────────────────────────────────────

/**
 * Return the number of whole calendar days between two dates.
 * The result is always positive (order doesn't matter).
 * @param {Date|string|number} date1
 * @param {Date|string|number} date2
 * @returns {number}
 */
export function getDaysBetween(date1, date2) {
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  return Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
}

/**
 * Format a duration given in **minutes** as a compact string.
 *
 * | Input | Output    |
 * |-------|-----------|
 * | 0     | `'0m'`    |
 * | 45    | `'45m'`   |
 * | 90    | `'1h 30m'`|
 * | 120   | `'2h'`    |
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Greeting ───────────────────────────────────────────────────────────

/**
 * Return a time-of-day greeting.
 *
 * | Hour range | Greeting           |
 * |------------|--------------------|
 * | 05 – 11    | Good morning       |
 * | 12 – 16    | Good afternoon     |
 * | 17 – 20    | Good evening       |
 * | 21 – 04    | Good night         |
 *
 * @returns {string}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}
