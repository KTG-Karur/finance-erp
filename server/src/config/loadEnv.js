import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');

/**
 * Two-step load so switching modes is really just changing one word:
 *
 *   1. `.env` — only ever holds NODE_ENV (development | test | production).
 *   2. `.env.<NODE_ENV>` — the actual per-mode settings (DB host/user/password,
 *      JWT secret, port, CORS origins). Loaded second so its values fill in
 *      anything not already set — dotenv never overwrites a variable that's
 *      already in process.env, so step 1's NODE_ENV always wins.
 *
 * Editing NODE_ENV in `.env` is the entire "quick switch" — nothing else needs
 * to change to move between modes.
 */
export function loadEnv() {
  dotenv.config({ path: path.join(serverRoot, '.env') });

  const mode = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  dotenv.config({ path: path.join(serverRoot, `.env.${mode}`) });

  return mode;
}
