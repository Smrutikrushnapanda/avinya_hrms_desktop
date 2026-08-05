import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  UserRound,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Login() {
  const { login, loading, error } = useAuthStore();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!userName || !password) return;
    await login(userName, password);
  };

  const inputClass =
    'h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70';

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f2d5c] via-[#184a8c] to-[#00b4db] px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 right-[-7rem] h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-[-7rem] h-80 w-80 rounded-full bg-blue-900/60 blur-3xl"
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-950/30 dark:bg-slate-900">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-7 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/App-logo.png"
              alt="Avinya HRMS logo"
              className="h-11 w-11 flex-shrink-0 rounded-xl object-contain shadow-lg shadow-blue-900/30"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Avinya HRMS Monitor
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reinventing the Way You Work
              </p>
            </div>
          </div>

          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#184a8c] dark:text-cyan-300"
              style={{
                background: 'linear-gradient(135deg, rgba(24,74,140,0.08), rgba(0,180,219,0.08))',
                border: '1px solid rgba(24,74,140,0.15)',
              }}
            >
              <Lock size={11} />
              Secure Sign In
            </span>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back,{' '}
              <span className="font-normal italic text-[#1e6fbf] dark:text-cyan-300">sign in.</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use your HRMS credentials to start activity monitoring.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-7 pt-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="userName" className="text-[13px] font-semibold">
              User ID
            </Label>
            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="Enter your User ID"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-[13px] font-semibold">
              Password
            </Label>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={inputClass}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-1 h-11 w-full rounded-xl text-[15px] font-semibold"
          >
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Shield size={12} />
            Protected with enterprise-grade security
          </div>
        </form>
      </div>
    </div>
  );
}
