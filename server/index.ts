import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Auth config ───────────────────────────────────────────────────────────────
const PASSCODE   = process.env.APP_PASSCODE  ?? '1234';
const JWT_SECRET = process.env.JWT_SECRET    ?? 'fittrack-dev-secret';
const JWT_EXPIRES = (process.env.JWT_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'];

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Login (public) ────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { passcode } = req.body as { passcode?: string };
  if (!passcode || passcode !== PASSCODE) {
    res.status(401).json({ error: 'Invalid passcode' });
    return;
  }
  const token = jwt.sign({ app: 'fittrack' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token });
});

// ── Database ──────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    type TEXT NOT NULL,
    unit TEXT NOT NULL,
    goal REAL
  );
  CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    date        TEXT NOT NULL,
    value       REAL NOT NULL,
    duration    INTEGER,
    note        TEXT
  );
`);

// Safe migrations — no-op if columns already exist
try { db.exec('ALTER TABLE entries ADD COLUMN image TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE entries ADD COLUMN logged_at TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE entries ADD COLUMN effort TEXT'); } catch { /* already exists */ }

const { c } = db.prepare('SELECT COUNT(*) as c FROM activities').get() as { c: number };
if (c === 0) {
  const ins = db.prepare(
    'INSERT INTO activities (id, name, emoji, type, unit, goal) VALUES (?, ?, ?, ?, ?, ?)'
  );
  ins.run('run',      'Running',  '🏃', 'run',      'km',  5);
  ins.run('cycle',    'Cycling',  '🚴', 'cycle',    'km',  20);
  ins.run('swim',     'Swimming', '🏊', 'swim',     'km',  1);
  ins.run('strength', 'Strength', '🏋️', 'strength', 'min', 45);
}

// ── Protected routes ──────────────────────────────────────────────────────────
app.get('/api/state', requireAuth, (_req, res) => {
  const activities = db
    .prepare('SELECT id, name, emoji, type, unit, goal FROM activities')
    .all();
  const entries = db
    .prepare(
      'SELECT id, activity_id as activityId, date, value, duration, note, effort, image, logged_at as loggedAt FROM entries ORDER BY date'
    )
    .all();
  res.json({ activities, entries });
});

app.post('/api/activities', requireAuth, (req, res) => {
  const a = req.body;
  db.prepare(
    'INSERT OR IGNORE INTO activities (id, name, emoji, type, unit, goal) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(a.id, a.name, a.emoji, a.type, a.unit, a.goal ?? null);
  res.json({ ok: true });
});

app.delete('/api/activities/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM entries WHERE activity_id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/entries', requireAuth, (req, res) => {
  const e = req.body;
  db.prepare(
    'INSERT OR IGNORE INTO entries (id, activity_id, date, value, duration, note, effort, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(e.id, e.activityId, e.date, e.value, e.duration ?? null, e.note ?? null, e.effort ?? null, e.image ?? null, e.loggedAt ?? null);
  res.json({ ok: true });
});

app.delete('/api/entries/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/entries/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE entries SET value = ? WHERE id = ?').run(req.body.value, req.params.id);
  res.json({ ok: true });
});

app.post('/api/import', requireAuth, (req, res) => {
  const { activities = [], entries = [] } = req.body as {
    activities: Array<{ id: string; name: string; emoji: string; type: string; unit: string; goal?: number }>;
    entries: Array<{ id: string; activityId: string; date: string; value: number; duration?: number; note?: string }>;
  };
  const insAct = db.prepare(
    'INSERT OR IGNORE INTO activities (id, name, emoji, type, unit, goal) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insEnt = db.prepare(
    'INSERT OR IGNORE INTO entries (id, activity_id, date, value, duration, note, effort, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (const a of activities)
      insAct.run(a.id, a.name, a.emoji, a.type, a.unit, a.goal ?? null);
    for (const e of entries) {
      const ex = e as Record<string, unknown>;
      insEnt.run(e.id, e.activityId, e.date, e.value, e.duration ?? null, e.note ?? null, ex.effort ?? null, ex.image ?? null, ex.loggedAt ?? null);
    }
  })();
  res.json({ ok: true });
});

// ── Static frontend (production) ──────────────────────────────────────────────
const DIST = path.join(__dirname, '..', 'dist');
app.use(express.static(DIST));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// API_PORT takes priority (set in dev to avoid conflict with Vite's PORT env var)
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`FitTrack running on http://localhost:${PORT}`);
});
