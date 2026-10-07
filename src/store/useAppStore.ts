'use client';

import { useSyncExternalStore } from 'react';
import type { AuthUser } from '@/services/auth/type';

export interface NavTab {
  href: string;
  label: string;
}

interface AppState {
  sidebarCollapsed: boolean;
  accessToken: string | null;
  currentUser: AuthUser | null;
  tabs: NavTab[];
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAccessToken: (token: string | null) => void;
  setCurrentUser: (user: AuthUser | null) => void;
  setSession: (token: string, user: AuthUser | null) => void;
  clearSession: () => void;
  openTab: (tab: NavTab) => void;
  closeTab: (href: string) => void;
}

type StateListener = () => void;

let state: AppState;
const listeners = new Set<StateListener>();

function updateState(update: Partial<AppState> | ((current: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof update === 'function' ? update(state) : update) };
  listeners.forEach((listener) => listener());
}

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('inventory_user_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

state = {
  sidebarCollapsed: false,
  accessToken: null,
  currentUser: getInitialUser(),
  tabs: [],
  setSidebarCollapsed: (sidebarCollapsed) => updateState({ sidebarCollapsed }),
  setAccessToken: (accessToken) => updateState({ accessToken }),
  setCurrentUser: (currentUser) => updateState({ currentUser }),
  setSession: (accessToken, currentUser) => updateState({ accessToken, currentUser }),
  clearSession: () => updateState({ accessToken: null, currentUser: null }),
  openTab: (tab) => updateState((current) => ({
    tabs: current.tabs.some((item) => item.href === tab.href) ? current.tabs : [...current.tabs, tab],
  })),
  closeTab: (href) => updateState((current) => ({ tabs: current.tabs.filter((tab) => tab.href !== href) })),
};

function subscribe(listener: StateListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type AppStoreHook = {
  <Selection>(selector: (current: AppState) => Selection): Selection;
  getState: () => AppState;
};

export const useAppStore: AppStoreHook = Object.assign(
  <Selection,>(selector: (current: AppState) => Selection) =>
    useSyncExternalStore(subscribe, () => selector(state), () => selector(state)),
  { getState: () => state },
);
