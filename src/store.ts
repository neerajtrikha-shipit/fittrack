import { useState, useEffect } from 'react';
import type { Activity, WorkoutEntry, AppState } from './types';

const LEGACY_KEY   = 'workout-tracker-v1';
const TOKEN_KEY    = 'fittrack-token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('fittrack-unauthorized'));
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekDates(referenceDate: Date = new Date()): string[] {
  const day = referenceDate.getDay(); // 0 = Sun
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
}

export function getStreak(activityId: string, entries: WorkoutEntry[]): number {
  const dates = new Set(
    entries.filter(e => e.activityId === activityId).map(e => e.date)
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.has(toDateStr(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function post(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(res => { if (res.status === 401) handleUnauthorized(); return res; });
}

export function useStore(authed: boolean) {
  const [state, setState] = useState<AppState>({ activities: [], entries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Not logged in — clear state and stop loading immediately
    if (!authed) {
      setState({ activities: [], entries: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    async function init() {
      // Migrate any existing localStorage data on first boot
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) {
          const legacy = JSON.parse(raw) as AppState;
          await post('/api/import', legacy);
          localStorage.removeItem(LEGACY_KEY);
        }
      } catch { /* ignore migration errors */ }

      const stateRes = await fetch('/api/state', { headers: authHeaders() });
      if (stateRes.status === 401) { handleUnauthorized(); setLoading(false); return; }
      const data = await stateRes.json() as AppState;
      setState(data);
      setLoading(false);
    }
    init().catch(() => setLoading(false));
  }, [authed]); // re-fetch whenever login/logout happens

  function addActivity(activity: Activity) {
    setState(s => ({ ...s, activities: [...s.activities, activity] }));
    post('/api/activities', activity);
  }

  function removeActivity(id: string) {
    setState(s => ({
      activities: s.activities.filter(a => a.id !== id),
      entries: s.entries.filter(e => e.activityId !== id),
    }));
    fetch(`/api/activities/${id}`, { method: 'DELETE', headers: authHeaders() });
  }

  function logEntry(entry: Omit<WorkoutEntry, 'id'>) {
    const id = `${entry.activityId}-${entry.date}-${Date.now()}`;
    const full: WorkoutEntry = { ...entry, id };
    setState(s => ({ ...s, entries: [...s.entries, full] }));
    post('/api/entries', full);
  }

  function removeEntry(id: string) {
    setState(s => ({ ...s, entries: s.entries.filter(e => e.id !== id) }));
    fetch(`/api/entries/${id}`, { method: 'DELETE', headers: authHeaders() });
  }

  function updateEntry(id: string, value: number) {
    setState(s => ({
      ...s,
      entries: s.entries.map(e => e.id === id ? { ...e, value } : e),
    }));
    fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    });
  }

  return { state, loading, addActivity, removeActivity, logEntry, removeEntry, updateEntry };
}
