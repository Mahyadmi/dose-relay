/** "/dose-relay" on GitHub Pages, "" locally. Set at build time. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const REPO_URL = "https://github.com/Mahyadmi/dose-relay";

/** localStorage key for all app data. */
export const STORAGE_KEY = "doserelay:v1";

/** Remembers the language after logging out, so the welcome screen keeps it. */
export const LAST_LOCALE_KEY = "doserelay:last-locale";
