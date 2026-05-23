// State persistence — localStorage by default, optional Google Sheets sync.
//
// If VITE_SHEETS_URL is set in .env, save/load also round-trip through the
// Apps Script web app at that URL. Local storage is still written for offline
// resilience; Sheets is best-effort.

import type { AppState } from './progression';
import { initialState } from './progression';

const KEY = 'ascend.state.v1';
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL as string | undefined;

function readLocal(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      progress: typeof parsed.progress === 'number' ? parsed.progress : 0,
      lastCompletedDay:
        typeof parsed.lastCompletedDay === 'string' ? parsed.lastCompletedDay : null,
    };
  } catch {
    return null;
  }
}

function writeLocal(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — fall through silently */
  }
}

async function readSheets(): Promise<AppState | null> {
  if (!SHEETS_URL) return null;
  try {
    const res = await fetch(SHEETS_URL, { method: 'GET' });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; state?: AppState | null };
    if (body.ok && body.state) return body.state;
    return null;
  } catch {
    return null;
  }
}

async function writeSheets(state: AppState): Promise<void> {
  if (!SHEETS_URL) return;
  try {
    // Apps Script web apps don't support custom headers from the browser
    // without preflight; the `text/plain` content-type avoids CORS preflight
    // and Apps Script parses e.postData.contents transparently.
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(state),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Load state — prefers Sheets when configured (so the user's account persists
 * across devices), falls back to localStorage, then to a fresh initial state.
 */
export async function loadState(): Promise<AppState> {
  const remote = await readSheets();
  if (remote) {
    writeLocal(remote); // keep local cache in sync
    return remote;
  }
  return readLocal() ?? initialState();
}

/** Persist state to localStorage immediately, fire-and-forget to Sheets. */
export function saveState(state: AppState): void {
  writeLocal(state);
  void writeSheets(state);
}
