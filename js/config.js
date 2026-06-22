/**
 * @file config.js
 * @description Central configuration module for LifeLine AI.
 * All app-wide constants, thresholds, and defaults live here.
 * @module config
 */

/**
 * Application-wide configuration constants.
 * @readonly
 * @enum {*}
 */
export const CONFIG = {
  /** Display name shown in the UI header and page title */
  APP_NAME: 'LifeLine AI',

  /** Semantic version of the current release */
  APP_VERSION: '1.0.0',

  /** Gemini model identifier used for all AI requests */
  GEMINI_MODEL: 'gemini-2.0-flash',

  /** Prefix applied to every localStorage key to avoid collisions */
  STORAGE_PREFIX: 'lifeline_',

  // ── Pomodoro timer defaults (in seconds) ──────────────────────────
  /** Standard work interval — 25 minutes */
  POMODORO_WORK: 25 * 60,

  /** Short break interval — 5 minutes */
  POMODORO_BREAK: 5 * 60,

  /** Long break interval — 15 minutes */
  POMODORO_LONG_BREAK: 15 * 60,

  // ── Chat ──────────────────────────────────────────────────────────
  /** Maximum number of chat messages retained in localStorage */
  MAX_CHAT_HISTORY: 50,

  // ── Task management ───────────────────────────────────────────────
  /**
   * Priority levels mapped to numeric weights.
   * Higher value === higher urgency.
   * @type {{ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }}
   */
  PRIORITY_LEVELS: { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 },

  /**
   * Allowed task categories presented in the UI.
   * @type {string[]}
   */
  TASK_CATEGORIES: ['Work', 'Study', 'Personal', 'Health', 'Finance', 'Social'],

  /**
   * Risk-score thresholds that determine a task's risk band.
   * Scores >= HIGH are flagged red, >= MEDIUM amber, otherwise green.
   * @type {{ HIGH: number, MEDIUM: number, LOW: number }}
   */
  RISK_THRESHOLDS: { HIGH: 0.7, MEDIUM: 0.4, LOW: 0 }
};
