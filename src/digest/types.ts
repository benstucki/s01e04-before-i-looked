// Plan morning-digest §1. Section 2 starts against this signature.
// Times stay as written in the log, offset included.

export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
};

export function readNight(runsDir: string, night: string): NightDigest {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented');
}
