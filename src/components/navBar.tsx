'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UiIcon } from '@/components/uiIcon';
import { clearSession } from '@/lib/session';

interface NavBarProps {
  userName?: string;
  userEmail?: string;
  onMenuOpen: () => void;
  pageTitle?: string;
}

export default function NavBar({
  userName = 'Admin User',
  userEmail,
  onMenuOpen,
  pageTitle = 'Overview',
}: NavBarProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnread, setHasUnread] = useState(true);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const initial = (userName || 'U').slice(0, 1).toUpperCase();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSignOut() {
    clearSession();
    router.replace('/auth/login');
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open mobile menu"
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 md:hidden"
        >
          <UiIcon name="menu" size={18} />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 font-medium text-slate-500 transition hover:text-emerald-700 sm:flex"
          >
            <span>Workspace</span>
          </Link>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <span
            suppressHydrationWarning
            className="flex items-center gap-1.5 font-semibold text-slate-900"
          >
            {pageTitle}
          </span>
        </nav>
      </div>

      {/* Right: Search, Notifications, User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <label className="flex h-9 w-64 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 text-slate-400 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10">
            <UiIcon name="search" size={15} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog or press ⌘K"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm ring-1 ring-slate-200/60 lg:inline-block">
              ⌘K
            </kbd>
          </label>
        </form>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <UiIcon name="bell" size={17} />
            {hasUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-xl animate-fade-in z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Notifications</h4>
                  <p className="text-[10px] text-slate-500">Latest catalog events</p>
                </div>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={() => setHasUnread(false)}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 py-1">
                <div className="flex items-start gap-2.5 p-2 rounded-xl transition hover:bg-slate-50">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                    <UiIcon name="check" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800">Catalog in sync</p>
                    <p className="text-[11px] text-slate-500">Categories API loaded successfully.</p>
                    <span className="text-[10px] text-slate-400">Just now</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-xl transition hover:bg-slate-50">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    <UiIcon name="sparkles" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800">FastAPI backend active</p>
                    <p className="text-[11px] text-slate-500">Full CRUD capabilities ready.</p>
                    <span className="text-[10px] text-slate-400">5 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-label="User menu"
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1 pr-2.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-sm">
              {initial}
            </span>
            <span className="hidden text-xs font-medium text-slate-700 sm:inline">
              {userName.split(' ')[0]}
            </span>
            <UiIcon name="arrow" size={12} className="hidden rotate-90 text-slate-400 sm:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-in z-50">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-slate-900">{userName}</p>
                <p className="truncate text-[11px] text-slate-500">{userEmail || 'Active session'}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Authenticated
                </div>
              </div>

              <div className="py-1 text-xs">
                <Link
                  href="/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <UiIcon name="grid" size={15} className="text-slate-400" />
                  <span>Overview</span>
                </Link>
                <Link
                  href="/categories"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <UiIcon name="layers" size={15} className="text-slate-400" />
                  <span>Categories</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <UiIcon name="logout" size={15} className="text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
