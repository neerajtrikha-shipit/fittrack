import { useState, useEffect, useRef, useMemo } from 'react';
import { Flame, Plus, Check, X, Clock, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import type { Activity, WorkoutEntry } from '../types';
import { toDateStr, getStreak } from '../store';

interface Props {
  activities: Activity[];
  entries: WorkoutEntry[];
  onLog: (entry: Omit<WorkoutEntry, 'id'>) => void;
  onRemoveEntry: (id: string) => void;
  onAddActivity: () => void;
  selectedDate: string;
  onNavigateDate: (dir: 'back' | 'forward') => void;
  canGoBack: boolean;
  isToday: boolean;
}

function formatDateLabel(dateStr: string): string {
  const todayStr = toDateStr(new Date());
  if (dateStr === todayStr) return 'Today';
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  if (dateStr === toDateStr(yd)) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDateSubtitle(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function buildShareText(
  dateStr: string,
  activities: Activity[],
  entries: WorkoutEntry[],
): string {
  const todayEntries = entries.filter(e => e.date === dateStr);
  const isToday = dateStr === toDateStr(new Date());
  const dateLabel = isToday
    ? 'Today'
    : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
      });

  let completed = 0;
  const lines = activities.map(a => {
    const ae = todayEntries.filter(e => e.activityId === a.id);
    const total = ae.reduce((s, e) => s + e.value, 0);
    const time = ae.reduce((s, e) => s + (e.duration ?? 0), 0);
    const goalMet = a.goal ? total >= a.goal : ae.length > 0;
    if (goalMet) completed++;

    if (total === 0) return `⬜ ${a.emoji} ${a.name}: not logged`;

    const valStr = `${total % 1 === 0 ? total : total.toFixed(1)}${a.unit}`;
    const timeStr = time > 0 ? ` · ${time < 60 ? `${time}m` : `${Math.floor(time / 60)}h ${time % 60 > 0 ? `${time % 60}m` : ''}`.trim()}` : '';
    return `${goalMet ? '✅' : '🔄'} ${a.emoji} ${a.name}: ${valStr}${timeStr}`;
  });

  const footer = `\n${completed}/${activities.length} goals hit${completed === activities.length && completed > 0 ? ' 🔥' : ''}`;
  return `🏋️ FitTrack — ${dateLabel}\n\n${lines.join('\n')}${footer}`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MILESTONE_LABELS: Record<number, string> = {
  7: '1 wk', 14: '2 wks', 21: '3 wks',
  30: '1 mo', 60: '2 mo', 90: '3 mo',
  100: '100!', 180: '6 mo', 365: '1 yr',
};

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;

  const tier =
    streak >= 100 ? 'legendary' :
    streak >= 30  ? 'purple' :
    streak >= 7   ? 'gold' :
    'orange';

  const styles = {
    orange:    { text: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/25',  glow: '', flame: 'fill-orange-500 text-orange-400' },
    gold:      { text: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-400/30',   glow: '', flame: 'fill-amber-400 text-amber-300' },
    purple:    { text: 'text-purple-300',  bg: 'bg-purple-500/18',  border: 'border-purple-400/30',  glow: '', flame: 'fill-purple-400 text-purple-300' },
    legendary: { text: 'text-yellow-200',  bg: 'bg-yellow-500/15',  border: 'border-yellow-400/35',  glow: 'shadow-[0_0_10px_rgba(234,179,8,0.35)]', flame: 'fill-yellow-300 text-yellow-200' },
  }[tier];

  const milestone = MILESTONE_LABELS[streak];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text} ${styles.glow}`}>
      <Flame size={10} className={styles.flame} />
      {streak} day{streak !== 1 ? 's' : ''}
      {milestone && <span className="opacity-60">· {milestone}</span>}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-14 px-4 text-center animate-[slideUp_400ms_ease-out_both]">
      {/* Icon cluster */}
      <div className="relative mb-8 w-24 h-24">
        <div className="w-24 h-24 bg-gradient-to-br from-violet-600/20 to-indigo-600/10 rounded-3xl border border-violet-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.15)]">
          <span className="text-5xl select-none">🏃</span>
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#1d1928] border border-white/10 rounded-2xl flex items-center justify-center text-xl shadow-lg select-none">🚴</div>
        <div className="absolute -bottom-3 -left-3 w-10 h-10 bg-[#1d1928] border border-white/10 rounded-2xl flex items-center justify-center text-xl shadow-lg select-none">🏋️</div>
      </div>

      <h3 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
        Start your journey
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed max-w-[260px] mb-10">
        Add your first activity and start building daily habits. Every great streak begins with one logged day.
      </p>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-[0_0_24px_rgba(124,58,237,0.35)] active:scale-95 transition-all duration-200 text-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Add your first activity
      </button>

      <p className="text-xs text-slate-700 mt-5">Running · Cycling · Swimming · Strength — you choose</p>
    </div>
  );
}

// Deterministic confetti layout — same positions every time for a given activity
function makeConfetti(seed: number) {
  const colors = ['#10b981', '#34d399', '#6366f1', '#f59e0b', '#ec4899', '#f97316', '#a78bfa', '#60a5fa'];
  return Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 38 + ((i * 7 + seed) % 24);
    return {
      id: i,
      color: colors[(i + seed) % colors.length],
      tx: Math.round(Math.cos(angle) * dist),
      ty: Math.round(Math.sin(angle) * dist - 10),
      tr: ((i % 2 === 0 ? 1 : -1) * (150 + (i * 37 + seed) % 200)),
      delay: i * 22,
      w: [4, 5, 6, 4][i % 4],
      h: [4, 6, 4, 5][i % 4],
      radius: i % 3 === 0 ? '50%' : '2px',
    };
  });
}

function ActivityCard({
  activity,
  todayEntries,
  streak,
  onLog,
  onRemove,
}: {
  activity: Activity;
  todayEntries: WorkoutEntry[];
  streak: number;
  onLog: (value: number, duration?: number) => void;
  onRemove: (id: string) => void;
}) {
  const [inputting, setInputting] = useState(false);
  const [val, setVal] = useState('');
  const [dur, setDur] = useState('');
  const [justLogged, setJustLogged] = useState(false);
  const [goalJustMet, setGoalJustMet] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [tapped, setTapped] = useState(false);

  const todayTotal = todayEntries.reduce((s, e) => s + e.value, 0);
  const todayTime = todayEntries.reduce((s, e) => s + (e.duration ?? 0), 0);
  const goalMet = activity.goal ? todayTotal >= activity.goal : todayEntries.length > 0;
  const isTimeOnly = activity.unit === 'min';

  // Detect the moment goalMet first becomes true (not on mount if already met)
  const prevGoalMetRef = useRef(goalMet);
  useEffect(() => {
    if (goalMet && !prevGoalMetRef.current) {
      setGoalJustMet(true);
      setBouncing(true);
      const t1 = setTimeout(() => setGoalJustMet(false), 1200);
      const t2 = setTimeout(() => setBouncing(false), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevGoalMetRef.current = goalMet;
  }, [goalMet]);

  // Stable confetti layout tied to activity id
  const confettiPieces = useMemo(
    () => makeConfetti(activity.id.charCodeAt(0)),
    [activity.id]
  );

  function submit() {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      const d = parseFloat(dur);
      onLog(n, !isNaN(d) && d > 0 ? d : undefined);
      setVal('');
      setDur('');
      setInputting(false);
      setJustLogged(true);
      setTapped(true);
      setTimeout(() => setJustLogged(false), 700);
      setTimeout(() => setTapped(false), 300);
    }
  }

  return (
    <div
      className={`
        rounded-2xl p-5 border transition-colors duration-500 relative overflow-hidden
        ${bouncing ? 'animate-[cardBounce_600ms_ease-out]' : ''}
        ${goalMet
          ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-[#0f1a12] shadow-[0_4px_24px_rgba(0,0,0,0.5),0_4px_20px_rgba(16,185,129,0.12)]'
          : 'border-[#2a2a38] bg-gradient-to-br from-[#1c1c28] to-[#161620] hover:border-[#3a3a50] shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
        }
        ${justLogged && !goalMet ? 'shadow-[0_0_24px_4px_rgba(99,102,241,0.25)]' : ''}
      `}
    >
      {/* Confetti burst — only on first completion */}
      {goalJustMet && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          {confettiPieces.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: '38%',
                width: `${p.w}px`,
                height: `${p.h}px`,
                borderRadius: p.radius,
                backgroundColor: p.color,
                animation: 'confettiFly 750ms ease-out forwards',
                animationDelay: `${p.delay}ms`,
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                '--tr': `${p.tr}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Emoji / checkmark box with animated transition */}
          <div className={`
            w-[52px] h-[52px] rounded-2xl shrink-0 relative overflow-hidden
            transition-colors duration-500
            ${goalMet ? 'bg-emerald-500/20' : 'bg-white/5'}
          `}>
            {/* Emoji — exits when goal met */}
            <span
              className="absolute inset-0 flex items-center justify-center text-3xl select-none transition-all duration-300"
              style={{
                opacity: goalMet ? 0 : 1,
                transform: goalMet ? 'scale(0) rotate(20deg)' : 'scale(1) rotate(0deg)',
              }}
            >
              {activity.emoji}
            </span>
            {/* Checkmark — pops in when goal met */}
            {goalMet && (
              <span
                key="check"
                className="absolute inset-0 flex items-center justify-center animate-[checkPop_500ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
              >
                <Check size={22} className="text-emerald-400" strokeWidth={2.5} />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100">{activity.name}</span>
              {goalMet && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full font-medium">
                  <Check size={10} strokeWidth={3} /> Done
                </span>
              )}
            </div>
            {streak > 0 && (
              <div className="mt-1">
                <StreakBadge streak={streak} />
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {todayTotal > 0 && (
                <span className="text-sm text-slate-400">
                  {todayTotal % 1 === 0 ? todayTotal : todayTotal.toFixed(1)}{activity.unit}
                  {activity.goal && (
                    <span className="text-slate-600"> / {activity.goal}{activity.unit}</span>
                  )}
                </span>
              )}
              {todayTime > 0 && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Clock size={11} />{formatDuration(todayTime)}
                </span>
              )}
              {todayTotal === 0 && activity.goal && (
                <span className="text-sm text-slate-600">Goal: {activity.goal}{activity.unit}</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setInputting(v => !v)}
          aria-label={inputting ? `Cancel logging ${activity.name}` : `Log ${activity.name}`}
          className={`
            w-11 h-11 flex items-center justify-center rounded-full shrink-0 transition-all duration-200 active:scale-90
            ${inputting
              ? 'bg-[#2a2a38] text-slate-400 rotate-45'
              : goalMet
                ? 'bg-emerald-700/60 hover:bg-emerald-600/70 text-white ring-1 ring-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-1 ring-indigo-500/40 hover:ring-indigo-400/60 shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:shadow-[0_0_18px_rgba(99,102,241,0.6)]'
            }
          `}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {inputting && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                autoFocus
                type="number"
                min="0"
                step="0.1"
                placeholder={isTimeOnly ? 'min...' : `${activity.unit}...`}
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setInputting(false); }}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 pointer-events-none">
                {activity.unit}
              </span>
            </div>
            {!isTimeOnly && (
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="time..."
                  value={dur}
                  onChange={e => setDur(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setInputting(false); }}
                  className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 pointer-events-none">
                  min
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              className={`flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95 ${tapped ? 'animate-[tapFeedback_280ms_ease-out]' : ''}`}
            >
              Log it
            </button>
            <button
              onClick={() => { setInputting(false); setVal(''); setDur(''); }}
              aria-label="Cancel"
              className="min-w-[44px] py-3 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-white/5 transition-colors active:scale-95 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {todayEntries.length > 0 && !inputting && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {todayEntries.map(e => (
            <span
              key={e.id}
              className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/8 text-slate-400 px-2.5 py-1 rounded-full group cursor-default"
            >
              {e.value}{activity.unit}
              {e.duration ? <span className="text-slate-600">· {formatDuration(e.duration)}</span> : null}
              <button
                onClick={() => onRemove(e.id)}
                className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-0.5"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TodayView({
  activities, entries, onLog, onRemoveEntry, onAddActivity,
  selectedDate, onNavigateDate, canGoBack, isToday,
}: Props) {
  const [showCopied, setShowCopied] = useState(false);
  const today = selectedDate;
  const todayEntries = entries.filter(e => e.date === today);

  const completed = activities.filter(a => {
    const ae = todayEntries.filter(e => e.activityId === a.id);
    const total = ae.reduce((s, e) => s + e.value, 0);
    return a.goal ? total >= a.goal : ae.length > 0;
  }).length;

  async function handleShare() {
    const text = buildShareText(selectedDate, activities, entries);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }

  return (
    <div>
      {/* Date navigation header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigateDate('back')}
          disabled={!canGoBack}
          aria-label="Previous day"
          className={`
            w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90
            ${canGoBack
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
              : 'text-slate-700 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft size={22} />
        </button>

        <div className="text-center flex-1 px-2">
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight leading-none">
            {formatDateLabel(selectedDate)}
          </h2>
          {!isToday && (
            <p className="text-xs text-slate-600 mt-1">{formatDateSubtitle(selectedDate)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-100 tabular-nums leading-none">
              {completed}<span className="text-slate-600">/{activities.length}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">goals</div>
          </div>

          <div className="relative">
            <button
              onClick={handleShare}
              aria-label="Share today's workout"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all duration-200 active:scale-90"
            >
              <Share2 size={18} />
            </button>
            {showCopied && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-10">
                Copied!
              </span>
            )}
          </div>

          <button
            onClick={() => onNavigateDate('forward')}
            aria-label="Next day"
            className={`
              w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90
              ${isToday
                ? 'opacity-0 pointer-events-none'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
              }
            `}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState onAdd={onAddActivity} />
      ) : (
        <>
          {/* Activity cards */}
          <div className="flex flex-col gap-3">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="animate-[slideUp_300ms_ease-out_both]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <ActivityCard
                  activity={activity}
                  todayEntries={todayEntries.filter(e => e.activityId === activity.id)}
                  streak={getStreak(activity.id, entries)}
                  onLog={(value, duration) => onLog({ activityId: activity.id, date: today, value, duration })}
                  onRemove={onRemoveEntry}
                />
              </div>
            ))}
          </div>

          <button
            onClick={onAddActivity}
            className="
              mt-4 w-full flex items-center justify-center gap-2.5 rounded-2xl py-4
              bg-gradient-to-r from-indigo-600/20 to-violet-600/20
              border border-indigo-500/30 hover:border-indigo-400/60
              text-indigo-400 hover:text-indigo-300
              hover:from-indigo-600/30 hover:to-violet-600/30
              transition-all duration-200 group active:scale-[0.98]
              animate-[slideUp_300ms_ease-out_both]
            "
            style={{ animationDelay: `${activities.length * 60}ms` }}
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600/60 group-hover:bg-indigo-500/80 flex items-center justify-center transition-colors">
              <Plus size={14} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-sm font-medium">Add activity</span>
          </button>
        </>
      )}
    </div>
  );
}
