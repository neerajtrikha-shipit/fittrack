import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Activity, WorkoutEntry } from '../types';
import { toDateStr } from '../store';

interface WeekBucket {
  label: string;
  value: number;
  duration: number;
}

function buildWeekBuckets(
  activityId: string,
  entries: WorkoutEntry[],
  now = new Date(),
): WeekBucket[] {
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 13 }, (_, i) => {
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() - (12 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const s = toDateStr(weekStart);
    const e = toDateStr(weekEnd);
    const we = entries.filter(
      en => en.activityId === activityId && en.date >= s && en.date <= e,
    );

    return {
      label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: we.reduce((sum, en) => sum + en.value, 0),
      duration: we.reduce((sum, en) => sum + (en.duration ?? 0), 0),
    };
  });
}

function getTrend(buckets: WeekBucket[], field: 'value' | 'duration') {
  const recent = buckets.slice(9).reduce((s, b) => s + b[field], 0);
  const prior = buckets.slice(5, 9).reduce((s, b) => s + b[field], 0);
  if (prior === 0 && recent === 0) return 'flat';
  if (prior === 0) return 'up';
  const pct = (recent - prior) / prior;
  if (pct > 0.1) return 'up';
  if (pct < -0.1) return 'down';
  return 'flat';
}

function BarChart({
  buckets,
  field,
  color = 'indigo',
}: {
  buckets: WeekBucket[];
  field: 'value' | 'duration';
  color?: 'indigo' | 'purple';
}) {
  const max = Math.max(...buckets.map(b => b[field]), 1);
  const activeBar = color === 'purple' ? 'bg-purple-400' : 'bg-indigo-400';
  const inactiveBar = color === 'purple' ? 'bg-purple-600/35' : 'bg-indigo-600/35';
  const zeroBar = 'bg-[#1e1e2a]';

  return (
    <div className="flex items-end gap-[3px] h-20">
      {buckets.map((b, i) => {
        const val = b[field];
        const heightPct = val > 0 ? Math.max((val / max) * 100, 4) : 1;
        const isCurrent = i === 12;
        return (
          <div
            key={i}
            title={`${b.label}: ${val}`}
            className={`flex-1 rounded-t-sm transition-all duration-500 ${
              val === 0 ? zeroBar : isCurrent ? activeBar : inactiveBar
            }`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}

function fmt(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const TREND_CONFIG: Record<string, { icon: typeof TrendingUp; text: string; bg: string; label: string }> = {
  up:   { icon: TrendingUp,   text: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25', label: 'Trending up' },
  down: { icon: TrendingDown, text: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/25',         label: 'Trending down' },
  flat: { icon: Minus,        text: 'text-slate-500',   bg: 'bg-slate-500/15 border-slate-500/20',     label: 'Steady' },
};

interface Props {
  activities: Activity[];
  entries: WorkoutEntry[];
}

export function AnalyticsView({ activities, entries }: Props) {
  const activityData = useMemo(
    () =>
      activities.map(activity => {
        const buckets = buildWeekBuckets(activity.id, entries);
        const total = buckets.reduce((s, b) => s + b.value, 0);
        const peak = Math.max(...buckets.map(b => b.value));
        const activeWeeks = buckets.filter(b => b.value > 0).length;
        const totalTime = buckets.reduce((s, b) => s + b.duration, 0);
        const hasDuration = buckets.some(b => b.duration > 0);
        const trend = getTrend(buckets, 'value');
        return { activity, buckets, total, peak, activeWeeks, totalTime, hasDuration, trend };
      }),
    [activities, entries],
  );

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-100 tracking-tight mb-1">Analytics</h2>
      <p className="text-xs text-slate-600 uppercase tracking-wider mb-6">Past 13 weeks</p>

      {activities.length === 0 ? (
        <p className="text-center py-16 text-slate-600 text-sm">
          Add activities to see your analytics.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {activityData.map(({ activity, buckets, total, peak, activeWeeks, totalTime, hasDuration, trend }) => {
            const tc = TREND_CONFIG[trend];
            const TrendIcon = tc.icon;

            return (
              <div
                key={activity.id}
                className="bg-gradient-to-br from-[#1c1c28] to-[#161620] border border-[#2a2a38] rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
                    <span className="text-xl">{activity.emoji}</span>
                    {activity.name}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${tc.text} ${tc.bg}`}>
                    <TrendIcon size={10} />
                    {tc.label}
                  </span>
                </div>

                {/* Distance / value chart */}
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                  {activity.unit === 'min' ? 'Time (min)' : `Distance (${activity.unit})`}
                </p>
                <BarChart buckets={buckets} field="value" color="indigo" />
                <div className="flex justify-between mt-1 mb-3">
                  <span className="text-[10px] text-slate-700">{buckets[0].label}</span>
                  <span className="text-[10px] text-slate-600">This wk</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-200">{fmt(total)}{activity.unit}</div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-200">{fmt(peak)}{activity.unit}</div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Peak wk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-200">{activeWeeks}<span className="text-slate-600 font-normal">/13</span></div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Active wks</div>
                  </div>
                </div>

                {/* Duration chart — only if time was ever logged */}
                {hasDuration && activity.unit !== 'min' && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                      Time spent (min)
                    </p>
                    <BarChart buckets={buckets} field="duration" color="purple" />
                    <div className="flex justify-between mt-1 mb-3">
                      <span className="text-[10px] text-slate-700">{buckets[0].label}</span>
                      <span className="text-[10px] text-slate-600">This wk</span>
                    </div>
                    <div className="text-center pt-2 border-t border-white/5">
                      <div className="text-sm font-semibold text-slate-200">{formatDuration(totalTime)}</div>
                      <div className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Total time</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
