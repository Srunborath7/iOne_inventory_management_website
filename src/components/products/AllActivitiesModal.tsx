'use client';

import { useState, useEffect } from 'react';
import { UiIcon, type IconName } from '@/components/uiIcon';
import {
  getAllActivities,
  type ActivityLog,
  type ActivityType,
  type Product,
} from '@/services/products';

interface AllActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function AllActivitiesModal({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}: AllActivitiesModalProps) {
  const [activities, setActivities] = useState<(ActivityLog & { product_name?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      const list = getAllActivities(products);
      setActivities(list);
    }
  }, [isOpen, products]);

  if (!isOpen) return null;

  const filtered = activities.filter((act) => {
    if (actionFilter !== 'all' && act.action !== actionFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const pName = (act.product_name || '').toLowerCase();
    const title = act.title.toLowerCase();
    const desc = act.description.toLowerCase();
    const user = (act.user_name || '').toLowerCase();
    return pName.includes(q) || title.includes(q) || desc.includes(q) || user.includes(q);
  });

  function getBadgeDetails(action: ActivityType): {
    bg: string;
    icon: IconName;
    label: string;
  } {
    switch (action) {
      case 'create':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'box', label: 'Created' };
      case 'price_change':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'trending-up', label: 'Price Change' };
      case 'stock_threshold':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'alert-triangle', label: 'Stock Limit' };
      case 'status_change':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'tag', label: 'Status' };
      case 'note':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'file-text', label: 'Audit Note' };
      case 'update':
      default:
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'edit', label: 'Updated' };
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

  // Count summary
  const totalCount = activities.length;
  const priceCount = activities.filter((a) => a.action === 'price_change').length;
  const stockCount = activities.filter((a) => a.action === 'stock_threshold').length;
  const createCount = activities.filter((a) => a.action === 'create').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <UiIcon name="history" size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">All Product Activity Logs & Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Complete record of product registrations, price adjustments, stock limit changes, and audit notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Stats Pill Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2.5 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logs</span>
            <span className="text-base font-extrabold text-slate-900">{totalCount}</span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Creations</span>
            <span className="text-base font-extrabold text-emerald-800">{createCount}</span>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700">Price Changes</span>
            <span className="text-base font-extrabold text-indigo-800">{priceCount}</span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-2.5 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Stock Alerts</span>
            <span className="text-base font-extrabold text-amber-800">{stockCount}</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <UiIcon name="search" size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, author, or description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <UiIcon name="x" size={13} />
              </button>
            )}
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActionFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                actionFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('create')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                actionFilter === 'create'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Creations
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('price_change')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                actionFilter === 'price_change'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Prices
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('stock_threshold')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                actionFilter === 'stock_threshold'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setActionFilter('note')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                actionFilter === 'note'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        {/* Scrollable Timeline List */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <UiIcon name="history" size={24} />
              </span>
              <p className="mt-3 text-xs font-bold text-slate-800">No activity logs found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your search query or action filter.</p>
            </div>
          ) : (
            filtered.map((act) => {
              const badge = getBadgeDetails(act.action);
              const matchedProduct = products.find((p) => String(p.id) === String(act.product_id));
              const initials = (act.user_name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={act.id}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-indigo-300 hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                        <UiIcon name={badge.icon} size={11} />
                        {badge.label}
                      </span>
                      {act.product_name && (
                        <button
                          type="button"
                          onClick={() => {
                            if (matchedProduct) {
                              onClose();
                              onSelectProduct(matchedProduct);
                            }
                          }}
                          className="font-bold text-xs text-slate-900 transition hover:text-indigo-600 hover:underline text-left line-clamp-1"
                        >
                          {act.product_name}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatTime(act.created_at)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{act.description}</p>

                  {/* Diff pills */}
                  {act.diff && act.diff.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {act.diff.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-100"
                        >
                          <strong>{item.label || item.field}:</strong>
                          {item.old_value !== undefined && (
                            <>
                              <span className="text-rose-500 line-through">{String(item.old_value)}</span>
                              <span className="text-slate-300">→</span>
                            </>
                          )}
                          <span className="font-bold text-emerald-700">{String(item.new_value)}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-700">
                        {initials}
                      </span>
                      <span className="font-medium text-slate-700">{act.user_name || 'System'}</span>
                      {act.user_email && <span className="text-slate-400 text-[10px]">({act.user_email})</span>}
                    </div>

                    {matchedProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProduct(matchedProduct);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-800"
                      >
                        <span>View Product</span>
                        <UiIcon name="arrow" size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
