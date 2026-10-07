'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UiIcon } from '@/components/uiIcon';

interface AuthCardProps {
  mode: 'login' | 'register';
  children: React.ReactNode;
}

export function AuthCard({ mode, children }: AuthCardProps) {
  const isLogin = mode === 'login';

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Visual Showcase Panel (Left on desktop) */}
      <section
        aria-label="Stockwise Inventory overview"
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-12 text-white lg:flex"
      >
        {/* Ambient lighting glows */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

        {/* Brand */}
        <div className="relative z-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white no-underline"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
              <UiIcon name="box" size={20} />
            </span>
            <span>
              Stock<span className="text-emerald-400">.Com</span>
            </span>
          </Link>
        </div>

        {/* Hero Copy & Live Mock Widget */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            ENTERPRISE INVENTORY CONTROL
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white leading-tight">
            Know what you have. <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Scale what comes next.
            </span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            A synchronized workspace for product categorization, warehouse tracking, and
            real-time stock flow.
          </p>

          {/* Interactive Floating Preview Card */}
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-white">Live Catalog Sync</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                FastAPI 0.1.0
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">2,486</span>
              <span className="text-xs text-slate-400">items in active catalog</span>
            </div>

            {/* Stylized bar chart preview */}
            <div className="mt-4 flex h-14 items-end gap-2 border-b border-white/10 pb-2">
              {[40, 65, 50, 85, 70, 95, 60, 80, 55, 90, 75, 100].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600 to-teal-400 opacity-90 transition-all hover:opacity-100"
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Real-time stock flow
              </span>
              <span>Updated live</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400">
          <span>© 2026 Stockwise Inc.</span>
          <span>Security & Audit Verified</span>
        </div>
      </section>

      {/* Auth Form Panel (Right on desktop, full width on mobile) */}
      <section className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Mobile Header Brand */}
        <div className="flex items-center justify-between lg:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <UiIcon name="box" size={17} />
            </span>
            <span>
              Stock<span className="text-emerald-600">.Com</span>
            </span>
          </Link>
        </div>

        {/* Main Content Box */}
        <div className="mx-auto my-auto w-full max-w-sm py-8">
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {isLogin ? 'WELCOME BACK' : 'GET STARTED'}
            </span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {isLogin ? 'Sign in to Stock.Com.  ' : 'Create your account'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isLogin
                ? 'Enter your credentials to access your inventory workspace.'
                : 'Set up your workspace and organize your product catalog.'}
            </p>
          </div>

          {children}

          <div className="mt-6 text-center text-xs text-slate-500">
            {isLogin ? 'New to Stockwise?' : 'Already have an account?'}{' '}
            <Link
              href={isLogin ? '/auth/register' : '/auth/login'}
              className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              {isLogin ? 'Create an account' : 'Sign in here'}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-auto w-full max-w-sm text-center text-[10px] text-slate-400">
          Simple, reliable inventory tools for growing teams.
        </div>
      </section>
    </div>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AuthField({
  id,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  required = true,
  value,
  onChange,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={effectiveType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600"
          >
            <UiIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
