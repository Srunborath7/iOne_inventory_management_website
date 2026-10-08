'use client';

import { useEffect, useMemo, useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UiIcon } from '@/components/uiIcon';
import {
  getProducts,
  deleteProduct,
  getProductImageUrl,
  type Product,
} from '@/services/products';
import { getCategories, type Category } from '@/services/categories';
import { getBrands, type Brand } from '@/services/brands';
import ProductFormModal from '@/components/products/ProductFormModal';
import ProductDeleteModal from '@/components/products/ProductDeleteModal';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import AllActivitiesModal from '@/components/products/AllActivitiesModal';
import { useToast } from '@/components/toast/ToastContext';

type ViewMode = 'grid' | 'table';
type SortOrder = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'price-asc' | 'price-desc' | 'margin-desc';
type StockFilter = 'all' | 'active' | 'inactive' | 'low-stock';

function ProductsContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, startTransition] = useTransition();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [productToDetail, setProductToDetail] = useState<Product | null>(null);

  const [isAllActivitiesOpen, setIsAllActivitiesOpen] = useState(false);

  function loadData() {
    return Promise.all([
      getProducts().then((p) => {
        setProducts(p);
        setError('');
      }),
      getCategories().then(setCategories).catch(() => []),
      getBrands().then(setBrands).catch(() => []),
    ]);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadData()
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load products.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleRefresh() {
    startTransition(() => {
      loadData()
        .then(() => toast.info('Catalog refreshed', 'Up to date'))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Refresh failed';
          setError(msg);
          toast.error(msg);
        });
    });
  }

  // Create or update callback
  function handleFormSuccess(saved: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(saved.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  // Confirm delete
  async function handleConfirmDelete() {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(productToDelete.id)));
      toast.success(`Product "${productToDelete.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      setProductToDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete product.';
      toast.error(msg, 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  // Category and Brand lookup helpers
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(String(c.id), c.name));
    return map;
  }, [categories]);

  const brandMap = useMemo(() => {
    const map = new Map<string, string>();
    brands.forEach((b) => map.set(String(b.id), b.name));
    return map;
  }, [brands]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const catName = categoryMap.get(String(p.category_id)) || '';
        const bName = brandMap.get(String(p.brand_id)) || '';
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          catName.toLowerCase().includes(q) ||
          bName.toLowerCase().includes(q) ||
          String(p.id).includes(q)
        );
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => String(p.category_id) === String(selectedCategory));
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      list = list.filter((p) => String(p.brand_id) === String(selectedBrand));
    }

    // Stock Status filter
    if (stockFilter === 'active') {
      list = list.filter((p) => p.is_active);
    } else if (stockFilter === 'inactive') {
      list = list.filter((p) => !p.is_active);
    } else if (stockFilter === 'low-stock') {
      list = list.filter((p) => (p.min_stock ?? 0) > 0);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'alpha-asc':
          return a.name.localeCompare(b.name);
        case 'alpha-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return Number(a.selling_price || 0) - Number(b.selling_price || 0);
        case 'price-desc':
          return Number(b.selling_price || 0) - Number(a.selling_price || 0);
        case 'margin-desc': {
          const marginA =
            a.selling_price > 0
              ? (a.selling_price - (a.cost_price || 0)) / a.selling_price
              : 0;
          const marginB =
            b.selling_price > 0
              ? (b.selling_price - (b.cost_price || 0)) / b.selling_price
              : 0;
          return marginB - marginA;
        }
        case 'oldest':
          return String(a.id).localeCompare(String(b.id));
        case 'newest':
        default:
          return String(b.id).localeCompare(String(a.id));
      }
    });

    return list;
  }, [products, search, selectedCategory, selectedBrand, stockFilter, sortOrder, categoryMap, brandMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + Number(p.selling_price || 0),
      0
    );
    const avgMargin =
      total > 0
        ? (
            products.reduce((acc, p) => {
              const sp = Number(p.selling_price || 0);
              const cp = Number(p.cost_price || 0);
              return acc + (sp > 0 ? ((sp - cp) / sp) * 100 : 0);
            }, 0) / total
          ).toFixed(1)
        : '0.0';

    return { total, active, totalInventoryValue, avgMargin };
  }, [products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <UiIcon name="box" size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Products
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Manage your store catalog, pricing margins, SKU barcodes, and stock thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAllActivitiesOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 shadow-2xs transition hover:bg-indigo-100/70 active:scale-95"
          >
            <UiIcon name="history" size={14} className="text-indigo-600" />
            <span>Activity Logs</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <UiIcon
              name="refresh"
              size={14}
              className={isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProductToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <UiIcon name="plus" size={15} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Products</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <UiIcon name="box" size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400">
            {stats.active} active listings
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Catalog Value</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <UiIcon name="chart" size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            ${stats.totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="mt-1 inline-block text-[11px] text-slate-400">
            Total list price value
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Profit Margin</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <UiIcon name="trending-up" size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.avgMargin}%</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400">
            Across all products
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Categories & Brands</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <UiIcon name="layers" size={14} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {categories.length} <span className="text-sm font-normal text-slate-400">/</span> {brands.length}
          </p>
          <span className="mt-1 inline-block text-[11px] text-slate-400">
            Classifications linked
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <UiIcon name="search" size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU/barcode, or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <UiIcon name="x" size={14} />
              </button>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <UiIcon name="arrow" size={12} className="rotate-90" />
              </span>
            </div>

            {/* Brand Filter */}
            <div className="relative">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <UiIcon name="arrow" size={12} className="rotate-90" />
              </span>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="low-stock">With Min Stock Alert</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <UiIcon name="arrow" size={12} className="rotate-90" />
              </span>
            </div>

            {/* Sort Order */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-7 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alpha-asc">Name (A-Z)</option>
                <option value="alpha-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="margin-desc">Highest Margin</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <UiIcon name="arrow" size={12} className="rotate-90" />
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <UiIcon name="layout-grid" size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table view"
                className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <UiIcon name="layout-list" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <div className="flex items-center gap-2.5">
            <UiIcon name="alert-triangle" size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs"
            >
              <div className="aspect-square w-full rounded-2xl bg-slate-100" />
              <div className="mt-4 h-4 w-3/4 rounded-lg bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 rounded-lg bg-slate-100" />
              <div className="mt-4 flex items-center justify-between">
                <div className="h-5 w-16 rounded-md bg-slate-100" />
                <div className="h-5 w-12 rounded-md bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        /* Empty State */
        <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-2xs">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
            <UiIcon name="box" size={30} />
          </span>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            {search || selectedCategory !== 'all' || selectedBrand !== 'all' || stockFilter !== 'all'
              ? 'No products match your filters'
              : 'No products in inventory yet'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {search || selectedCategory !== 'all' || selectedBrand !== 'all' || stockFilter !== 'all'
              ? 'Try adjusting your search keywords, category, brand, or status filter.'
              : 'Get started by creating your first product item with pricing and stock limits.'}
          </p>

          <div className="mt-5 flex items-center gap-3">
            {search || selectedCategory !== 'all' || selectedBrand !== 'all' || stockFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedBrand('all');
                  setStockFilter('all');
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear all filters
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setProductToEdit(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <UiIcon name="plus" size={14} />
              <span>Create Product</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSorted.map((product) => {
            const imageUrl = getProductImageUrl(product.image_url);
            const catName =
              product.category?.name ||
              categoryMap.get(String(product.category_id)) ||
              `Category #${product.category_id}`;
            const bName =
              product.brand?.name ||
              brandMap.get(String(product.brand_id)) ||
              `Brand #${product.brand_id}`;

            const cost = Number(product.cost_price || 0);
            const price = Number(product.selling_price || 0);
            const profit = price - cost;
            const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : '0';

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"
              >
                <div>
                  {/* Image Container */}
                  <div
                    onClick={() => {
                      setProductToDetail(product);
                      setIsDetailOpen(true);
                    }}
                    className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 transition"
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-600">
                        <UiIcon name="box" size={32} />
                      </div>
                    )}

                    {/* Active/Inactive Status Badge */}
                    <span
                      className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs backdrop-blur-md ${
                        product.is_active
                          ? 'bg-emerald-600/90 text-white'
                          : 'bg-slate-800/80 text-white'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          product.is_active ? 'bg-white' : 'bg-rose-400'
                        }`}
                      />
                      {product.is_active ? 'Active' : 'Draft'}
                    </span>

                    {/* Margin Badge */}
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 shadow-xs backdrop-blur-md">
                      {margin}% margin
                    </span>
                  </div>

                  {/* Brand & Category tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {catName}
                    </span>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {bName}
                    </span>
                  </div>

                  {/* Title & SKU */}
                  <h3
                    onClick={() => {
                      setProductToDetail(product);
                      setIsDetailOpen(true);
                    }}
                    className="mt-2 cursor-pointer line-clamp-1 text-sm font-bold text-slate-900 transition hover:text-emerald-600"
                  >
                    {product.name}
                  </h3>

                  {/* Creator & Timestamp info */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
                        {((product.creator?.full_name || product.creator?.name || 'A')[0]).toUpperCase()}
                      </span>
                      <span className="truncate text-slate-600">
                        {product.creator?.full_name || product.creator?.name || (product.created_by ? `User #${product.created_by}` : 'Admin')}
                      </span>
                    </div>
                    {product.created_at && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Pricing info */}
                  <div className="mt-3 flex items-baseline justify-between rounded-xl bg-slate-50/70 p-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400">Selling</span>
                      <span className="font-extrabold text-slate-900">
                        ${price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400">Cost</span>
                      <span className="font-semibold text-slate-500">
                        ${cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProductToDetail(product);
                      setIsDetailOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 transition hover:text-emerald-800"
                  >
                    <UiIcon name="eye" size={13} />
                    <span>Details</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProductToEdit(product);
                        setIsFormOpen(true);
                      }}
                      title="Edit product"
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                    >
                      <UiIcon name="edit" size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductToDelete(product);
                        setIsDeleteOpen(true);
                      }}
                      title="Delete product"
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                    >
                      <UiIcon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className='px-5 py-3.5'>N°</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Classification</th>
                  <th className="px-4 py-3.5">Pricing & Margins</th>
                  <th className="px-4 py-3.5">Stock Limits</th>
                  <th className="px-4 py-3.5">Created By</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.map((product,index) => {
                  const imageUrl = getProductImageUrl(product.image_url);
                  const catName =
                    product.category?.name ||
                    categoryMap.get(String(product.category_id)) ||
                    `#${product.category_id}`;
                  const bName =
                    product.brand?.name ||
                    brandMap.get(String(product.brand_id)) ||
                    `#${product.brand_id}`;

                  const cost = Number(product.cost_price || 0);
                  const price = Number(product.selling_price || 0);
                  const profit = price - cost;
                  const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : '0';

                  const creatorName =
                    product.creator?.full_name ||
                    product.creator?.name ||
                    (product.created_by ? `User #${product.created_by}` : 'Admin');

                  const formattedCreated = product.created_at
                    ? new Date(product.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className='px-5 py-3.5'>{index + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            {imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-emerald-600">
                                <UiIcon name="box" size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setProductToDetail(product);
                                setIsDetailOpen(true);
                              }}
                              className="text-left font-bold text-slate-900 transition hover:text-emerald-600 line-clamp-1"
                            >
                              {product.name}
                            </button>
                            <span className="block font-mono text-[11px] text-slate-400">
                              {product.barcode || 'No barcode'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {catName}
                          </span>
                          <span className="inline-flex w-fit rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                            {bName}
                          </span>
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-bold text-slate-900">
                            ${price.toFixed(2)}
                          </span>
                          <span className="ml-1.5 text-[11px] text-slate-400">
                            (cost: ${cost.toFixed(2)})
                          </span>
                          <span className="block text-[10px] font-semibold text-emerald-700">
                            Margin: {margin}% (+${profit.toFixed(2)})
                          </span>
                        </div>
                      </td>

                      {/* Stock Limits */}
                      <td className="px-4 py-3.5">
                        <div className="text-[11px]">
                          <span className="text-slate-600">
                            Min: <strong>{product.min_stock ?? 0}</strong>
                          </span>
                          <span className="mx-1 text-slate-300">•</span>
                          <span className="text-slate-600">
                            Max: <strong>{product.max_stock ?? 100}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Created By */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {(creatorName[0] || 'A').toUpperCase()}
                          </span>
                          <div>
                            <span className="block font-medium text-slate-800 text-[11px]">
                              {creatorName}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {formattedCreated}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            product.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {product.is_active ? 'Active' : 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProductToDetail(product);
                              setIsDetailOpen(true);
                            }}
                            title="View details"
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <UiIcon name="eye" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductToEdit(product);
                              setIsFormOpen(true);
                            }}
                            title="Edit product"
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <UiIcon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete product"
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <UiIcon name="trash" size={14} />
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

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setProductToEdit(null);
        }}
        onSuccess={handleFormSuccess}
        productToEdit={productToEdit}
        categories={categories}
        brands={brands}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailOpen}
        product={productToDetail}
        categories={categories}
        brands={brands}
        onClose={() => {
          setIsDetailOpen(false);
          setProductToDetail(null);
        }}
        onEdit={(p) => {
          setIsDetailOpen(false);
          setProductToEdit(p);
          setIsFormOpen(true);
        }}
        onDelete={(p) => {
          setIsDetailOpen(false);
          setProductToDelete(p);
          setIsDeleteOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ProductDeleteModal
        isOpen={isDeleteOpen}
        product={productToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      {/* All Activities Audit Modal */}
      <AllActivitiesModal
        isOpen={isAllActivitiesOpen}
        onClose={() => setIsAllActivitiesOpen(false)}
        products={products}
        onSelectProduct={(p) => {
          setProductToDetail(p);
          setIsDetailOpen(true);
        }}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <UiIcon name="refresh" size={24} className="animate-spin text-emerald-600" />
            <p className="text-xs text-slate-400">Loading products catalog...</p>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
