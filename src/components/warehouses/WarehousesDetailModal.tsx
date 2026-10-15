'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { UiIcon } from '@/components/uiIcon';
import type { Warehouses } from '@/services/warehouses';
import type { WarehousesInventory } from '@/services/warehouses_inventory';
import type { Product } from '@/services/products/type';
import { getProductImageUrl } from '@/services/products';
import { deleteWarehouseInventory } from '@/services/warehouses_inventory';
import { formatDate } from '@/lib/format_date';
import { useToast } from '@/components/toast/ToastContext';
import AdjustStockModal from './AdjustStockModal';

interface Props {
  isOpen: boolean;
  warehouse: Warehouses | null;
  inventory: WarehousesInventory[];
  products: Product[];
  onClose: () => void;
  onEdit: (warehouse: Warehouses) => void;
  onDelete: (warehouse: Warehouses) => void;
  onRefreshData: () => void;
  onOpenTransfer: (fromWarehouseId: number, productId?: number) => void;
  onOpenAddInventory: (warehouseId: number) => void;
}

export default function WarehousesDetailModal({
  isOpen,
  warehouse,
  inventory,
  products,
  onClose,
  onEdit,
  onDelete,
  onRefreshData,
  onOpenTransfer,
  onOpenAddInventory,
}: Props) {
  const toast = useToast();
  const [productSearch, setProductSearch] = useState('');
  const [adjustingItem, setAdjustingItem] = useState<WarehousesInventory | null>(null);
  const [deletingInventoryId, setDeletingInventoryId] = useState<number | string | null>(null);

  const warehouseInventoryList = useMemo(() => {
    if (!warehouse) return [];
    return inventory.filter((item) => Number(item.warehouses_id) === Number(warehouse.id));
  }, [inventory, warehouse]);

  const totalUnits = useMemo(() => {
    return warehouseInventoryList.reduce((sum, item) => sum + item.quantity, 0);
  }, [warehouseInventoryList]);

  const totalValue = useMemo(() => {
    return warehouseInventoryList.reduce((sum, item) => {
      const prod = products.find((p) => Number(p.id) === Number(item.product_id));
      const price = prod?.selling_price ? Number(prod.selling_price) : 0;
      return sum + item.quantity * price;
    }, 0);
  }, [warehouseInventoryList, products]);

  const filteredInventory = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return warehouseInventoryList;

    return warehouseInventoryList.filter((item) => {
      const prod = products.find((p) => Number(p.id) === Number(item.product_id));
      if (!prod) return String(item.product_id).includes(q);
      return (
        prod.name.toLowerCase().includes(q) ||
        (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
        String(prod.id).includes(q)
      );
    });
  }, [warehouseInventoryList, products, productSearch]);

  if (!isOpen || !warehouse) return null;

  async function handleRemoveInventory(itemId: number | string, productName: string) {
    if (!confirm(`Are you sure you want to remove "${productName}" from this warehouse?`)) {
      return;
    }
    setDeletingInventoryId(itemId);
    try {
      await deleteWarehouseInventory(itemId);
      toast.success(`Removed "${productName}" from ${warehouse?.name || 'warehouse'}.`);
      onRefreshData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove inventory item.';
      toast.error(msg, 'Removal Failed');
    } finally {
      setDeletingInventoryId(null);
    }
  }

  const adjustingProduct = adjustingItem
    ? products.find((p) => Number(p.id) === Number(adjustingItem.product_id))
    : null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-xs animate-fade-in"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouses-detail-title"
        className="my-auto flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <UiIcon name="building-2" size={24} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                  {warehouse.code}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    warehouse.is_active === false
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                  }`}
                >
                  {warehouse.is_active === false ? 'Inactive' : 'Active Facility'}
                </span>
              </div>
              <h2 id="warehouses-detail-title" className="mt-1 text-2xl font-extrabold text-slate-900">
                {warehouse.name}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <UiIcon name="map-pin" size={14} className="text-slate-400 shrink-0" />
                <span className="break-words">{warehouse.address || 'No address specified'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(warehouse)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <UiIcon name="edit" size={14} />
              <span className="hidden sm:inline">Edit Facility</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <UiIcon name="x" size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Facility Highlights / Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Stock</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <UiIcon name="boxes" size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {totalUnits.toLocaleString()}
                <span className="ml-1 text-xs font-medium text-slate-400">units</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Stored physical inventory</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product SKUs</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <UiIcon name="box" size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {warehouseInventoryList.length}
                <span className="ml-1 text-xs font-medium text-slate-400">catalog items</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Distinct products held</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estimated Value</span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <UiIcon name="trending-up" size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Based on catalog selling price</p>
            </div>
          </div>

          {/* Description & Metadata */}
          {warehouse.description && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</p>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {warehouse.description}
              </p>
            </div>
          )}

          {/* Stored Inventory Table Section */}
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Warehouse Inventory</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {warehouseInventoryList.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time stock ledger for products held in this warehouse.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-slate-400 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10">
                  <UiIcon name="search" size={14} />
                  <input
                    type="text"
                    placeholder="Search stored products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-36 sm:w-48 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <UiIcon name="x" size={12} />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => onOpenTransfer(Number(warehouse.id))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100"
                >
                  <UiIcon name="arrow-right-left" size={14} />
                  <span>Transfer Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddInventory(Number(warehouse.id))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                >
                  <UiIcon name="plus" size={14} />
                  <span>Assign Product</span>
                </button>
              </div>
            </div>

            {/* Inventory List Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                    <UiIcon name="package" size={24} />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-800">
                    {productSearch ? 'No matching products in this facility' : 'No products assigned to this warehouse yet'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {productSearch
                      ? 'Try a different search term or clear the filter.'
                      : 'Assign products to begin tracking physical inventory in this warehouse.'}
                  </p>
                  {!productSearch && (
                    <button
                      type="button"
                      onClick={() => onOpenAddInventory(Number(warehouse.id))}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <UiIcon name="plus" size={14} />
                      Assign Product Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Barcode / SKU</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock in WH</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInventory.map((item) => {
                        const prod = products.find((p) => Number(p.id) === Number(item.product_id));
                        const imgUrl = prod ? getProductImageUrl(prod.image_url) : null;
                        const isLowStock = prod ? item.quantity <= prod.min_stock : false;
                        const isOutOfStock = item.quantity === 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                {imgUrl ? (
                                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <Image
                                      src={imgUrl}
                                      alt={prod?.name || 'Product'}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs">
                                    <UiIcon name="box" size={18} />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">
                                    {prod?.name || `Product #${item.product_id}`}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    ID: {item.product_id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-slate-600 font-mono">
                              {prod?.barcode || '—'}
                            </td>

                            <td className="px-4 py-3.5 font-semibold text-slate-800">
                              {prod?.selling_price ? `$${Number(prod.selling_price).toFixed(2)}` : '—'}
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="text-sm font-extrabold text-slate-900">
                                {item.quantity}
                              </span>
                              <span className="ml-1 text-[10px] text-slate-400">units</span>
                            </td>

                            <td className="px-4 py-3.5">
                              {isOutOfStock ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                  Depleted
                                </span>
                              ) : isLowStock ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  In Stock
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAdjustingItem(item)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                                >
                                  Adjust
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenTransfer(Number(warehouse.id), Number(item.product_id))}
                                  title="Transfer stock from this warehouse"
                                  className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50"
                                >
                                  <UiIcon name="arrow-right-left" size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInventory(item.id, prod?.name || `Product #${item.product_id}`)}
                                  disabled={deletingInventoryId === item.id}
                                  title="Remove from this warehouse"
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
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
              )}
            </div>
          </section>

          {/* Timestamps Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <span>Created: {formatDate(warehouse.created_at || '-')}</span>
            <span>Last Updated: {formatDate(warehouse.updated_at || '-')}</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:px-6">
          <button
            type="button"
            onClick={() => onDelete(warehouse)}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
          >
            Delete Warehouse
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onEdit(warehouse)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              Edit Facility
            </button>
          </div>
        </footer>
      </section>

      {/* Adjust Stock Sub-Modal */}
      {adjustingItem && (
        <AdjustStockModal
          isOpen={Boolean(adjustingItem)}
          inventoryItem={adjustingItem}
          product={adjustingProduct}
          warehouse={warehouse}
          onClose={() => setAdjustingItem(null)}
          onSuccess={() => {
            onRefreshData();
            setAdjustingItem(null);
          }}
        />
      )}
    </div>
  );
}
