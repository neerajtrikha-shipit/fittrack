import { useState } from 'react';
import { X } from 'lucide-react';
import type { Activity, ActivityType } from '../types';

const EMOJI_PRESETS = ['🏃', '🚴', '🏊', '🏋️', '🧘', '⛷️', '🤸', '🥊', '🏸', '⛹️', '🚣', '🧗', '🤾', '🎾', '🏄'];

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'run', label: 'Run' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'swim', label: 'Swim' },
  { value: 'strength', label: 'Strength' },
  { value: 'custom', label: 'Custom' },
];

const UNIT_OPTIONS = ['km', 'mi', 'min', 'reps', 'sets', 'cal'];

interface Props {
  onAdd: (activity: Activity) => void;
  onClose: () => void;
}

export function AddActivityModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [type, setType] = useState<ActivityType>('custom');
  const [unit, setUnit] = useState('km');
  const [goal, setGoal] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');

  function handleSubmit() {
    if (!name.trim()) return;
    onAdd({
      id: `activity-${Date.now()}`,
      name: name.trim(),
      emoji: customEmoji || emoji,
      type,
      unit,
      goal: goal ? parseFloat(goal) : undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-100">New Activity</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-[#2a2a38] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Emoji picker */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Emoji</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {EMOJI_PRESETS.map(e => (
              <button
                key={e}
                onClick={() => { setEmoji(e); setCustomEmoji(''); }}
                className={`text-xl p-1.5 rounded-lg transition-colors ${
                  emoji === e && !customEmoji
                    ? 'bg-indigo-500/30 ring-1 ring-indigo-400'
                    : 'hover:bg-[#2a2a38]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type your own emoji..."
            value={customEmoji}
            onChange={e => setCustomEmoji(e.target.value)}
            className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Name</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Morning Run"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Type */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ActivityType)}
              className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Unit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {UNIT_OPTIONS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Daily goal */}
        <div className="mb-5">
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Daily Goal (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 5"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="flex-1 bg-[#0f0f13] border border-[#2a2a38] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <span className="text-sm text-slate-500">{unit}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          Add Activity
        </button>
      </div>
    </div>
  );
}
