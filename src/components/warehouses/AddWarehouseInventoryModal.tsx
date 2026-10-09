'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import type { Warehouses } from '@/services/warehouses';
import type { Product } from '@/services/products/type';
import type { WarehousesInventory } from '@/services/warehouses_inventory';
import { createWarehouseInventory } from '@/services/warehouses_inventory';
import { useToast } from '@/components/toast/ToastContext';

interface AddWarehouseInventoryModalProps {
  isOpen: boolean;
  warehouseId?: number | string | null;
  warehouses: Warehouses[];
  products: Product[];
  existingInventory: WarehousesInventory[];
  onClose: () => void;
  onSuccess: (newItem: WarehousesInventory) => void;
}

export default function AddWarehouseInventoryModal({
  isOpen,
  warehouseId,
  warehouses,
  products,
  existingInventory,
  onClose,
  onSuccess,
}: AddWarehouseInventoryModalProps) {
  const toast = useToast();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(() => {
    if (warehouseId) return Number(warehouseId);
    return warehouses[0]?.id ? Number(warehouses[0].id) : 0;
  });

  // Filter products that are not yet registered in this warehouse
  const alreadyAssignedProductIds = useMemo(() => {
    return new Set(
      existingInventory
        .filter((item) => Number(item.warehouses_id) === selectedWarehouseId)
        .map((item) => Number(item.product_id))
    );
  }, [existingInventory, selectedWarehouseId]);

  const availableProducts = useMemo(() => {
    return products.filter((p) => !alreadyAssignedProductIds.has(Number(p.id)));
  }, [products, alreadyAssignedProductIds]);

  const [selectedProductId, setSelectedProductId] = useState<number>(() => {
    return availableProducts[0]?.id ? Number(availableProducts[0].id) : 0;
  });

  const [quantity, setQuantity] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!selectedWarehouseId) {
      setError('Please select a warehouse.');
      return;
    }
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (quantity < 0) {
      setError('Initial quantity cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      const created = await createWarehouseInventory({
        warehouses_id: selectedWarehouseId,
        product_id: selectedProductId,
        quantity,
        is_active: isActive,
      });

      const prodName = products.find((p) => Number(p.id) === selectedProductId)?.name || 'Product';
      const whName = warehouses.find((w) => Number(w.id) === selectedWarehouseId)?.name || 'Warehouse';

      toast.success(`Assigned "${prodName}" to "${whName}" with ${quantity} units.`);
      onSuccess(created);
      onClose();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Could not add product to warehouse.';
      setError(msg);
      toast.error(msg, 'Assignment Failed');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-xs animate-fade-in"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-inventory-title"
        className="my-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <UiIcon name="plus" size={20} />
            </span>
            <div>
              <h2 id="add-inventory-title" className="text-lg font-bold text-slate-900">
                Assign Product to Warehouse
              </h2>
              <p className="text-xs text-slate-500">
                Register product stock inside this storage facility.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <UiIcon name="x" size={18} />
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"
          >
            <UiIcon name="alert-triangle" size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Warehouse Destination
            </label>
            <select
              aria-label="Select Warehouse"
              value={selectedWarehouseId}
              onChange={(e) => {
                const newWhId = Number(e.target.value);
                setSelectedWarehouseId(newWhId);
                const assigned = new Set(
                  existingInventory
                    .filter((item) => Number(item.warehouses_id) === newWhId)
                    .map((item) => Number(item.product_id))
                );
                const available = products.filter((p) => !assigned.has(Number(p.id)));
                setSelectedProductId(available[0]?.id ? Number(available[0].id) : 0);
              }}
              className={`${fieldClass} mt-1`}
              disabled={Boolean(warehouseId)}
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Select Product
            </label>
            {availableProducts.length === 0 ? (
              <div className="mt-1 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 p-3 text-center text-xs text-amber-800">
                All existing products are already assigned to this warehouse.
              </div>
            ) : (
              <select
                aria-label="Select Product to assign"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className={`${fieldClass} mt-1`}
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.barcode ? `(${p.barcode})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="init-qty" className="text-xs font-semibold text-slate-700">
              Initial Quantity in Stock
            </label>
            <input
              id="init-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              placeholder="0"
            />
          </div>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
              />
              <span>Active in Warehouse Inventory</span>
            </label>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
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
              disabled={loading || availableProducts.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{loading ? 'Assigning...' : 'Assign Product'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
