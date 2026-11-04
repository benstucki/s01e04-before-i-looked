import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight on runs/2026-10-28', () => {
  it('reads 5 jobs and 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest.badLines).toBe(1);
    expect(digest.rows).toEqual([
      { job: 'digest/render', owner: null, runs: 1, retries: 0, lastStatus: 'ok', lastError: null, first: '2026-10-29T05:41:09+01:00', last: '2026-10-29T05:41:09+01:00' },
      { job: 'fixtures/refresh', owner: 'rook', runs: 4, retries: 3, lastStatus: 'ok', lastError: null, first: '2026-10-29T01:30:00+01:00', last: '2026-10-29T01:37:00+01:00' },
      { job: 'lane/sync', owner: 'rook', runs: 8, retries: 1, lastStatus: 'ok', lastError: null, first: '2026-10-28T23:00:06+01:00', last: '2026-10-29T05:00:04+01:00' },
      { job: 'notes/backup', owner: 'lane-07', runs: 1, retries: 0, lastStatus: 'fail', lastError: 'quota exceeded', first: '2026-10-29T04:00:01+01:00', last: '2026-10-29T04:00:01+01:00' },
      { job: 'rig/rotate-logs', owner: 'lane-07', runs: 1, retries: 0, lastStatus: 'ok', lastError: null, first: '2026-10-28T23:00:02+01:00', last: '2026-10-28T23:00:02+01:00' },
    ]);
  });
});

describe('readNight in a temp dir', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('throws ENOENT for a missing night', () => {
    expect(() => readNight(dir, '2026-01-01')).toThrow(expect.objectContaining({ code: 'ENOENT' }));
  });

  it('returns no rows for an empty file', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('keeps a null owner', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"ok","owner":null}\n');
    expect(readNight(dir, '2026-01-01').rows[0]?.owner).toBeNull();
  });

  it('counts malformed lines and orders by time, not by text', () => {
    const lines = [
      '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"fail","owner":"x","error":"boom"}',
      '{"at":"2026-01-01T00:30:00Z","job":"a","status":"ok","owner":"y"}',
      '{"at":"2026-01-01T00:00:00Z","job":"a","status":"ok"}',
      '{"at":"2026-01-01T00:00:00Z","job":"a","status":"done","owner":null}',
      '{"at":"2026-01-01T00:00:00Z","job":"a","status":"ok","owner":null,"error":5}',
      '[1]',
    ];
    writeFileSync(join(dir, '2026-01-01.jsonl'), lines.join('\n'));
    const digest = readNight(dir, '2026-01-01');
    expect(digest.badLines).toBe(4);
    expect(digest.rows).toEqual([
      { job: 'a', owner: 'y', runs: 2, retries: 0, lastStatus: 'ok', lastError: null, first: '2026-01-01T01:00:00+01:00', last: '2026-01-01T00:30:00Z' },
    ]);
  });
});
