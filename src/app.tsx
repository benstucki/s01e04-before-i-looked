import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    // The night is a file name under runsDir; anything but a date is not a night.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.notFound();
    try {
      return c.json(readNight(config.runsDir, night));
    } catch (err) {
      if ((err as NodeJS.ErrnoException | null)?.code === 'ENOENT') return c.notFound();
      throw err;
    }
  });

  return app;
}
