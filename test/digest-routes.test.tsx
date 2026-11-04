import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const GOOD = [
  '{"at":"2026-01-02T00:00:00Z","job":"b","status":"ok","owner":"x"}',
  '{"at":"2026-01-02T00:00:00Z","job":"a","status":"fail","owner":null,"error":"nope"}',
];

let runsDir: string;

function app() {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

function night(date: string, lines: string[]) {
  writeFileSync(join(runsDir, `${date}.jsonl`), lines.map((l) => `${l}\n`).join(''));
}

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  mkdirSync(runsDir, { recursive: true });
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('200: page and JSON list the same jobs, sorted by job', async () => {
    night('2026-01-02', GOOD);

    const page = await app().request('/digest/2026-01-02');
    const html = await page.text();
    expect(page.status).toBe(200);
    const pa = html.indexOf('<td>a</td>');
    const pb = html.indexOf('<td>b</td>');
    expect(pa).toBeGreaterThanOrEqual(0);
    expect(pb).toBeGreaterThanOrEqual(0);
    expect(pa).toBeLessThan(pb);

    const api = await app().request('/api/digest/2026-01-02');
    expect(api.status).toBe(200);
    const body = (await api.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.rows.map((r) => r.job)).toEqual(['a', 'b']);
    expect(body.badLines).toBe(0);
  });

  it('404: a night with no file', async () => {
    const page = await app().request('/digest/2026-01-03');
    expect(page.status).toBe(404);
    const api = await app().request('/api/digest/2026-01-03');
    expect(api.status).toBe(404);
  });

  it('empty file: page says nothing ran, JSON is empty', async () => {
    writeFileSync(join(runsDir, '2026-01-04.jsonl'), '');

    const page = await app().request('/digest/2026-01-04');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');

    const api = await app().request('/api/digest/2026-01-04');
    expect(api.status).toBe(200);
    expect(await api.json()).toEqual({ rows: [], badLines: 0 });
  });

  it('bad line: still 200, good job kept, badLines is 1', async () => {
    night('2026-01-05', [...GOOD, 'this is not json']);

    const page = await app().request('/digest/2026-01-05');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('<td>b</td>');

    const api = await app().request('/api/digest/2026-01-05');
    expect(api.status).toBe(200);
    const body = (await api.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.rows.map((r) => r.job)).toContain('b');
    expect(body.badLines).toBe(1);
  });
});
