'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import {
  createCategory,
  updateCategory,
  getCategoryImageUrl,
  type Category,
} from '@/services/categories';
import { useToast } from '@/components/toast/ToastContext';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (category: Category) => void;
  categoryToEdit?: Category | null;
}

function CategoryFormDialog({
  onClose,
  onSuccess,
  categoryToEdit,
}: Omit<CategoryFormModalProps, 'isOpen'>) {
  const toast = useToast();
  const [name, setName] = useState(categoryToEdit?.name ?? '');
  const [description, setDescription] = useState(categoryToEdit?.description ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    categoryToEdit ? getCategoryImageUrl(categoryToEdit.image_url) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(categoryToEdit);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, WebP, etc.).');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditing && categoryToEdit) {
        const updated = await updateCategory(categoryToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          image: imageFile,
        });
        toast.success(`Category "${updated.name}" updated successfully!`);
        onSuccess(updated);
      } else {
        const created = await createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          image: imageFile,
        });
        toast.success(`Category "${created.name}" created successfully!`);
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save category.';
      setError(msg);
      toast.error(msg, 'Save failed');
    } finally {
      setLoading(false);
    }
  }

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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UiIcon name={isEditing ? 'edit' : 'layers'} size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Category' : 'Create New Category'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update category details and catalog image'
                  : 'Add a new classification group to your catalog'}
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
            <UiIcon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="cat-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Footwear, Electronics, Home Appliances"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cat-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="cat-desc"
              rows={3}
              placeholder="Brief description of products belonging to this category..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Image Upload */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category Image <span className="text-slate-400 font-normal">(optional)</span>
            </span>

            {imagePreview ? (
              <div className="relative flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {imageFile ? imageFile.name : 'Current catalog image'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {imageFile
                      ? `${(imageFile.size / 1024).toFixed(1)} KB`
                      : 'Saved in catalog'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/30"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  <UiIcon name="upload" size={18} />
                </span>
                <p className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-emerald-800">
                  Click to upload category image
                </p>
                <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
}: CategoryFormModalProps) {
  if (!isOpen) return null;

  return (
    <CategoryFormDialog
      key={categoryToEdit?.id ?? 'new-category'}
      onClose={onClose}
      onSuccess={onSuccess}
      categoryToEdit={categoryToEdit}
    />
  );
}
