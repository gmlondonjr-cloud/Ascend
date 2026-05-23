/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script web-app URL. Optional — falls back to localStorage. */
  readonly VITE_SHEETS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
