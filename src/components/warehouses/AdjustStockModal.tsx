'use client';

import { useState, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import type { WarehousesInventory } from '@/services/warehouses_inventory';
import type { Product } from '@/services/products/type';
import type { Warehouses } from '@/services/warehouses';
import { adjustWarehouseInventoryStock } from '@/services/warehouses_inventory';
import { useToast } from '@/components/toast/ToastContext';

interface AdjustStockModalProps {
  isOpen: boolean;
  inventoryItem: WarehousesInventory | null;
  product?: Product | null;
  warehouse?: Warehouses | null;
  onClose: () => void;
  onSuccess: (updated: WarehousesInventory) => void;
}

export default function AdjustStockModal({
  isOpen,
  inventoryItem,
  product,
  warehouse,
  onClose,
  onSuccess,
}: AdjustStockModalProps) {
  const toast = useToast();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !inventoryItem) return null;

  const currentQuantity = inventoryItem.quantity;
  const delta = adjustmentType === 'add' ? amount : -amount;
  const newCalculatedQuantity = Math.max(0, currentQuantity + delta);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inventoryItem) return;
    setError('');

    if (amount <= 0) {
      setError('Adjustment amount must be at least 1 unit.');
      return;
    }

    if (adjustmentType === 'deduct' && amount > currentQuantity) {
      setError(`Cannot deduct ${amount} units. Current stock is only ${currentQuantity} units.`);
      return;
    }

    setLoading(true);
    try {
      const updated = await adjustWarehouseInventoryStock(inventoryItem.id, delta);
      toast.success(
        `Stock for "${product?.name || 'Product'}" updated: ${currentQuantity} → ${updated.quantity} units.`,
        'Stock Adjusted'
      );
      onSuccess(updated);
      onClose();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Could not adjust stock.';
      setError(msg);
      toast.error(msg, 'Adjustment Failed');
    } finally {
      setLoading(false);
    }
  }

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
        aria-labelledby="adjust-stock-title"
        className="my-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <UiIcon name="refresh" size={20} />
            </span>
            <div>
              <h2 id="adjust-stock-title" className="text-lg font-bold text-slate-900">
                Adjust Warehouse Stock
              </h2>
              <p className="text-xs text-slate-500">
                {warehouse?.name || 'Facility'} &bull; {product?.name || `Product #${inventoryItem.product_id}`}
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
          {/* Current Stock Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Current Stock</p>
              <p className="text-xl font-extrabold text-slate-900">{currentQuantity} units</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">New Resulting Stock</p>
              <p className={`text-xl font-extrabold ${newCalculatedQuantity > currentQuantity ? 'text-emerald-700' : newCalculatedQuantity < currentQuantity ? 'text-amber-700' : 'text-slate-900'}`}>
                {newCalculatedQuantity} units
              </p>
            </div>
          </div>

          {/* Action Type Toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Adjustment Action</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  adjustmentType === 'add'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UiIcon name="plus" size={14} />
                <span>Add Units (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('deduct')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  adjustmentType === 'deduct'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>&minus; Deduct Units (&minus;)</span>
              </button>
            </div>
          </div>

          {/* Quantity Amount */}
          <div>
            <label htmlFor="adjust-amount" className="text-xs font-semibold text-slate-700">
              Units to {adjustmentType === 'add' ? 'Add' : 'Deduct'}
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="adjust-amount"
                type="number"
                min={1}
                max={adjustmentType === 'deduct' ? currentQuantity : undefined}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-extrabold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
              <div className="flex gap-1.5">
                {[5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
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
              disabled={loading || (adjustmentType === 'deduct' && currentQuantity === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{loading ? 'Updating...' : 'Confirm Stock Adjustment'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
