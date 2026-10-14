'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import type { Warehouses } from '@/services/warehouses';
import type { WarehousesInventory } from '@/services/warehouses_inventory';
import type { Product } from '@/services/products/type';
import { transferStock } from '@/services/stock_transfers';
import { useToast } from '@/components/toast/ToastContext';

interface StockTransferModalProps {
  isOpen: boolean;
  warehouses: Warehouses[];
  inventory: WarehousesInventory[];
  products: Product[];
  initialFromWarehouseId?: number | string | null;
  initialProductId?: number | string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockTransferModal({
  isOpen,
  warehouses,
  inventory,
  products,
  initialFromWarehouseId,
  initialProductId,
  onClose,
  onSuccess,
}: StockTransferModalProps) {
  const toast = useToast();

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.is_active !== false),
    [warehouses]
  );

  const defaultFromId = initialFromWarehouseId
    ? Number(initialFromWarehouseId)
    : activeWarehouses[0]?.id
    ? Number(activeWarehouses[0].id)
    : 0;

  const [fromWarehouseId, setFromWarehouseId] = useState<number>(defaultFromId);

  // Available destination warehouses (excluding source)
  const destinationWarehouses = useMemo(
    () => activeWarehouses.filter((w) => Number(w.id) !== fromWarehouseId),
    [activeWarehouses, fromWarehouseId]
  );

  const [toWarehouseId, setToWarehouseId] = useState<number>(
    destinationWarehouses[0]?.id ? Number(destinationWarehouses[0].id) : 0
  );

  // Inventory available in the selected source warehouse
  const sourceInventoryList = useMemo(
    () => inventory.filter((item) => Number(item.warehouses_id) === fromWarehouseId && item.quantity > 0),
    [inventory, fromWarehouseId]
  );

  const [selectedProductId, setSelectedProductId] = useState<number>(() => {
    if (initialProductId && sourceInventoryList.some((i) => Number(i.product_id) === Number(initialProductId))) {
      return Number(initialProductId);
    }
    return sourceInventoryList[0]?.product_id ? Number(sourceInventoryList[0].product_id) : 0;
  });

  const effectiveToWarehouseId = destinationWarehouses.some((w) => Number(w.id) === toWarehouseId)
    ? toWarehouseId
    : destinationWarehouses[0]?.id
    ? Number(destinationWarehouses[0].id)
    : 0;

  const effectiveProductId = sourceInventoryList.some((i) => Number(i.product_id) === selectedProductId)
    ? selectedProductId
    : sourceInventoryList[0]?.product_id
    ? Number(sourceInventoryList[0].product_id)
    : 0;

  const currentAvailableStock = useMemo(() => {
    const item = sourceInventoryList.find((i) => Number(i.product_id) === effectiveProductId);
    return item ? item.quantity : 0;
  }, [sourceInventoryList, effectiveProductId]);

  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const fromWarehouse = warehouses.find((w) => Number(w.id) === fromWarehouseId);
  const toWarehouse = warehouses.find((w) => Number(w.id) === effectiveToWarehouseId);
  const selectedProduct = products.find((p) => Number(p.id) === effectiveProductId);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!fromWarehouseId || !effectiveToWarehouseId) {
      setError('Please select both origin and destination warehouses.');
      return;
    }
    if (fromWarehouseId === effectiveToWarehouseId) {
      setError('Origin and destination warehouses cannot be the same.');
      return;
    }
    if (!effectiveProductId) {
      setError('Please select a product to transfer.');
      return;
    }
    if (quantity <= 0) {
      setError('Transfer quantity must be at least 1 unit.');
      return;
    }
    if (quantity > currentAvailableStock) {
      setError(`Cannot transfer ${quantity} units. Only ${currentAvailableStock} units available.`);
      return;
    }

    setLoading(true);
    try {
      await transferStock({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: effectiveToWarehouseId,
        product_id: effectiveProductId,
        quantity,
      });

      toast.success(
        `Transferred ${quantity} unit${quantity > 1 ? 's' : ''} of "${selectedProduct?.name || 'Product'}" to ${toWarehouse?.name || 'destination warehouse'}.`,
        'Transfer Complete'
      );
      onSuccess();
      onClose();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Stock transfer failed.';
      setError(msg);
      toast.error(msg, 'Transfer Failed');
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
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
        aria-labelledby="transfer-modal-title"
        className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <UiIcon name="arrow-right-left" size={20} />
            </span>
            <div>
              <h2 id="transfer-modal-title" className="text-lg font-bold text-slate-900">
                Stock Transfer
              </h2>
              <p className="text-xs text-slate-500">
                Move inventory stock between facility warehouses.
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Origin Warehouse (Source)
              </label>
              <select
                aria-label="Origin Warehouse"
                value={fromWarehouseId}
                onChange={(e) => {
                  const newFromId = Number(e.target.value);
                  setFromWarehouseId(newFromId);
                  const validDests = activeWarehouses.filter((w) => Number(w.id) !== newFromId);
                  if (!validDests.some((w) => Number(w.id) === toWarehouseId)) {
                    setToWarehouseId(validDests[0]?.id ? Number(validDests[0].id) : 0);
                  }
                  // reset product selection for this warehouse
                  const newItems = inventory.filter(
                    (i) => Number(i.warehouses_id) === newFromId && i.quantity > 0
                  );
                  setSelectedProductId(newItems[0]?.product_id ? Number(newItems[0].product_id) : 0);
                  setQuantity(1);
                }}
                className={`${selectClass} mt-1`}
              >
                {activeWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Destination Warehouse
              </label>
              <select
                aria-label="Destination Warehouse"
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(Number(e.target.value))}
                className={`${selectClass} mt-1`}
                disabled={destinationWarehouses.length === 0}
              >
                {destinationWarehouses.length === 0 ? (
                  <option value={0}>No other warehouse available</option>
                ) : (
                  destinationWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Product to Transfer
              </label>
              {selectedProductId > 0 && (
                <span className="text-[11px] font-medium text-emerald-700">
                  Available in Origin: {currentAvailableStock} units
                </span>
              )}
            </div>

            {sourceInventoryList.length === 0 ? (
              <div className="mt-1.5 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 p-3 text-center text-xs text-amber-800">
                No products with available stock in {fromWarehouse?.name || 'this warehouse'}.
              </div>
            ) : (
              <select
                aria-label="Product to transfer"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(Number(e.target.value));
                  setQuantity(1);
                }}
                className={`${selectClass} mt-1`}
              >
                {sourceInventoryList.map((item) => {
                  const prod = products.find((p) => Number(p.id) === Number(item.product_id));
                  return (
                    <option key={item.id} value={item.product_id}>
                      {prod ? prod.name : `Product #${item.product_id}`} (Stock: {item.quantity})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="transfer-qty" className="text-xs font-semibold text-slate-700">
                Quantity to Transfer
              </label>
              <span className="text-[11px] text-slate-400">
                Max: {currentAvailableStock}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="transfer-qty"
                type="number"
                min={1}
                max={Math.max(1, currentAvailableStock)}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(currentAvailableStock || 1, Number(e.target.value))))}
                disabled={currentAvailableStock <= 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setQuantity(currentAvailableStock)}
                disabled={currentAvailableStock <= 0}
                className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Transfer All
              </button>
            </div>
          </div>

          {/* Visual Route Flow Summary */}
          {fromWarehouse && toWarehouse && selectedProduct && currentAvailableStock > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Transfer Summary
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 rounded-xl bg-white p-2.5 border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] text-slate-400">From</p>
                  <p className="font-semibold text-slate-800 truncate">{fromWarehouse.name}</p>
                  <p className="text-[10px] text-slate-500">Remaining: {currentAvailableStock - quantity}</p>
                </div>
                <div className="flex flex-col items-center px-1">
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    {quantity} units
                  </span>
                  <UiIcon name="arrow" size={14} className="mt-1 text-emerald-700" />
                </div>
                <div className="flex-1 rounded-xl bg-white p-2.5 border border-emerald-100 shadow-2xs text-right">
                  <p className="text-[10px] text-slate-400">To</p>
                  <p className="font-semibold text-slate-800 truncate">{toWarehouse.name}</p>
                  <p className="text-[10px] text-emerald-700">Incoming: +{quantity}</p>
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || currentAvailableStock <= 0 || destinationWarehouses.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{loading ? 'Transferring...' : 'Execute Transfer'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
