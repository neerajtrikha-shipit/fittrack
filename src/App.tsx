import { useState, useEffect } from 'react';
import { Dumbbell, CalendarDays, BarChart2, LogOut } from 'lucide-react';
import { useStore, toDateStr } from './store';
import { TodayView } from './components/TodayView';
import { WeeklyGrid } from './components/WeeklyGrid';
import { AnalyticsView } from './components/AnalyticsView';
import { AddActivityModal } from './components/AddActivityModal';
import { LoginScreen, getStoredToken, clearToken } from './components/LoginScreen';

type Tab = 'today' | 'week' | 'analytics';
const MAX_DAYS_BACK = 7;

const DAILY_MESSAGES = [
  'Consistency is the key 🔑',
  'Every rep counts 💪',
  'Show up today 🎯',
  'Small steps, big results',
  'Progress over perfection ⚡',
  'Your future self will thank you',
  'Keep the streak alive 🔥',
  'Built in the daily grind',
  'One day at a time',
  'Strong body, clear mind',
  'Make it count today',
  'Build the life you want',
  'Rest smart, train hard',
  'Champions are made daily',
  'Never miss twice 💫',
  "Show up. That's the first win.",
  'Earn it every day',
];

function getDailyMessage() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

function App() {
  const [authed, setAuthed] = useState(() => !!getStoredToken());
  const [tab, setTab] = useState<Tab>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateStr(new Date()));
  const { state, loading, addActivity, logEntry, removeEntry } = useStore(authed);

  // Listen for 401 responses from the API
  useEffect(() => {
    const handler = () => setAuthed(false);
    window.addEventListener('fittrack-unauthorized', handler);
    return () => window.removeEventListener('fittrack-unauthorized', handler);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [tab, selectedDate]);

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const todayStr = toDateStr(new Date());
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - MAX_DAYS_BACK);
    return toDateStr(d);
  })();
  const canGoBack = selectedDate > minDate;
  const isToday = selectedDate === todayStr;

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const dailyMessage = getDailyMessage();

  function handleNavigateDate(dir: 'back' | 'forward') {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + (dir === 'back' ? -1 : 1));
    const next = toDateStr(d);
    if (dir === 'back' && next < minDate) return;
    if (dir === 'forward' && next > todayStr) return;
    setSelectedDate(next);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_300ms_ease-out]">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.4)] animate-pulse">
            <Dumbbell size={20} className="text-white" />
          </div>
          <p className="text-sm text-slate-500">Loading your data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      {/* Warm radial glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-violet-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md mx-auto px-4 pb-32 pt-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight leading-none">
              FitTrack
            </h1>
            <p className="text-sm text-slate-400 mt-1">{dateLabel}</p>
            <p className="text-xs text-slate-600 mt-0.5">{dailyMessage}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-400 hover:bg-white/6 transition-all duration-200 active:scale-90"
            >
              <LogOut size={15} />
            </button>
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <Dumbbell size={19} className="text-white" />
            </div>
          </div>
        </div>

        {/* Tab content — keyed so it animates on switch */}
        <div key={tab} className="animate-[slideUp_220ms_ease-out_both]">
          {tab === 'today' ? (
            <TodayView
              activities={state.activities}
              entries={state.entries}
              onLog={logEntry}
              onRemoveEntry={removeEntry}
              onAddActivity={() => setShowAddModal(true)}
              selectedDate={selectedDate}
              onNavigateDate={handleNavigateDate}
              canGoBack={canGoBack}
              isToday={isToday}
            />
          ) : tab === 'week' ? (
            <WeeklyGrid
              activities={state.activities}
              entries={state.entries}
            />
          ) : (
            <AnalyticsView
              activities={state.activities}
              entries={state.entries}
            />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-[#0c0a12]/88 backdrop-blur-2xl border-t border-white/6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto px-6 flex">
          {([
            { id: 'today',     label: 'Today',     icon: Dumbbell    },
            { id: 'week',      label: 'This Week',  icon: CalendarDays },
            { id: 'analytics', label: 'Analytics',  icon: BarChart2   },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-label={label}
              className={`
                flex-1 flex flex-col items-center gap-1.5 py-4 text-xs font-medium
                transition-all duration-200 relative active:opacity-70
                ${tab === id ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}
              `}
            >
              <Icon size={22} strokeWidth={tab === id ? 2 : 1.5} />
              {label}
              {tab === id && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {showAddModal && (
        <AddActivityModal
          onAdd={addActivity}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default App;
