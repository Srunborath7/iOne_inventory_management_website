'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/components/navBar';
import SideBar from '@/components/sideBar';
import { useAppStore } from '@/store/useAppStore';
import { getMe } from '@/services/auth';
import { getSavedUser } from '@/lib/session';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const currentUser = useAppStore((state) => state.currentUser);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto fetch user profile if token is present but user data is missing
  useEffect(() => {
    if (!currentUser?.name) {
      const saved = getSavedUser();
      if (saved) {
        setCurrentUser(saved);
      }
      getMe()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
          }
        })
        .catch(() => {
          // Token may be unauthenticated or demo mode
        });
    }
  }, [currentUser, setCurrentUser]);

  const activePage = pathname.startsWith('/products')
    ? 'products'
    : pathname.startsWith('/categories')
    ? 'categories'
    : pathname.startsWith('/brands')
    ? 'brands'
    : pathname.startsWith('/activities')
    ? 'activities'
    : 'overview';

  const pageTitle =
    activePage === 'products'
      ? 'Products Inventory'
      : activePage === 'categories'
      ? 'Categories Catalog'
      : activePage === 'brands'
      ? 'Brands Management'
      : activePage === 'activities'
      ? 'Activity & Audit Logs'
      : 'Inventory Overview';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      <SideBar
        user={currentUser}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activePage={activePage}
      />
      <div className="min-h-screen md:pl-[252px] transition-all">
        <NavBar
          userName={currentUser?.name}
          userEmail={currentUser?.email}
          pageTitle={pageTitle}
          onMenuOpen={() => setMobileOpen((open) => !open)}
        />
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
