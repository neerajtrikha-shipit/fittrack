export type ActivityType = 'run' | 'cycle' | 'swim' | 'strength' | 'custom';

export interface Activity {
  id: string;
  name: string;
  emoji: string;
  type: ActivityType;
  unit: string; // 'km', 'reps', 'min', etc.
  goal?: number; // daily target value
}

export interface WorkoutEntry {
  id: string;
  activityId: string;
  date: string; // YYYY-MM-DD
  value: number; // distance / reps / minutes
  duration?: number; // time in minutes (always)
  note?: string;
  effort?: 'easy' | 'moderate' | 'hard';
  image?: string; // base64 data URL
  loggedAt?: string; // ISO 8601 timestamp e.g. "2026-03-27T08:30:00.000Z"
}

export interface AppState {
  activities: Activity[];
  entries: WorkoutEntry[];
}
