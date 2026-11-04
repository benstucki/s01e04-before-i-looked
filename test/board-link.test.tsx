import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('board links', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await createApp(config).request('/')).text();
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('ok 10 / retry 4 / fail 1');
    expect(html).toContain('ok 7 / retry 0 / fail 0');
    expect(html.indexOf('2026-10-28')).toBeLessThan(html.indexOf('2026-10-27'));
  });

  it('counts a failed line after the job recovers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-board-'));
    try {
      writeFileSync(
        join(dir, '2026-01-01.jsonl'),
        [
          '{"at":"2026-01-01T00:00:00Z","job":"a","status":"fail","owner":"x","error":"boom"}',
          '{"at":"2026-01-01T01:00:00Z","job":"a","status":"ok","owner":"x"}',
        ].join('\n'),
      );
      const config = { adapter: 'shim', installed: '2026-01-01T00:00:00Z', beatEverySeconds: 60, runsDir: dir };
      const html = await (await createApp(config).request('/')).text();
      expect(html).toContain('ok 1 / retry 0 / fail 1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
