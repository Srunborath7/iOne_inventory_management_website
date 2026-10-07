'use client';

import { useEffect, useMemo, useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UiIcon } from '@/components/uiIcon';
import {
  getCategories,
  deleteCategory,
  getCategoryImageUrl,
  type Category,
} from '@/services/categories';
import CategoryFormModal from '@/components/categories/CategoryFormModal';
import CategoryDeleteModal from '@/components/categories/CategoryDeleteModal';
import CategoryDetailModal from '@/components/categories/CategoryDetailModal';
import { useToast } from '@/components/toast/ToastContext';

type ViewMode = 'grid' | 'table';
type SortOrder = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc';

const toneGradients = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-teal-500 to-emerald-700',
];

function CategoriesContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, startTransition] = useTransition();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [categoryToDetail, setCategoryToDetail] = useState<Category | null>(null);

  function fetchCategoriesData() {
    getCategories()
      .then((data) => {
        setCategories(data);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load categories.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    let active = true;
    getCategories()
      .then((data) => {
        if (active) {
          setCategories(data);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load categories.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let list = [...categories];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          String(c.id).includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortOrder === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'alpha-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'oldest') {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      }
      // default: newest
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return list;
  }, [categories, search, sortOrder]);

  // Handlers
  function handleOpenCreate() {
    setCategoryToEdit(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(cat: Category) {
    setCategoryToEdit(cat);
    setIsFormOpen(true);
  }

  function handleOpenDelete(cat: Category) {
    setCategoryToDelete(cat);
    setIsDeleteOpen(true);
  }

  function handleOpenDetail(cat: Category) {
    setCategoryToDetail(cat);
    setIsDetailOpen(true);
  }

  async function handleConfirmDelete() {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      toast.success(`Category "${categoryToDelete.name}" was deleted.`);
      setIsDeleteOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete category.';
      toast.error(msg, 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function handleSaveSuccess(saved: Category) {
    setCategories((prev) => {
      const index = prev.findIndex((c) => c.id === saved.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
  }

  const withImagesCount = categories.filter((c) => Boolean(c.image_url)).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Product Classification
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Categories Catalog
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Define, customize, and structure inventory categories across your catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              startTransition(() => {
                fetchCategoriesData();
              });
            }}
            title="Refresh categories"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <UiIcon
              name="refresh"
              size={16}
              className={isRefreshing || loading ? 'animate-spin text-emerald-600' : ''}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
          >
            <UiIcon name="plus" size={16} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Categories
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{categories.length}</span>
            <span className="text-[11px] font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            With Images
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{withImagesCount}</span>
            <span className="text-[11px] text-slate-500">
              {categories.length > 0
                ? `${Math.round((withImagesCount / categories.length) * 100)}% coverage`
                : '0%'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Backend API
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-800">FastAPI Connected</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Catalog Status
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, View Mode, Sort */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <label className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 text-slate-400 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 sm:max-w-xs">
          <UiIcon name="search" size={16} />
          <input
            type="text"
            placeholder="Filter categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <UiIcon name="x" size={12} />
            </button>
          )}
        </label>

        {/* View mode & Sort */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {/* Sort */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden text-[11px] text-slate-400 sm:inline">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="newest">Newest Added</option>
              <option value="oldest">Oldest Added</option>
              <option value="alpha-asc">Name (A → Z)</option>
              <option value="alpha-desc">Name (Z → A)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UiIcon name="layout-grid" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UiIcon name="layout-list" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mt-6">
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <UiIcon name="alert-triangle" size={24} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-rose-900">Unable to load categories</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-rose-600">{error}</p>
            {error.toLowerCase().includes('token') || error.includes('401') ? (
              <a
                href="/auth/login?next=/categories&expired=1"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                Sign in again
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchCategoriesData();
                }}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Try Again
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="h-36 w-full rounded-2xl bg-slate-100" />
                <div className="mt-4 h-4 w-1/2 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-3/4 rounded bg-slate-50" />
                <div className="mt-4 flex justify-between">
                  <div className="h-6 w-16 rounded bg-slate-100" />
                  <div className="h-6 w-12 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UiIcon name="layers" size={26} />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-800">
              {search ? 'No matching categories' : 'Your category catalog is ready'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {search
                ? `No items match the search "${search}". Try adjusting your query.`
                : 'Create your first product classification group to start organizing your inventory.'}
            </p>
            <div className="mt-5">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear Search Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  <UiIcon name="plus" size={16} />
                  <span>Create First Category</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSorted.map((cat, index) => {
              const imageUrl = getCategoryImageUrl(cat.image_url);
              const gradientClass = toneGradients[index % toneGradients.length];

              return (
                <article
                  key={cat.id}
                  className="card-hover-lift group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition"
                >
                  {/* Category Image Header */}
                  <div
                    onClick={() => handleOpenDetail(cat)}
                    className="relative aspect-video w-full cursor-pointer overflow-hidden bg-slate-100"
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={cat.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-tr ${gradientClass} text-white`}
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-xs">
                          <UiIcon name="layers" size={24} />
                        </span>
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-slate-950/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                      #{cat.id}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3
                          onClick={() => handleOpenDetail(cat)}
                          className="cursor-pointer truncate text-base font-bold text-slate-900 transition hover:text-emerald-700"
                        >
                          {cat.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {cat.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-[10px] font-medium text-slate-400">
                        {cat.created_at
                          ? new Date(cat.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Catalog item'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(cat)}
                          title="View details"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <UiIcon name="eye" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit category"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <UiIcon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(cat)}
                          title="Delete category"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <UiIcon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAndSorted.map((cat, index) => {
                    const imageUrl = getCategoryImageUrl(cat.image_url);
                    const gradientClass = toneGradients[index % toneGradients.length];

                    return (
                      <tr
                        key={cat.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3.5">
                          <div
                            onClick={() => handleOpenDetail(cat)}
                            className="flex cursor-pointer items-center gap-3"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt={cat.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className={`flex h-full w-full items-center justify-center bg-gradient-to-tr ${gradientClass} text-white`}
                                >
                                  <UiIcon name="layers" size={16} />
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 hover:text-emerald-700">
                              {cat.name}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-xs truncate px-5 py-3.5 text-slate-500">
                          {cat.description || (
                            <span className="italic text-slate-400">No description</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-400">#{cat.id}</td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {cat.created_at
                            ? new Date(cat.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(cat)}
                              title="View details"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <UiIcon name="eye" size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cat)}
                              title="Edit category"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <UiIcon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(cat)}
                              title="Delete category"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <UiIcon name="trash" size={15} />
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

        {/* Footer info */}
        {!loading && !error && filteredAndSorted.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span>
              Showing {filteredAndSorted.length} of {categories.length} categories
            </span>
            <span>Stockwise Inventory Catalog</span>
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryFormModal
        isOpen={isFormOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setCategoryToEdit(null);
        }}
        onSuccess={handleSaveSuccess}
      />

      <CategoryDeleteModal
        isOpen={isDeleteOpen}
        category={categoryToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      <CategoryDetailModal
        isOpen={isDetailOpen}
        category={categoryToDetail}
        onClose={() => {
          setIsDetailOpen(false);
          setCategoryToDetail(null);
        }}
        onEdit={(cat) => {
          setIsDetailOpen(false);
          handleOpenEdit(cat);
        }}
        onDelete={(cat) => {
          setIsDetailOpen(false);
          handleOpenDelete(cat);
        }}
      />
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Loading category workspace…
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
