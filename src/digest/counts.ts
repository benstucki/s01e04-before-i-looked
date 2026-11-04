import { readNight } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Board counts for one night, from readNight. Bad lines are not counted.
// ok, retry, and fail are parsed lines of that status. A job that fails and later
// recovers still counts the failed line.
// Returns null when the night has no file (ENOENT); other errors still throw.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  let digest;
  try {
    digest = readNight(runsDir, night);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const row of digest.rows) {
    retry += row.retries;
    fail += row.fails;
    ok += row.runs - row.retries - row.fails;
  }
  return { ok, retry, fail };
}
