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
}

export interface AppState {
  activities: Activity[];
  entries: WorkoutEntry[];
}
