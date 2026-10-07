'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard, AuthField } from '@/components/auth/auth-card';
import { register } from '@/services/auth';
import { saveSession } from '@/lib/session';
import { useAppStore } from '@/store/useAppStore';
import { UiIcon } from '@/components/uiIcon';
import { useToast } from '@/components/toast/ToastContext';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      saveSession(response.accessToken, response.user ?? null);
      useAppStore.getState().setSession(response.accessToken, response.user ?? null);

      toast.success(`Welcome to Stockwise, ${name.trim()}! Workspace ready.`);
      router.push('/dashboard');
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Unable to create your account.';
      setError(msg);
      toast.error(msg, 'Registration error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard mode="register">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField
          id="name"
          label="Full name"
          placeholder="e.g. Srun Borath"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <AuthField
          id="email"
          label="Work email"
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

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
          <span>{loading ? 'Creating account…' : 'Create Free Account'}</span>
          {!loading && <UiIcon name="arrow" size={15} />}
        </button>

        <p className="text-[11px] leading-relaxed text-slate-400 text-center">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthCard>
  );
}
