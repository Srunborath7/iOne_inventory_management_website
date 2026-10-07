'use client';

import { UiIcon } from '@/components/uiIcon';
import type { Category } from '@/services/categories';

interface CategoryDeleteModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export default function CategoryDeleteModal({
  isOpen,
  category,
  onClose,
  onConfirm,
  loading,
}: CategoryDeleteModalProps) {
  if (!isOpen || !category) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <UiIcon name="trash" size={22} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete Category</h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Are you sure you want to permanently delete the category{' '}
          <strong className="font-semibold text-slate-900">&ldquo;{category.name}&rdquo;</strong>? Products
          categorized under this group will lose their assigned classification.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
          >
            {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
            <span>Delete Category</span>
          </button>
        </div>
      </div>
    </div>
  );
}
