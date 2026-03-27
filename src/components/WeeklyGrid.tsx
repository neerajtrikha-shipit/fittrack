import { Clock, Zap, Route, CalendarCheck, Flame } from 'lucide-react';
import type { Activity, WorkoutEntry } from '../types';
import { getWeekDates, getStreak } from '../store';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  activities: Activity[];
  entries: WorkoutEntry[];
}

function formatDuration(min: number): string {
  if (min === 0) return '0m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gradient-to-br from-[#1c1c28] to-[#161620] border border-[#2a2a38] rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-100 leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-slate-600 uppercase tracking-wider mt-2">{label}</div>
    </div>
  );
}

function DayCell({ date, activities, entries }: { date: string; activities: Activity[]; entries: WorkoutEntry[] }) {
  const dayEntries = entries.filter(e => e.date === date);
  const completedCount = activities.filter(a => {
    const ae = dayEntries.filter(e => e.activityId === a.id);
    const total = ae.reduce((s, e) => s + e.value, 0);
    return a.goal ? total >= a.goal : ae.length > 0;
  }).length;

  const intensity = activities.length > 0 ? completedCount / activities.length : 0;
  const isToday = date === new Date().toISOString().split('T')[0];
  const isPast = date < new Date().toISOString().split('T')[0];

  let bg = isPast ? 'bg-[#1a1a24]' : 'bg-[#15151e]';
  if (intensity > 0 && intensity <= 0.33) bg = 'bg-indigo-900/60';
  else if (intensity > 0.33 && intensity <= 0.66) bg = 'bg-indigo-700/60';
  else if (intensity > 0.66) bg = 'bg-indigo-500/80';

  return (
    <div
      className={`w-full aspect-square rounded-xl ${bg} border ${
        isToday ? 'border-indigo-400/60' : 'border-white/5'
      } flex items-center justify-center text-xs font-semibold transition-all`}
      title={`${date}: ${completedCount}/${activities.length}`}
    >
      {completedCount > 0 ? (
        <span className="text-white/80">{completedCount}</span>
      ) : isToday ? (
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 block" />
      ) : null}
    </div>
  );
}

export function WeeklyGrid({ activities, entries }: Props) {
  const weekDates = getWeekDates();
  const weekEntries = entries.filter(e => weekDates.includes(e.date));

  // Summary stats
  const activeDays = new Set(weekEntries.map(e => e.date)).size;
  const totalTime = weekEntries.reduce((s, e) => s + (e.duration ?? 0), 0);
  const totalDistance = activities
    .filter(a => ['run', 'cycle', 'swim'].includes(a.type))
    .flatMap(a => weekEntries.filter(e => e.activityId === a.id))
    .reduce((s, e) => s + e.value, 0);
  const totalSessions = weekEntries.length;

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-100 tracking-tight mb-6">This Week</h2>

      {/* Summary stats — different from By Activity */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard
          icon={<CalendarCheck size={16} className="text-indigo-300" />}
          label="Active days"
          value={`${activeDays}`}
          sub="of 7"
          color="bg-indigo-500/20"
        />
        <SummaryCard
          icon={<Clock size={16} className="text-purple-300" />}
          label="Total time"
          value={formatDuration(totalTime)}
          color="bg-purple-500/20"
        />
        <SummaryCard
          icon={<Route size={16} className="text-sky-300" />}
          label="Total distance"
          value={totalDistance > 0 ? `${totalDistance % 1 === 0 ? totalDistance : totalDistance.toFixed(1)} km` : '—'}
          sub="run + cycle + swim"
          color="bg-sky-500/20"
        />
        <SummaryCard
          icon={<Zap size={16} className="text-amber-300" />}
          label="Sessions logged"
          value={`${totalSessions}`}
          color="bg-amber-500/20"
        />
      </div>

      {/* Day heatmap */}
      <div className="bg-gradient-to-br from-[#1c1c28] to-[#161620] border border-[#2a2a38] rounded-2xl p-4 mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Activity heatmap</p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-600">{label}</span>
              <DayCell date={weekDates[i]} activities={activities} entries={entries} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-1.5 justify-end">
          <span className="text-xs text-slate-700">Less</span>
          {['bg-[#15151e] border-white/5', 'bg-indigo-900/60 border-white/5', 'bg-indigo-700/60 border-white/5', 'bg-indigo-500/80 border-white/5'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c} border`} />
          ))}
          <span className="text-xs text-slate-700">More</span>
        </div>
      </div>

      {/* By activity — shows distance + time */}
      {activities.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">By activity</p>
          <div className="flex flex-col gap-2">
            {activities.map(activity => {
              const ae = weekEntries.filter(e => e.activityId === activity.id);
              const total = ae.reduce((s, e) => s + e.value, 0);
              const time = ae.reduce((s, e) => s + (e.duration ?? 0), 0);
              const days = new Set(ae.map(e => e.date)).size;
              const maxPossible = (activity.goal ?? 1) * 7;
              const pct = Math.min((total / maxPossible) * 100, 100);
              const streak = getStreak(activity.id, entries);
              const streakColor =
                streak >= 100 ? 'text-yellow-300' :
                streak >= 30  ? 'text-purple-400' :
                streak >= 7   ? 'text-amber-300' :
                'text-orange-400';

              return (
                <div key={activity.id} className="bg-gradient-to-br from-[#1c1c28] to-[#161620] border border-[#2a2a38] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                        <span>{activity.emoji}</span> {activity.name}
                      </span>
                      {streak > 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium mt-0.5 ${streakColor}`}>
                          <Flame size={10} className="fill-current" /> {streak} day{streak !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-300 font-medium">
                        {total > 0
                          ? `${total % 1 === 0 ? total : total.toFixed(1)}${activity.unit}`
                          : <span className="text-slate-600">—</span>
                        }
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-0.5">
                        {time > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-0.5">
                            <Clock size={9} /> {formatDuration(time)}
                          </span>
                        )}
                        {days > 0 && (
                          <span className="text-xs text-slate-600">{days}d</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-[#0f0f13] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
