'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import {
  getProductActivities,
  addProductActivityNote,
  type ActivityLog,
  type ActivityType,
  type Product,
} from '@/services/products';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/toast/ToastContext';

interface ProductActivityTimelineProps {
  product: Product;
}

export default function ProductActivityTimeline({ product }: ProductActivityTimelineProps) {
  const toast = useToast();
  const currentUser = useAppStore((s) => s.currentUser);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  function loadActivities() {
    const list = getProductActivities(product.id, product);
    setActivities(list);
  }

  useEffect(() => {
    loadActivities();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string | number }>;
      if (String(customEvent.detail?.productId) === String(product.id)) {
        loadActivities();
      }
    };

    window.addEventListener('inventory:activity-updated', handleUpdate);
    return () => {
      window.removeEventListener('inventory:activity-updated', handleUpdate);
    };
  }, [product]);

  function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteInput.trim()) return;

    setIsSubmittingNote(true);
    try {
      const user = currentUser
        ? { name: currentUser.name, email: currentUser.email }
        : { name: 'Admin', email: 'admin@ione.com' };

      addProductActivityNote(product.id, noteInput.trim(), user);
      setNoteInput('');
      setShowAddNote(false);
      loadActivities();
      toast.success('Audit note logged to product history.');
    } catch {
      toast.error('Failed to log note.');
    } finally {
      setIsSubmittingNote(false);
    }
  }

  const filteredActivities = activities.filter((act) => {
    if (filter === 'all') return true;
    if (filter === 'price') return act.action === 'price_change';
    if (filter === 'stock') return act.action === 'stock_threshold';
    if (filter === 'note') return act.action === 'note';
    return act.action === filter;
  });

  function getActionBadge(action: ActivityType) {
    switch (action) {
      case 'create':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: 'box' as const,
          label: 'Created',
          bulletColor: 'bg-emerald-500',
        };
      case 'price_change':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: 'trending-up' as const,
          label: 'Price Change',
          bulletColor: 'bg-indigo-500',
        };
      case 'stock_threshold':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: 'alert-triangle' as const,
          label: 'Stock Limits',
          bulletColor: 'bg-amber-500',
        };
      case 'status_change':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: 'tag' as const,
          label: 'Status Toggle',
          bulletColor: 'bg-sky-500',
        };
      case 'note':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: 'file-text' as const,
          label: 'Audit Note',
          bulletColor: 'bg-purple-500',
        };
      case 'update':
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: 'edit' as const,
          label: 'Updated',
          bulletColor: 'bg-blue-500',
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

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Logs ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('price')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filter === 'price'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Price Changes
          </button>
          <button
            type="button"
            onClick={() => setFilter('stock')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filter === 'stock'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Stock Alerts
          </button>
          <button
            type="button"
            onClick={() => setFilter('note')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filter === 'note'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Notes
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAddNote(!showAddNote)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
        >
          <UiIcon name="plus" size={13} />
          <span>Add Audit Note</span>
        </button>
      </div>

      {/* Inline Form to add Note */}
      {showAddNote && (
        <form onSubmit={handleAddNote} className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 text-xs">
          <label className="block font-semibold text-purple-900">Add Internal Audit / Activity Note</label>
          <p className="text-[11px] text-purple-700 mt-0.5">
            Log inventory inspections, supplier revisions, or batch tracking notes for this product.
          </p>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="e.g. Verified price match with supplier catalog; adjusted safety stock threshold."
            rows={2}
            className="mt-2 w-full rounded-xl border border-purple-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
            autoFocus
          />
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddNote(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-purple-100/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingNote || !noteInput.trim()}
              className="rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-800 disabled:opacity-50"
            >
              {isSubmittingNote ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline List */}
      {filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
            <UiIcon name="history" size={20} />
          </span>
          <p className="mt-2 text-xs font-semibold text-slate-700">No activity logs found</p>
          <p className="text-[11px] text-slate-400">Activity events will automatically appear here as changes occur.</p>
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-slate-200">
          <div className="space-y-4">
            {filteredActivities.map((act) => {
              const badge = getActionBadge(act.action);
              const initials = (act.user_name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Bullet Node */}
                  <span
                    className={`absolute -left-[30px] top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${badge.bg} shadow-xs`}
                  >
                    <span className={`h-2 w-2 rounded-full ${badge.bulletColor}`} />
                  </span>

                  {/* Card Content */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          <UiIcon name={badge.icon} size={11} />
                          {badge.label}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatTime(act.created_at)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      {act.description}
                    </p>

                    {/* Diffs / Parameter changes */}
                    {act.diff && act.diff.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {act.diff.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] border border-slate-100"
                          >
                            <span className="font-semibold text-slate-600">{item.label || item.field}:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              {item.old_value !== undefined && (
                                <>
                                  <span className="text-rose-500 line-through">{String(item.old_value)}</span>
                                  <span className="text-slate-300">→</span>
                                </>
                              )}
                              <span className="font-bold text-emerald-700">{String(item.new_value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer Author Profile */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-700">
                          {initials}
                        </span>
                        <span className="font-medium text-slate-700">{act.user_name || 'System'}</span>
                        {act.user_email && <span className="text-slate-400 text-[10px]">({act.user_email})</span>}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">ID #{String(act.id).slice(-6)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
