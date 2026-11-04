import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest } from './types.js';

type Event = {
  at: string;
  time: number;
  job: string;
  status: JobStatus;
  owner: string | null;
  error: string | null;
};

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

function isStatus(v: unknown): v is JobStatus {
  return typeof v === 'string' && STATUSES.includes(v);
}

function parseLine(line: string): Event | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const { at, job, status, owner, error } = o;
  if (typeof at !== 'string' || typeof job !== 'string' || !isStatus(status)) return null;
  // An `at` that is not a time cannot be ordered.
  const time = Date.parse(at);
  if (Number.isNaN(time)) return null;
  if (!('owner' in o) || (owner !== null && typeof owner !== 'string')) return null;
  if ('error' in o && typeof error !== 'string') return null;
  return { at, time, job, status, owner, error: typeof error === 'string' ? error : null };
}

export function readNight(runsDir: string, night: string): NightDigest {
  const text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const byJob = new Map<string, Event[]>();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const event = parseLine(line);
    if (event === null) {
      badLines++;
      continue;
    }
    const events = byJob.get(event.job);
    if (events) events.push(event);
    else byJob.set(event.job, [event]);
  }

  const rows: DigestRow[] = [];
  for (const [job, events] of byJob) {
    // Stable sort: equal times keep file order, so the later line counts as the latest.
    events.sort((a, b) => a.time - b.time);
    const first = events[0];
    const latest = events[events.length - 1];
    rows.push({
      job,
      owner: latest.owner,
      runs: events.length,
      retries: events.filter((e) => e.status === 'retry').length,
      fails: events.filter((e) => e.status === 'fail').length,
      lastStatus: latest.status,
      lastError: latest.error,
      first: first.at,
      last: latest.at,
    });
  }
  rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  return { rows, badLines };
}
