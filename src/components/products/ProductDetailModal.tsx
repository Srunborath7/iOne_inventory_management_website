'use client';

import { useState } from 'react';
import { UiIcon } from '@/components/uiIcon';
import { getProductImageUrl, type Product } from '@/services/products';
import type { Category } from '@/services/categories';
import type { Brand } from '@/services/brands';
import ProductActivityTimeline from './ProductActivityTimeline';

interface ProductDetailModalProps {
  isOpen: boolean;
  product: Product | null;
  categories?: Category[];
  brands?: Brand[];
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductDetailModal({
  isOpen,
  product,
  categories = [],
  brands = [],
  onClose,
  onEdit,
  onDelete,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

  if (!isOpen || !product) return null;

  const imageUrl = getProductImageUrl(product.image_url);

  const categoryName =
    product.category?.name ||
    categories.find((c) => String(c.id) === String(product.category_id))?.name ||
    `Category #${product.category_id}`;

  const brandName =
    product.brand?.name ||
    brands.find((b) => String(b.id) === String(product.brand_id))?.name ||
    `Brand #${product.brand_id}`;

  const creatorName =
    product.creator?.full_name ||
    product.creator?.name ||
    (product.created_by ? `User #${product.created_by}` : 'Administrator');

  const creatorEmail = product.creator?.email;
  const cost = Number(product.cost_price || 0);
  const price = Number(product.selling_price || 0);
  const profit = price - cost;
  const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';

  const formattedCreated = product.created_at
    ? new Date(product.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const formattedUpdated = product.updated_at
    ? new Date(product.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UiIcon name="box" size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Product Details
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                  ID {product.id}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{product.name}</p>
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

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <UiIcon name="box" size={14} />
            <span>Overview & Specs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'activity'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <UiIcon name="history" size={14} />
            <span>Activity Log & History</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' ? (
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-12">
            {/* Left: Image & Quick Badges */}
            <div className="sm:col-span-5 space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {imageUrl ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition hover:scale-105 duration-300"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700">
                    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-emerald-600 shadow-md">
                      <UiIcon name="box" size={32} />
                    </span>
                    <p className="mt-3 text-xs font-semibold text-slate-500">No Image Uploaded</p>
                  </div>
                )}
              </div>

              {/* Status & Barcode Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    product.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      product.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {product.is_active ? 'Active Listing' : 'Draft / Inactive'}
                </span>

                {product.barcode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-700 border border-slate-200">
                    <UiIcon name="tag" size={12} className="text-slate-400" />
                    {product.barcode}
                  </span>
                )}
              </div>

              {/* Creator Info Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <UiIcon name="user" size={12} />
                  <span>Created By</span>
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-xs">
                    {(creatorName[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{creatorName}</p>
                    {creatorEmail ? (
                      <p className="text-[11px] text-slate-500 truncate">{creatorEmail}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Account #{product.created_by || '1'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Info, Pricing, Stock */}
            <div className="sm:col-span-7 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {categoryName}
                  </span>
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    {brandName}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                  {product.name}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {product.description || (
                    <span className="italic text-slate-400">No product description provided.</span>
                  )}
                </p>
              </div>

              {/* Financial Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pricing & Margins
                </span>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white p-2.5 text-center shadow-2xs border border-slate-100">
                    <span className="block text-[10px] text-slate-400">Selling Price</span>
                    <span className="text-sm font-bold text-slate-900">
                      ${price.toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 text-center shadow-2xs border border-slate-100">
                    <span className="block text-[10px] text-slate-400">Cost Price</span>
                    <span className="text-sm font-semibold text-slate-600">
                      ${cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-emerald-50/90 p-2.5 text-center border border-emerald-100">
                    <span className="block text-[10px] text-emerald-700 font-medium">Profit Margin</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {margin}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Thresholds Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 text-xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Min Stock Alert
                  </span>
                  <span className="mt-1 block text-base font-bold text-amber-900">
                    {product.min_stock ?? 0}{' '}
                    <span className="text-xs font-normal text-amber-700">units</span>
                  </span>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3.5 text-xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    Max Stock Capacity
                  </span>
                  <span className="mt-1 block text-base font-bold text-teal-900">
                    {product.max_stock ?? 0}{' '}
                    <span className="text-xs font-normal text-teal-700">units</span>
                  </span>
                </div>
              </div>

              {/* Meta Timestamps */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Created At
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
          </div>
        ) : (
          /* Tab 2: Activity Log & History */
          <div className="mt-5">
            <ProductActivityTimeline product={product} />
          </div>
        )}

        {/* Actions Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(product);
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
                onEdit(product);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <UiIcon name="edit" size={14} />
              <span>Edit Product</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
