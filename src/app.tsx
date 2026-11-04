import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight, type NightDigest } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

// A night is a date-named file under runsDir. Anything else, or a missing file, is a 404.
function loadNight(runsDir: string, night: string): NightDigest | null {
  if (!NIGHT.test(night)) return null;
  try {
    return readNight(runsDir, night);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

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

  app.get('/digest/:night', (c) => {
    const digest = loadNight(config.runsDir, c.req.param('night'));
    if (!digest) return c.notFound();
    return c.html(
      <Layout title="digest" lane={lane()}>
        <DigestPage night={c.req.param('night')} digest={digest} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const digest = loadNight(config.runsDir, c.req.param('night'));
    if (!digest) return c.notFound();
    return c.json(digest);
  });

  return app;
}
