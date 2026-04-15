export const SHEET_ID = import.meta.env.VITE_SHEET_ID as string;
export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string;

if (!SHEET_ID || !APPS_SCRIPT_URL) {
  console.warn(
    "[config] VITE_SHEET_ID / VITE_APPS_SCRIPT_URL is not set. Copy .env.example to .env and fill in both values."
  );
}
