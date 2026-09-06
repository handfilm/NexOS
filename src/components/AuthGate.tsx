import React, { useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

interface AuthGateProps {
  onSuccess: (user: { email: string; role: string; authMethod: 'pin' | 'google' }) => void;
  onCancel?: () => void;
  allowedEmails?: string[];
}

const DEFAULT_WHITELIST = [
  'rakib.himon@gmail.com',
  'admin@handsandhead.com',
  'operator@handsandhead.com',
  'lead@handsandhead.com',
  'seller@handsandhead.com'
];

export const AuthGate: React.FC<AuthGateProps> = ({
  onSuccess,
  onCancel,
  allowedEmails = DEFAULT_WHITELIST
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 4-Digit PIN Server-Side Verification
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess({
          email: data.email || 'operator@handsandhead.com',
          role: data.role || 'operator',
          authMethod: 'pin'
        });
      } else {
        setError(data.error || 'Access Denied — Invalid 4-Digit Operator PIN');
        setPin('');
      }
    } catch (err: any) {
      setError('Operator verification service unreachable. Please retry.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with Authorized Whitelist Check
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = (user.email || '').toLowerCase().trim();

      const isWhitelisted = allowedEmails.map(e => e.toLowerCase().trim()).includes(email);

      if (!isWhitelisted) {
        await signOut(auth);
        setError(`Access Denied: ${email} is not on the authorized whitelist. Use PIN bypass.`);
        setLoading(false);
        return;
      }

      onSuccess({
        email: user.email || 'admin@handsandhead.com',
        role: 'admin',
        authMethod: 'google'
      });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Authentication failed. Try PIN bypass.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#0d0d0c] p-6 shadow-2xl text-zinc-200">
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">HANDS &amp; HEAD OS // GATE</span>
          </div>
          <span className="text-[10px] text-zinc-600">v4.8</span>
        </div>

        {/* Title & Sub */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold tracking-tight text-white font-sans">Operator Access Control</h2>
          <p className="text-[11px] text-zinc-400 mt-1">Authenticate via Whitelisted Google ID or 4-Digit PIN</p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 rounded border border-red-900/60 bg-red-950/40 p-2.5 text-center text-[11px] text-red-400 leading-tight">
            ⚠️ {error}
          </div>
        )}

        {/* 4-Digit PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 text-center">
              Enter 4-Digit Operator PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-center text-xl font-bold tracking-[0.6em] text-amber-400 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded border border-zinc-800 bg-zinc-900/60 py-2.5 text-[clamp(10px,1.2vw,13px)] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all truncate"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded bg-amber-500 py-2.5 text-[clamp(10px,1.2vw,13px)] font-bold text-black hover:bg-amber-400 active:scale-[0.99] transition-all truncate shadow-md"
            >
              Verify PIN →
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <span className="relative bg-[#0d0d0c] px-3 text-[10px] text-zinc-500">OR WHITELIST</span>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2.5 rounded border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-[clamp(10px,1.2vw,13px)] font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all truncate disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span className="truncate">{loading ? 'Verifying Whitelist…' : 'Sign in with Google (Whitelist)'}</span>
        </button>
      </div>
    </div>
  );
};
