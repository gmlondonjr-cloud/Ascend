// Session-length + streak/progress progression rules. Pure functions; no IO.
//
// Mechanics (from the design brief):
//   - Timer starts at 5 minutes.
//   - Each consecutive day completed adds 5 seconds (cap 30 minutes).
//   - Each missed day subtracts 10 seconds (floor 1 minute).
//   - Streak resets to 0 on any missed day.
//   - Landscape "progress" = cumulative days completed. Cap 300.
//     Breaking a streak costs 10 days of landscape progress (floor 0).

import { daysBetween } from './date';

export const MIN_SECONDS = 60;
export const MAX_SECONDS = 30 * 60;
export const BASE_SECONDS = 5 * 60;
export const SECONDS_PER_STREAK_DAY = 5;
export const MAX_PROGRESS = 300;
export const PROGRESS_PENALTY_ON_BREAK = 10;

/** How long today's session should be, given the current streak. */
export function timerSecondsForStreak(streak: number): number {
  const grown = BASE_SECONDS + streak * SECONDS_PER_STREAK_DAY;
  return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, grown));
}

export interface AppState {
  /** Consecutive-day streak length. */
  streak: number;
  /** Cumulative landscape progress, 0..300. */
  progress: number;
  /** Local day key (YYYY-MM-DD) of the last completed session, or null. */
  lastCompletedDay: string | null;
}

export function initialState(): AppState {
  return { streak: 0, progress: 0, lastCompletedDay: null };
}

/**
 * Apply missed-day penalties when the user opens the app today.
 * If lastCompletedDay is more than one day ago, the streak breaks and
 * the landscape retreats by PROGRESS_PENALTY_ON_BREAK days.
 *
 * Returns the (possibly mutated) state, leaving it unchanged when the
 * user is still in-streak.
 */
export function applyDailyDecay(state: AppState, today: string): AppState {
  if (!state.lastCompletedDay) return state;
  const gap = daysBetween(state.lastCompletedDay, today);
  if (gap <= 1) return state; // 0 = same day, 1 = consecutive day, neither breaks streak

  // Missed (gap - 1) days. Each missed day breaks the streak once and
  // costs PROGRESS_PENALTY_ON_BREAK landscape days.
  const missedDays = gap - 1;
  return {
    ...state,
    streak: 0,
    progress: Math.max(0, state.progress - PROGRESS_PENALTY_ON_BREAK * missedDays),
  };
}

/**
 * Mark today's session complete. Idempotent — only the first completion
 * each calendar day actually counts.
 */
export function completeSession(state: AppState, today: string): AppState {
  if (state.lastCompletedDay === today) return state;
  return {
    streak: state.streak + 1,
    progress: Math.min(MAX_PROGRESS, state.progress + 1),
    lastCompletedDay: today,
  };
}

/** Has the user already completed their session today? */
export function isCompletedToday(state: AppState, today: string): boolean {
  return state.lastCompletedDay === today;
}
