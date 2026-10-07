'use client';

import { UiIcon } from '@/components/uiIcon';
import { getCategoryImageUrl, type Category } from '@/services/categories';

interface CategoryDetailModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryDetailModal({
  isOpen,
  category,
  onClose,
  onEdit,
  onDelete,
}: CategoryDetailModalProps) {
  if (!isOpen || !category) return null;

  const imageUrl = getCategoryImageUrl(category.image_url);

  const formattedCreated = category.created_at
    ? new Date(category.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  const formattedUpdated = category.updated_at
    ? new Date(category.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Category Details
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

        {/* Visual Header / Image */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {imageUrl ? (
            <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={category.name}
                className="h-full w-full object-cover transition hover:scale-105 duration-300"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-emerald-600 shadow-md">
                <UiIcon name="layers" size={32} />
              </span>
              <p className="mt-3 text-xs font-semibold text-slate-500">No Image Uploaded</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {category.name}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">
                ID: #{category.id}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {category.description || (
                <span className="italic text-slate-400">No description provided.</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Created
              </span>
              <span className="mt-0.5 block font-medium text-slate-700">{formattedCreated}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Last Updated
              </span>
              <span className="mt-0.5 block font-medium text-slate-700">{formattedUpdated}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(category);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100/70"
          >
            <UiIcon name="trash" size={15} />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(category);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <UiIcon name="edit" size={14} />
              <span>Edit Category</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
