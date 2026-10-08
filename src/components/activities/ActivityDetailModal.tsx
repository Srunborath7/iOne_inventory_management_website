'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UiIcon, type IconName } from '@/components/uiIcon';
import type { ActivityLog, ActivityType, ActivityDiff } from '@/services/products';
import { useToast } from '@/components/toast/ToastContext';

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: (ActivityLog & { product_name?: string }) | null;
  onDelete?: (activity: ActivityLog & { product_name?: string }) => void;
}

export default function ActivityDetailModal({
  isOpen,
  onClose,
  activity,
  onDelete,
}: ActivityDetailModalProps) {
  const toast = useToast();
  const [showJson, setShowJson] = useState(false);

  if (!isOpen || !activity) return null;

  function getBadgeDetails(action: ActivityType): {
    bg: string;
    icon: IconName;
    label: string;
  } {
    switch (action) {
      case 'create':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'box', label: 'Product Created' };
      case 'price_change':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'trending-up', label: 'Price Adjustment' };
      case 'stock_threshold':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'alert-triangle', label: 'Stock Limits' };
      case 'status_change':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'tag', label: 'Status Modified' };
      case 'note':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'file-text', label: 'Audit Note' };
      case 'delete':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'trash', label: 'Item Removed' };
      case 'update':
      default:
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'edit', label: 'Updated Info' };
    }
  }

  function formatTime(isoString: string) {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  const badge = getBadgeDetails(activity.action);
  const initial = (activity.user_name || 'U').charAt(0).toUpperCase();

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activity, null, 2));
    toast.success('Activity payload copied to clipboard!');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-2xl border ${badge.bg}`}>
              <UiIcon name={badge.icon} size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.bg}`}>
                  {badge.label}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">ID: {String(activity.id).slice(0, 16)}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{activity.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* User & Product Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* User Attribution */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <UiIcon name="user" size={13} />
                <span>Initiated By</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {activity.user_name || 'System / Staff'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activity.user_email || 'No email specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Product */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <UiIcon name="box" size={13} />
                <span>Target Product</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {activity.product_name || `Product #${activity.product_id}`}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Product ID: {activity.product_id}</p>
                </div>
                <Link
                  href={`/products?search=${encodeURIComponent(activity.product_name || String(activity.product_id))}`}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition"
                >
                  <UiIcon name="eye" size={12} />
                  <span>View</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Description & Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5">
            <h4 className="text-xs font-semibold text-slate-700 mb-1">Event Summary</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{activity.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <UiIcon name="clock" size={13} />
              <span>Timestamp: {formatTime(activity.created_at)}</span>
            </div>
          </div>

          {/* Field Changes / Diffs */}
          {activity.diff && activity.diff.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
              <h4 className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-2">
                <UiIcon name="layers" size={14} className="text-emerald-600" />
                <span>Modified Parameters & Audit Diffs</span>
              </h4>
              <div className="space-y-2">
                {activity.diff.map((item: ActivityDiff, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-700">{item.label || item.field}:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.old_value !== undefined && item.old_value !== null && (
                        <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-rose-700 line-through text-[11px]">
                          {String(item.old_value)}
                        </span>
                      )}
                      {item.old_value !== undefined && item.new_value !== undefined && (
                        <span className="text-slate-400 font-mono">→</span>
                      )}
                      {item.new_value !== undefined && item.new_value !== null && (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 font-semibold text-[11px]">
                          {String(item.new_value)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Raw JSON Data */}
          <div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition"
              >
                <UiIcon name={showJson ? 'eye-off' : 'eye'} size={13} />
                <span>{showJson ? 'Hide Raw Payload' : 'Show Technical Payload (JSON)'}</span>
              </button>
              {showJson && (
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Copy JSON
                </button>
              )}
            </div>
            {showJson && (
              <pre className="mt-2 rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(activity, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(activity)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
            >
              <UiIcon name="trash" size={14} />
              <span>Delete Log</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
