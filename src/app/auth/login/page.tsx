'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard, AuthField } from '@/components/auth/auth-card';
import { login } from '@/services/auth';
import { saveSession } from '@/lib/session';
import { useAppStore } from '@/store/useAppStore';
import { UiIcon } from '@/components/uiIcon';
import { useToast } from '@/components/toast/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === '1') {
        setExpiredNotice(true);
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      saveSession(response.accessToken, response.user ?? null);
      useAppStore.getState().setSession(response.accessToken, response.user ?? null);

      toast.success(
        response.user?.name ? `Welcome back, ${response.user.name}!` : 'Signed in successfully!'
      );

      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const nextPath =
        requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
          ? requestedPath
          : '/dashboard';

      router.push(nextPath);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.';
      setError(msg);
      toast.error(msg, 'Sign in error');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickFillDemo() {
    setEmail('testuser99@example.com');
    setPassword('password123');
    setError('');
  }

  return (
    <AuthCard mode="login">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField
          id="email"
          label="Email address"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="Enter your account password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Remember me</span>
          </label>
          <a
            href="mailto:support@stockwise.app?subject=Password%20reset"
            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {expiredNotice && !error && (
          <div
            className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 animate-fade-in"
            role="status"
          >
            <UiIcon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <span className="leading-relaxed">
              Your session has expired or is invalid. Please sign in again.
            </span>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 animate-fade-in"
            role="alert"
          >
            <UiIcon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading && <UiIcon name="refresh" size={15} className="animate-spin" />}
          <span>{loading ? 'Authenticating…' : 'Sign in to Workspace'}</span>
          {!loading && <UiIcon name="arrow" size={15} />}
        </button>

        {/* Quick Demo Fill Shortcut for Evaluators / Testing */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <UiIcon name="sparkles" size={14} className="text-emerald-600" />
            <span>Autofill Demo Credentials</span>
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
