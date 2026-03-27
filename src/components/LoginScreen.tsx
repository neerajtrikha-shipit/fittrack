import { useState } from 'react';
import { Dumbbell, Lock } from 'lucide-react';

const TOKEN_KEY = 'fittrack-token';

export async function tryLogin(passcode: string): Promise<string | null> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) return null;
  const { token } = await res.json() as { token: string };
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;
    setLoading(true);
    setError('');
    try {
      const token = await tryLogin(passcode);
      if (token) {
        onLogin();
      } else {
        setError('Wrong passcode — try again');
        setPasscode('');
      }
    } catch {
      setError('Cannot reach the server. Make sure the app is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-6">
      {/* Warm glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-violet-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xs animate-[slideUp_320ms_ease-out_both]">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-[0_0_32px_rgba(124,58,237,0.45)] mb-4">
            <Dumbbell size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">FitTrack</h1>
          <p className="text-sm text-slate-500 mt-1">Your personal workout log</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            />
            <input
              autoFocus
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              className="
                w-full bg-[#1d1928] border border-[#2a2038] rounded-2xl
                pl-10 pr-4 py-4 text-slate-100 placeholder-slate-600
                focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30
                transition-all tracking-widest text-center text-lg
              "
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center animate-[slideUp_200ms_ease-out]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !passcode}
            className="
              w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600
              text-white font-semibold rounded-2xl
              shadow-[0_0_24px_rgba(124,58,237,0.35)]
              disabled:opacity-40 active:scale-95 transition-all duration-200
            "
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <p className="text-xs text-slate-700 text-center mt-8">
          Default passcode is set in your <code className="text-slate-600">.env</code> file
        </p>
      </div>
    </div>
  );
}
