'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { UiIcon, type IconName } from '@/components/uiIcon';
import {
  getProducts,
  getAllActivities,
  deleteActivityLog,
  type Product,
  type ActivityLog,
  type ActivityType,
  type ActivityDiff,
} from '@/services/products';
import AddActivityNoteModal from '@/components/activities/AddActivityNoteModal';
import ActivityDetailModal from '@/components/activities/ActivityDetailModal';
import { useToast } from '@/components/toast/ToastContext';

type ViewMode = 'timeline' | 'table';
type DateFilter = 'all' | 'today' | '7days' | '30days';

function ActivitiesContent() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<(ActivityLog & { product_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, startTransition] = useTransition();
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<(ActivityLog & { product_name?: string }) | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load products & activities
  const loadData = () => {
    getProducts(0, 100)
      .then((prods) => {
        setProducts(prods);
        const list = getAllActivities(prods);
        setActivities(list);
        setLoading(false);
      })
      .catch(() => {
        const list = getAllActivities([]);
        setActivities(list);
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    setCurrentTime(Date.now());

    getProducts(0, 100)
      .then((prods) => {
        if (!active) return;
        setProducts(prods);
        const list = getAllActivities(prods);
        setActivities(list);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        const list = getAllActivities([]);
        setActivities(list);
        setLoading(false);
      });

    // Listen for custom activity update events
    const handleUpdate = () => {
      startTransition(() => {
        loadData();
      });
    };
    window.addEventListener('inventory:activity-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('inventory:activity-updated', handleUpdate);
    };
  }, []);

  // Unique list of user names for filter dropdown
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.user_name && act.user_name.trim()) {
        set.add(act.user_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    const now = currentTime || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    return activities.filter((act) => {
      // Action filter
      if (actionFilter !== 'all' && act.action !== actionFilter) {
        return false;
      }

      // User filter
      if (userFilter !== 'all' && act.user_name !== userFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all' && now > 0) {
        const actTime = new Date(act.created_at).getTime();
        const diffMs = now - actTime;
        if (dateFilter === 'today' && diffMs > oneDayMs) {
          return false;
        }
        if (dateFilter === '7days' && diffMs > 7 * oneDayMs) {
          return false;
        }
        if (dateFilter === '30days' && diffMs > 30 * oneDayMs) {
          return false;
        }
      }

      // Search term
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const pName = (act.product_name || '').toLowerCase();
      const title = act.title.toLowerCase();
      const desc = act.description.toLowerCase();
      const user = (act.user_name || '').toLowerCase();
      const email = (act.user_email || '').toLowerCase();
      const diffStr = act.diff ? JSON.stringify(act.diff).toLowerCase() : '';

      return (
        pName.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        user.includes(q) ||
        email.includes(q) ||
        diffStr.includes(q) ||
        String(act.product_id).includes(q)
      );
    });
  }, [activities, actionFilter, userFilter, dateFilter, search, currentTime]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, userFilter, dateFilter, pageSize]);

  // Action badge helpers
  function getBadgeDetails(action: ActivityType): {
    bg: string;
    icon: IconName;
    label: string;
    pillBg: string;
  } {
    switch (action) {
      case 'create':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          pillBg: 'bg-emerald-100 text-emerald-800',
          icon: 'box',
          label: 'Product Created',
        };
      case 'price_change':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          pillBg: 'bg-indigo-100 text-indigo-800',
          icon: 'trending-up',
          label: 'Price Adjusted',
        };
      case 'stock_threshold':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          pillBg: 'bg-amber-100 text-amber-800',
          icon: 'alert-triangle',
          label: 'Stock Limit',
        };
      case 'status_change':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          pillBg: 'bg-sky-100 text-sky-800',
          icon: 'tag',
          label: 'Status Change',
        };
      case 'note':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          pillBg: 'bg-purple-100 text-purple-800',
          icon: 'file-text',
          label: 'Audit Note',
        };
      case 'delete':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          pillBg: 'bg-rose-100 text-rose-800',
          icon: 'trash',
          label: 'Deleted',
        };
      case 'update':
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          pillBg: 'bg-blue-100 text-blue-800',
          icon: 'edit',
          label: 'Updated',
        };
    }
  }

  function formatTime(isoString: string) {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  function formatRelativeTime(isoString: string) {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  }

  // KPI Metrics
  const totalActivitiesCount = activities.length;
  const todayCount = useMemo(() => {
    const now = currentTime;
    const oneDay = 24 * 60 * 60 * 1000;
    return activities.filter((a) => now - new Date(a.created_at).getTime() < oneDay).length;
  }, [activities, currentTime]);

  const priceAdjustmentsCount = useMemo(() => {
    return activities.filter((a) => a.action === 'price_change' || a.action === 'stock_threshold').length;
  }, [activities]);

  const uniqueContributorsCount = uniqueUsers.length || 1;

  // Handle manual refresh
  const handleRefresh = () => {
    startTransition(() => {
      loadData();
      toast.info('Activity log feed refreshed.', 'Live Update');
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredActivities.length === 0) {
      toast.error('No activity data to export.', 'Export Failed');
      return;
    }

    const headers = ['ID', 'Product ID', 'Product Name', 'Action', 'Title', 'Description', 'User Name', 'User Email', 'Timestamp'];
    const rows = filteredActivities.map((act) => [
      act.id,
      act.product_id,
      `"${(act.product_name || '').replace(/"/g, '""')}"`,
      act.action,
      `"${act.title.replace(/"/g, '""')}"`,
      `"${act.description.replace(/"/g, '""')}"`,
      `"${(act.user_name || '').replace(/"/g, '""')}"`,
      `"${(act.user_email || '').replace(/"/g, '""')}"`,
      act.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredActivities.length} activity records to CSV!`);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredActivities.length === 0) {
      toast.error('No activity data to export.', 'Export Failed');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredActivities, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredActivities.length} activity records to JSON!`);
  };

  // Delete activity handler
  const handleDeleteActivity = (act: ActivityLog & { product_name?: string }) => {
    if (confirm(`Are you sure you want to delete this activity entry "${act.title}"?`)) {
      const ok = deleteActivityLog(act.product_id, act.id);
      if (ok) {
        setActivities((prev) => prev.filter((item) => String(item.id) !== String(act.id)));
        if (selectedActivity?.id === act.id) {
          setIsDetailOpen(false);
          setSelectedActivity(null);
        }
        toast.success('Activity log removed.');
      } else {
        toast.error('Failed to remove activity log.');
      }
    }
  };

  const handleOpenDetail = (act: ActivityLog & { product_name?: string }) => {
    setSelectedActivity(act);
    setIsDetailOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
              <UiIcon name="history" size={20} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                User Activity & Audit Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Monitor user operations, product lifecycle changes, inventory updates, and manual audit notes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Feed"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition"
          >
            <UiIcon name="refresh" size={15} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export dropdown */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export as CSV"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>CSV</span>
            </button>
            <span className="h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={handleExportJSON}
              title="Export as JSON"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddNoteOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
          >
            <UiIcon name="plus" size={16} />
            <span>Add Audit Note</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Events */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Activities</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UiIcon name="history" size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{totalActivitiesCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">All Time</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Total logged system operations</p>
        </div>

        {/* Today's Events */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Actions</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <UiIcon name="clock" size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{todayCount}</span>
            <span className="text-[11px] font-semibold text-blue-600">Recent 24h</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Operations in past 24 hours</p>
        </div>

        {/* Price & Stock Adjustments */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Adjustments</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <UiIcon name="trending-up" size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{priceAdjustmentsCount}</span>
            <span className="text-[11px] font-semibold text-indigo-600">Price / Stock</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Inventory modifications</p>
        </div>

        {/* Contributing Users */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Contributing Users</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <UiIcon name="user" size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{uniqueContributorsCount}</span>
            <span className="text-[11px] font-semibold text-purple-600">Active Staff</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Unique recorded authors</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
              <UiIcon name="search" size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by product, user, description, or changes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 grid w-9 place-items-center text-slate-400 hover:text-slate-600"
              >
                <UiIcon name="x" size={14} />
              </button>
            )}
          </div>

          {/* User Select & Date Select & View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* User Dropdown */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* Date Preset Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="all">All Dates</option>
              <option value="today">Today (24h)</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'timeline'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UiIcon name="layout-list" size={14} />
                <span className="hidden sm:inline">Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UiIcon name="grid" size={14} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 no-scrollbar">
          {[
            { key: 'all', label: 'All Activities', count: activities.length },
            {
              key: 'create',
              label: 'Created',
              count: activities.filter((a) => a.action === 'create').length,
            },
            {
              key: 'update',
              label: 'Updated',
              count: activities.filter((a) => a.action === 'update').length,
            },
            {
              key: 'price_change',
              label: 'Price Changes',
              count: activities.filter((a) => a.action === 'price_change').length,
            },
            {
              key: 'stock_threshold',
              label: 'Stock Limits',
              count: activities.filter((a) => a.action === 'stock_threshold').length,
            },
            {
              key: 'status_change',
              label: 'Status Changes',
              count: activities.filter((a) => a.action === 'status_change').length,
            },
            {
              key: 'note',
              label: 'Audit Notes',
              count: activities.filter((a) => a.action === 'note').length,
            },
          ].map((cat) => {
            const active = actionFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActionFilter(cat.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    active ? 'bg-emerald-800 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feed Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/80">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-slate-600">Loading user activity feed...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <UiIcon name="history" size={28} />
          </span>
          <h3 className="text-base font-bold text-slate-900">No activity logs found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            No activity logs match your current search and filter criteria. Try adjusting your query or filters.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActionFilter('all');
                setUserFilter('all');
                setDateFilter('all');
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setIsAddNoteOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
            >
              Record First Note
            </button>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline Feed Mode */
        <div className="space-y-3">
          {paginatedActivities.map((act) => {
            const badge = getBadgeDetails(act.action);
            const userInitial = (act.user_name || 'U').charAt(0).toUpperCase();

            return (
              <div
                key={act.id}
                className="group relative flex flex-col sm:flex-row gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:border-emerald-200 hover:shadow-md"
              >
                {/* Left Action Icon & User Avatar */}
                <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0">
                  <div className="relative">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs shadow-xs">
                      {userInitial}
                    </span>
                    <span
                      className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white ${badge.bg}`}
                    >
                      <UiIcon name={badge.icon} size={11} />
                    </span>
                  </div>
                  <span className="sm:hidden text-xs font-bold text-slate-900">
                    {act.user_name || 'Administrator'}
                  </span>
                </div>

                {/* Middle Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">{act.title}</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>

                  {/* Diffs Preview */}
                  {act.diff && act.diff.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {act.diff.map((d: ActivityDiff, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                        >
                          <span className="font-semibold text-slate-500">{d.label || d.field}:</span>
                          {d.old_value !== undefined && (
                            <span className="line-through text-rose-600 font-mono text-[10px]">
                              {String(d.old_value)}
                            </span>
                          )}
                          {d.old_value !== undefined && d.new_value !== undefined && <span>→</span>}
                          {d.new_value !== undefined && (
                            <span className="font-semibold text-emerald-700 font-mono text-[10px]">
                              {String(d.new_value)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata line: Product link + Author + Timestamp */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400">
                    {act.product_name && (
                      <Link
                        href={`/products?search=${encodeURIComponent(act.product_name)}`}
                        className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                      >
                        <UiIcon name="box" size={12} />
                        <span>{act.product_name}</span>
                      </Link>
                    )}
                    <span className="flex items-center gap-1 text-slate-500">
                      <UiIcon name="user" size={12} />
                      <span>{act.user_name || 'Staff'}</span>
                      {act.user_email && <span className="text-slate-400 hidden sm:inline">({act.user_email})</span>}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400" title={formatTime(act.created_at)}>
                      <UiIcon name="clock" size={12} />
                      <span>{formatRelativeTime(act.created_at)}</span>
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(act)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <UiIcon name="eye" size={13} />
                    <span>Inspect</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(act)}
                    title="Delete record"
                    aria-label="Delete record"
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <UiIcon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table Mode */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Action & Event</th>
                  <th scope="col" className="px-4 py-3">Target Product</th>
                  <th scope="col" className="px-4 py-3">User Attribution</th>
                  <th scope="col" className="px-4 py-3">Summary / Details</th>
                  <th scope="col" className="px-4 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedActivities.map((act) => {
                  const badge = getBadgeDetails(act.action);
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-7 w-7 place-items-center rounded-lg border ${badge.bg}`}>
                            <UiIcon name={badge.icon} size={14} />
                          </span>
                          <div>
                            <span className={`rounded-full border px-1.5 py-0.2 text-[9px] font-bold ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <p className="font-bold text-slate-900 text-xs mt-0.5">{act.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block truncate max-w-[150px]">
                          {act.product_name || `Product #${act.product_id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {act.product_id}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            {(act.user_name || 'U').charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">{act.user_name || 'Staff'}</span>
                            <span className="text-[10px] text-slate-400">{act.user_email || 'admin@ione.com'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 text-xs text-slate-600 max-w-xs">{act.description}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        <div className="text-xs font-medium text-slate-700">{formatRelativeTime(act.created_at)}</div>
                        <div className="text-[10px] text-slate-400">{formatTime(act.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(act)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition"
                            title="Inspect Details"
                          >
                            <UiIcon name="eye" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-rose-500 hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <UiIcon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredActivities.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * pageSize, filteredActivities.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredActivities.length}</span> activities
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Activity Note Modal */}
      <AddActivityNoteModal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        products={products}
        onActivityAdded={loadData}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedActivity(null);
        }}
        activity={selectedActivity}
        onDelete={handleDeleteActivity}
      />
    </div>
  );
}

export default function ActivitiesPage() {
  return <ActivitiesContent />;
}
