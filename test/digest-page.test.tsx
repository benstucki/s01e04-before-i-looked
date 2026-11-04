import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders the night with the five jobs in order and warns on fail/retry rows', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const jobs = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];
    const at = jobs.map((j) => html.indexOf(j));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain('quota exceeded');
    expect(html).toMatch(/<tr class="warn"><td>fixtures\/refresh</);
    expect(html).toMatch(/<tr class="warn"><td>notes\/backup</);
    expect(html).not.toMatch(/<tr class="warn"><td>lane\/sync</);
  });

  it('404s for a night with no log', async () => {
    const res = await createApp(config).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
  });
});
