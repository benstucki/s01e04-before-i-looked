import { readNight } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Board counts for one night, from readNight. Bad lines are not counted.
// A DigestRow keeps runs, retries and the last status only, so a fail is seen as a job whose
// last status is fail: a job that failed and later recovered the same night is counted as ok.
// Returns null when the night has no file (ENOENT); other errors still throw.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  let digest;
  try {
    digest = readNight(runsDir, night);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  let retry = 0;
  let fail = 0;
  let runs = 0;
  for (const row of digest.rows) {
    runs += row.runs;
    retry += row.retries;
    if (row.lastStatus === 'fail') fail++;
  }
  return { ok: runs - retry - fail, retry, fail };
}
