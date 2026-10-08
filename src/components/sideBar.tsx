"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";
import { UiIcon } from "@/components/uiIcon";
import type { AuthUser } from "@/services/auth/type";
import { useEffect, useState } from "react";

interface SideBarProps {
  user: AuthUser | null;
  isOpen: boolean;
  onClose: () => void;
  activePage: "overview" | "categories";
}

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "grid" as const,
    key: "overview",
  },
  {
    label: "Categories",
    href: "/categories",
    icon: "layers" as const,
    key: "categories",
    badge: "Active",
  },
  { label: "Brands", href: "/brands", icon: "tag" as const, key: "brands" },
  {
    label: "Stock Movement",
    href: "/dashboard#stock-movement",
    icon: "chart" as const,
  },
  {
    label: "Inventory Health",
    href: "/dashboard#inventory",
    icon: "box" as const,
  },
];

export default function SideBar({
  user,
  isOpen,
  onClose,
  activePage,
}: SideBarProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const userName = mounted ? user?.name?.toUpperCase() || "UNKNOW" : "UNKNOW";
  const initial = mounted ? user?.name?.charAt(0).toUpperCase() || "U" : "U";

  useEffect(() => {
    setMounted(true);
  }, []);
  function signOut() {
    clearSession();
    onClose();
    router.replace("/auth/login");
  }

  function renderNavLink(item: (typeof navItems)[number], isMobile = false) {
    const isActive = item.key === activePage;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => isMobile && onClose()}
        aria-current={isActive ? "page" : undefined}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
          isActive
            ? "bg-emerald-50/90 text-emerald-900 font-semibold shadow-xs"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
              isActive
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800"
            }`}
          >
            <UiIcon name={item.icon} size={16} />
          </span>
          <span className="truncate">{item.label}</span>
        </div>

        {item.badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
              isActive
                ? "bg-emerald-200/80 text-emerald-800"
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation overlay"
          onClick={onClose}
          onKeyDown={(e) =>
            (e.key === "Escape" || e.key === "Enter") && onClose()
          }
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity md:hidden cursor-pointer"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        aria-label="Mobile navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white p-5 shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
              <UiIcon name="box" size={19} />
            </span>
            <span>
              Stock<span className="text-emerald-600">wise</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        <nav className="mt-5 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => renderNavLink(item, true))}
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600">
              <UiIcon name="logout" size={16} />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sticky Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200/80 bg-white/95 px-4 pb-4 pt-5 backdrop-blur-md md:flex">
        {/* Brand Header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 text-[19px] font-bold tracking-tight text-slate-900 no-underline transition hover:opacity-90"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
            <UiIcon name="box" size={18} />
          </span>
          <span className="font-bold">
            Stock<span className="text-emerald-600 font-extrabold">.Com</span>
          </span>
        </Link>

        {/* Workspace Card */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition hover:bg-slate-100/70">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs">
            {initial}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-slate-800">
              {userName}
            </span>
            <span className="text-[10px] text-slate-400">
              Inventory Workspace
            </span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200/70" />
        </div>

        {/* Section Heading */}
        <p className="mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </p>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => renderNavLink(item))}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto space-y-3 pt-4">
          {/* Help Center Pill */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <UiIcon name="help" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">
                  Support & Guides
                </p>
                <p className="text-[10px] text-slate-500">
                  alway online 24H & 7/7
                </p>
              </div>
            </div>
          </div>

          {/* User profile & Sign Out */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs">
                {initial}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold text-slate-800">
                  {mounted ? user?.name || "Admin User" : "Admin User"}
                </span>
                <span className="truncate text-[10px] text-slate-400">
                  { mounted ? user?.email || "Logged in" : "Sign In"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            >
              <UiIcon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
