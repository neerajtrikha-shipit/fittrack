import { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { Activity, WorkoutEntry } from '../types';

type Effort = 'easy' | 'moderate' | 'hard';

const EFFORT_OPTIONS: { value: Effort; label: string; active: string; inactive: string }[] = [
  {
    value: 'easy',
    label: '😌 Easy',
    active:   'bg-emerald-500/25 border-emerald-400/60 text-emerald-300',
    inactive: 'bg-white/4 border-white/10 text-slate-500 hover:border-emerald-400/30 hover:text-emerald-400',
  },
  {
    value: 'moderate',
    label: '💪 Moderate',
    active:   'bg-amber-500/20 border-amber-400/60 text-amber-300',
    inactive: 'bg-white/4 border-white/10 text-slate-500 hover:border-amber-400/30 hover:text-amber-400',
  },
  {
    value: 'hard',
    label: '🔥 Hard',
    active:   'bg-red-500/20 border-red-400/60 text-red-300',
    inactive: 'bg-white/4 border-white/10 text-slate-500 hover:border-red-400/30 hover:text-red-400',
  },
];

interface Props {
  activity: Activity;
  date: string;
  onLog: (entry: Omit<WorkoutEntry, 'id'>) => void;
  onClose: () => void;
}

/** Resize + compress an image file to a base64 JPEG, max 800px on longest side */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas ctx')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function LogEntryModal({ activity, date, onLog, onClose }: Props) {
  const [val, setVal] = useState('');
  const [dur, setDur] = useState('');
  const [note, setNote] = useState('');
  const [effort, setEffort] = useState<Effort | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [tapped, setTapped] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isTimeOnly = activity.unit === 'min';

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch {
      // ignore compression errors
    } finally {
      setImgLoading(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  }

  function openCamera() {
    if (!fileRef.current) return;
    fileRef.current.setAttribute('capture', 'environment');
    fileRef.current.click();
  }

  function openGallery() {
    if (!fileRef.current) return;
    fileRef.current.removeAttribute('capture');
    fileRef.current.click();
  }

  function submit() {
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) return;
    const d = parseFloat(dur);
    onLog({
      activityId: activity.id,
      date,
      value: n,
      duration: !isNaN(d) && d > 0 ? d : undefined,
      note: note.trim() || undefined,
      effort: effort ?? undefined,
      image: image ?? undefined,
      loggedAt: new Date().toISOString(),
    });
    setTapped(true);
    setTimeout(() => { setTapped(false); onClose(); }, 300);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-[slideUpSheet_300ms_cubic-bezier(0.32,0.72,0,1)_both]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-[#1a1a26] border-t border-[#2a2a3c] rounded-t-3xl px-5 pt-3 pb-6 max-w-lg mx-auto shadow-[0_-8px_40px_rgba(0,0,0,0.6)] max-h-[92vh] overflow-y-auto">

          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-2xl shrink-0">
                {activity.emoji}
              </div>
              <div>
                <div className="font-semibold text-slate-100 leading-tight">{activity.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Log a session</div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-slate-200 active:scale-90 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">

            {/* Value + Duration */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {isTimeOnly ? 'Time' : 'Distance'}
                </label>
                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                    className="w-full bg-[#0f0f1a] border border-[#2a2a3c] rounded-xl px-3 py-3 pr-12 text-base text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 pointer-events-none">
                    {activity.unit}
                  </span>
                </div>
              </div>

              {!isTimeOnly && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Time
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={dur}
                      onChange={e => setDur(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                      className="w-full bg-[#0f0f1a] border border-[#2a2a3c] rounded-xl px-3 py-3 pr-12 text-base text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 pointer-events-none">
                      min
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes + Effort */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Notes <span className="text-slate-700 font-normal">(optional)</span>
              </label>

              {/* Effort quick-tags */}
              <div className="flex gap-2 mb-2">
                {EFFORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEffort(prev => prev === opt.value ? null : opt.value)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                      effort === opt.value ? opt.active : opt.inactive
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Any other notes..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full bg-[#0f0f1a] border border-[#2a2a3c] rounded-xl px-3 py-3 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
            </div>

            {/* Photo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Photo <span className="text-slate-700 font-normal">(optional)</span>
              </label>

              {image ? (
                /* Image preview */
                <div className="relative rounded-xl overflow-hidden border border-[#2a2a3c]">
                  <img
                    src={image}
                    alt="Activity photo"
                    className="w-full h-44 object-cover"
                  />
                  <button
                    onClick={() => setImage(null)}
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 active:scale-90 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : imgLoading ? (
                <div className="flex items-center justify-center h-16 rounded-xl border border-[#2a2a3c] bg-[#0f0f1a]">
                  <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
                </div>
              ) : (
                /* Camera + Gallery buttons */
                <div className="flex gap-2">
                  <button
                    onClick={openCamera}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#0f0f1a] border border-[#2a2a3c] hover:border-indigo-500/40 rounded-xl py-3 text-sm text-slate-400 hover:text-indigo-400 transition-all active:scale-95"
                  >
                    <Camera size={15} />
                    Camera
                  </button>
                  <button
                    onClick={openGallery}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#0f0f1a] border border-[#2a2a3c] hover:border-indigo-500/40 rounded-xl py-3 text-sm text-slate-400 hover:text-indigo-400 transition-all active:scale-95"
                  >
                    <ImageIcon size={15} />
                    Gallery
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Submit */}
            <button
              onClick={submit}
              className={`
                w-full py-4 mt-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl
                transition-all active:scale-[0.97]
                shadow-[0_4px_20px_rgba(99,102,241,0.4)]
                ${tapped ? 'animate-[tapFeedback_280ms_ease-out]' : ''}
              `}
            >
              Log it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
