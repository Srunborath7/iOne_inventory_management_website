'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import { getProducts, type Product } from '@/services/products';
import { getWarehouses, type Warehouses } from '@/services/warehouses';
import {
  createWarehouseInventoryMovement,
  getWarehouseInventoryMovements,
  type CreateWarehouseInventoryMovementInput,
  type WarehouseInventoryMovement,
  type WarehouseInventoryMovementType,
} from '@/services/warehouses_inventory';
import { formatDate } from '@/lib/format_date';
import { useToast } from '@/components/toast/ToastContext';

type DateRange = 'all' | '7' | '30';

export default function StockMovementsPage() {
  const toast = useToast();
  const [movements, setMovements] = useState<WarehouseInventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movementType, setMovementType] = useState<WarehouseInventoryMovementType>('received');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('increase');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [movementRows, productRows, warehouseRows] = await Promise.all([
        getWarehouseInventoryMovements(),
        getProducts().catch(() => []),
        getWarehouses().catch(() => []),
      ]);
      setMovements(movementRows);
      setProducts(productRows);
      setWarehouses(warehouseRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load stock movements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const enteredQuantity = Number(quantity);
    if (!productId || !warehouseId) {
      setFormError('Select a product and warehouse.');
      return;
    }
    if (!Number.isInteger(enteredQuantity) || enteredQuantity <= 0) {
      setFormError('Quantity must be a positive whole number.');
      return;
    }

    const isDecrease = movementType === 'sold'
      || (movementType === 'adjusted' && adjustmentDirection === 'decrease');
    const quantityChange = isDecrease ? -enteredQuantity : enteredQuantity;
    const payload: CreateWarehouseInventoryMovementInput = {
      product_id: Number(productId),
      warehouse_id: Number(warehouseId),
      quantity_change: quantityChange,
      movement_type: movementType,
      reference: reference.trim(),
    };

    setSaving(true);
    try {
      await createWarehouseInventoryMovement(payload);
      setIsCreateOpen(false);
      setQuantity('');
      setReference('');
      toast.success('Stock movement recorded.');
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not record stock movement.';
      setFormError(message);
      toast.error(message, 'Movement failed');
    } finally {
      setSaving(false);
    }
  }

  const productNames = useMemo(
    () => new Map(products.map((product) => [String(product.id), product.name])),
    [products],
  );
  const warehouseNames = useMemo(
    () => new Map(warehouses.map((warehouse) => [String(warehouse.id), warehouse.name])),
    [warehouses],
  );
  const movementTypes = useMemo(
    () => [...new Set(movements.map((movement) => movement.movement_type))].sort(),
    [movements],
  );

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = dateRange === 'all' ? 0 : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;
    return movements
      .filter((movement) => {
        if (typeFilter !== 'all' && movement.movement_type !== typeFilter) return false;
        if (cutoff && new Date(movement.created_at).getTime() < cutoff) return false;
        if (!query) return true;
        const haystack = [
          productNames.get(String(movement.product_id)),
          warehouseNames.get(String(movement.warehouse_id)),
          movement.reference,
          movement.movement_type,
          movement.user_id,
          movement.product_id,
          movement.warehouse_id,
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [movements, search, typeFilter, dateRange, productNames, warehouseNames]);

  const totals = useMemo(() => movements.reduce(
    (result, movement) => {
      if (movement.quantity_change > 0) result.received += movement.quantity_change;
      if (movement.quantity_change < 0) result.issued += Math.abs(movement.quantity_change);
      result.net += movement.quantity_change;
      return result;
    },
    { received: 0, issued: 0, net: 0 },
  ), [movements]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Warehouse operations</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Stock Movements</h1>
          <p className="mt-1 text-sm text-slate-500">Review stock received, issued, and adjusted across warehouses.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIsCreateOpen(true)} disabled={!products.length || !warehouses.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            <UiIcon name="plus" size={16} /> Record movement
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <UiIcon name="refresh" size={16} /> Refresh
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Units received', value: totals.received, color: 'text-emerald-700' },
          { label: 'Units issued', value: totals.issued, color: 'text-rose-700' },
          { label: 'Net stock change', value: totals.net, color: 'text-slate-900' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-emerald-500 sm:max-w-md">
          <UiIcon name="search" size={16} />
          <input aria-label="Search stock movements" placeholder="Search product, warehouse, reference…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none" />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter movement type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">All movement types</option>
            {movementTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
          </select>
          <select aria-label="Filter by date" value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-12 text-center text-sm text-slate-500">Loading stock movements…</p>
        ) : error ? (
          <div className="p-12 text-center">
            <p role="alert" className="text-sm text-rose-700">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
          </div>
        ) : filteredMovements.length === 0 ? (
          <p className="p-12 text-center text-sm text-slate-500">{movements.length ? 'No movements match these filters.' : 'No stock movements found.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Warehouse</th>
                  <th className="px-5 py-3">Movement</th>
                  <th className="px-5 py-3 text-right">Quantity change</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(movement.created_at)}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{productNames.get(String(movement.product_id)) ?? `Product #${movement.product_id}`}</td>
                    <td className="px-5 py-4 text-slate-600">{warehouseNames.get(String(movement.warehouse_id)) ?? `Warehouse #${movement.warehouse_id}`}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{movement.movement_type.replaceAll('_', ' ')}</span></td>
                    <td className={`px-5 py-4 text-right font-bold tabular-nums ${movement.quantity_change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change.toLocaleString()}</td>
                    <td className="max-w-52 truncate px-5 py-4 text-slate-600">{movement.reference || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{movement.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {!loading && !error && <p className="mt-3 px-1 text-xs text-slate-500">Showing {filteredMovements.length} of {movements.length} movements</p>}

      {isCreateOpen && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setIsCreateOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="movement-form-title" className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <header className="mb-5 flex items-start justify-between">
              <div>
                <h2 id="movement-form-title" className="text-lg font-bold text-slate-900">Record stock movement</h2>
                <p className="mt-1 text-sm text-slate-500">Record stock received, sold, adjusted, or returned.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} disabled={saving} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><UiIcon name="x" size={18} /></button>
            </header>
            {formError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
            <form onSubmit={handleCreateMovement} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Movement type
                <select value={movementType} onChange={(event) => setMovementType(event.target.value as WarehouseInventoryMovementType)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                  <option value="received">Stock received (+)</option>
                  <option value="sold">Stock sold (−)</option>
                  <option value="adjusted">Stock adjusted (+)</option>
                  <option value="returned">Stock returned (+)</option>
                </select>
              </label>
              {movementType === 'adjusted' && (
                <label className="block text-sm font-medium text-slate-700">Adjustment direction
                  <select value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value as 'increase' | 'decrease')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                    <option value="increase">Increase stock (+)</option>
                    <option value="decrease">Decrease stock (−)</option>
                  </select>
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Product
                  <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">Warehouse
                  <select required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">Quantity
                <input required min="1" step="1" type="number" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Enter whole units" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Reference <span className="font-normal text-slate-400">(optional)</span>
                <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" placeholder="Invoice, order, or reason" />
              </label>
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{movementType === 'sold' || (movementType === 'adjusted' && adjustmentDirection === 'decrease') ? 'This reduces the selected product’s stock. The backend should reject it if stock would become negative.' : 'This increases the selected product’s stock.'}</p>
              <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsCreateOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save movement'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
