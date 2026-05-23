/**
 * Ascend — Google Apps Script Web App backend (optional state persistence).
 *
 * Setup:
 *   1. Create a new Google Sheet (any name).
 *   2. Extensions → Apps Script.
 *   3. Paste this whole file (overwrite the default `Code.gs`).
 *   4. Save, then Deploy → New deployment → "Web app".
 *      - Description: Ascend backend
 *      - Execute as:  Me
 *      - Who has access: Anyone (with the link)
 *   5. Copy the deployment URL (looks like https://script.google.com/macros/s/.../exec).
 *   6. In your Vite project: create `.env` with `VITE_SHEETS_URL=<that URL>`.
 *
 * The sheet stores one row per save: an ISO timestamp + the full AppState JSON.
 * GET returns the most recent state.
 *
 * Note: the browser POSTs as text/plain to avoid a CORS preflight. The
 * client sends raw JSON in the body; Apps Script parses it server-side.
 */

const STATE_SHEET = 'state';

function _stateSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(STATE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(STATE_SHEET);
    sheet.appendRow(['updated_at', 'state_json']);
  }
  return sheet;
}

/** GET → returns the latest persisted AppState (or null if none). */
function doGet() {
  const sheet = _stateSheet();
  const last = sheet.getLastRow();
  let state = null;
  if (last > 1) {
    try {
      state = JSON.parse(sheet.getRange(last, 2).getValue());
    } catch (err) {
      state = null;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, state })).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** POST → appends a new state row. Body is the AppState as raw JSON text. */
function doPost(e) {
  const sheet = _stateSheet();
  const body = (e && e.postData && e.postData.contents) || '{}';
  // Best-effort validate
  try {
    JSON.parse(body);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: 'invalid_json' }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
  sheet.appendRow([new Date().toISOString(), body]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON,
  );
}
