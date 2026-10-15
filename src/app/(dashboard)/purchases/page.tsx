"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  Suspense,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { UiIcon } from "@/components/uiIcon";
import { useToast } from "@/components/toast/ToastContext";
import { getProducts, type Product } from "@/services/products";
import { getSuppliers, type Suppliers } from "@/services/suppliers";
import { getWarehouses, type Warehouses } from "@/services/warehouses";
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getPurchaseReturns,
  getPurchaseReturn,
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  markPurchaseOrderReady,
  receivePurchaseOrder,
  generateOrderNumber,
  type PurchaseOrder,
  type PurchaseReturn,
} from "@/services/purchases";

// ─── Constants ─────────────────────────────────────────────────────────────────

type ActiveTab = "orders" | "returns";

type OrderLine = {
  key: number;
  productId: string;
  quantity: string;
  unitCost: string;
};
type ReturnLine = {
  key: number;
  purchaseOrderItemId?: number;
  productId: string;
  quantity: string;
  unitCost: string;
  reason: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50 disabled:text-slate-400";

const statusMeta: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  ready: {
    label: "Ready",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  partially_received: {
    label: "Partially received",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  received: {
    label: "Received",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  partial: {
    label: "Partial",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

function StatusBadge({ status }: { status?: string }) {
  const meta = statusMeta[status?.toLowerCase() ?? ""] ?? {
    label: status ?? "—",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Compute order total from items */
function orderTotal(items?: PurchaseOrder["items"]): number {
  if (!items) return 0;
  return items.reduce(
    (s, i) => s + i.ordered_quantity * Number(i.unit_cost),
    0,
  );
}

function returnTotal(items?: PurchaseReturn["items"]): number {
  if (!items) return 0;
  return items.reduce((s, i) => s + i.quantity * Number(i.unit_cost), 0);
}

// ─── Order Detail Modal ──────────────────────────────────────────────────────

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: number | null;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    getPurchaseOrder(orderId)
      .then(setOrder)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load order."),
      )
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-modal animate-fade-in relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20">
              <UiIcon name="package" size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Purchase Order
              </p>
              <h2 className="text-base font-extrabold text-slate-900">
                {order?.order_number ? `${order.order_number}` : `#${orderId}`}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : order ? (
            <div className="space-y-5">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {order.supplier_name ?? `#${order.supplier_id}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Warehouse
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {order.warehouse_name ?? `#${order.warehouse_id}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ordered At
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {fmtDate(order.ordered_at)}
                  </p>
                </div>
              </div>

              {/* Items */}
              {order.items && order.items.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/80">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Cost</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">
                              Product #{item.product_id}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {item.ordered_quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {fmt(Number(item.unit_cost))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                            {fmt(
                              item.ordered_quantity * Number(item.unit_cost),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total & notes */}
              <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
                <span className="text-sm font-semibold text-slate-700">
                  Total Amount
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-emerald-700">
                  {fmt(orderTotal(order.items))}
                </span>
              </div>

              {order.note && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Note
                  </p>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {order.note}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Return Detail Modal ─────────────────────────────────────────────────────

function ReturnDetailModal({
  returnId,
  onClose,
}: {
  returnId: number | null;
  onClose: () => void;
}) {
  const [ret, setRet] = useState<PurchaseReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!returnId) return;
    setLoading(true);
    setError("");
    getPurchaseReturn(returnId)
      .then(setRet)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load return."),
      )
      .finally(() => setLoading(false));
  }, [returnId]);

  if (!returnId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-modal animate-fade-in relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-md shadow-rose-600/20">
              <UiIcon name="arrow-right-left" size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                Purchase Return
              </p>
              <h2 className="text-base font-extrabold text-slate-900">
                {ret?.return_number ?? `#${returnId}`}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : ret ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {ret.supplier_name ?? `#${ret.supplier_id}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Linked Order
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {ret.purchase_order_id ? `#${ret.purchase_order_id}` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Returned At
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800">
                    {fmtDate(ret.returned_at)}
                  </p>
                </div>
              </div>

              {ret.items && ret.items.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/80">
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ret.items.map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            Product #{item.product_id}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                            {fmt(Number(item.unit_cost))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-rose-700">
                            {fmt(item.quantity * Number(item.unit_cost))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-4">
                <span className="text-sm font-semibold text-slate-700">
                  Total Refund
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-rose-700">
                  {fmt(returnTotal(ret.items))}
                </span>
              </div>

              {ret.reason && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Reason
                  </p>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {ret.reason}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Order Modal ──────────────────────────────────────────────────────

function CreateOrderModal({
  isOpen,
  editingOrder,
  suppliers,
  warehouses,
  products,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  editingOrder: PurchaseOrder | null;
  suppliers: Suppliers[];
  warehouses: Warehouses[];
  products: Product[];
  onClose: () => void;
  onSuccess: (order: PurchaseOrder) => void;
}) {
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([
    { key: 1, productId: "", quantity: "1", unitCost: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!editingOrder) {
      setSupplierId("");
      setWarehouseId("");
      setNote("");
      setLines([{ key: 1, productId: "", quantity: "1", unitCost: "" }]);
      setNextKey(2);
      return;
    }
    setSupplierId(String(editingOrder.supplier_id));
    setWarehouseId(String(editingOrder.warehouse_id));
    setNote(editingOrder.note ?? "");
    setLines(
      editingOrder.items.map((item, index) => ({
        key: index + 1,
        productId: String(item.product_id),
        quantity: String(item.ordered_quantity),
        unitCost: String(item.unit_cost),
      })),
    );
    setNextKey(editingOrder.items.length + 1);
  }, [isOpen, editingOrder]);

  const total = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [lines],
  );

  function reset() {
    setSupplierId("");
    setWarehouseId("");
    setNote("");
    setLines([{ key: 1, productId: "", quantity: "1", unitCost: "" }]);
    setNextKey(2);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function updateLine(key: number, updates: Partial<OrderLine>) {
    setLines((cur) =>
      cur.map((l) => (l.key === key ? { ...l, ...updates } : l)),
    );
  }

  function selectProduct(key: number, productId: string) {
    const product = products.find((p) => String(p.id) === productId);
    updateLine(key, {
      productId,
      unitCost: product ? String(product.cost_price ?? 0) : "",
    });
  }

  function addLine() {
    setLines((cur) => [
      ...cur,
      { key: nextKey, productId: "", quantity: "1", unitCost: "" },
    ]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    setLines((cur) =>
      cur.length > 1 ? cur.filter((l) => l.key !== key) : cur,
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplierId || !warehouseId) {
      toast.error("Choose a supplier and destination warehouse.");
      return;
    }
    const validLines = lines.filter(
      (l) => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0,
    );
    if (!validLines.length) {
      toast.error(
        "Add at least one product with valid quantity and unit cost.",
      );
      return;
    }
    setSaving(true);
    try {
      const input = {
        order_number: editingOrder?.order_number ?? generateOrderNumber("PO"),
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        items: validLines.map((l) => ({
          product_id: Number(l.productId),
          ordered_quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost),
        })),
        note: note.trim() || null,
      };
      const order = editingOrder
        ? await updatePurchaseOrder(editingOrder.id, input)
        : await createPurchaseOrder(input);
      toast.success(
        editingOrder
          ? `Order ${order.order_number} updated.`
          : `Order ${order.order_number} created.`,
      );
      onSuccess(order);
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create order.",
        "Order failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="glass-modal animate-fade-in relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20">
              <UiIcon name="plus" size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Procurement
              </p>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingOrder ? "Edit Purchase Order" : "Create Purchase Order"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
            {/* Supplier */}
            <div>
              <label
                htmlFor="co-supplier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                id="co-supplier"
                className={inputClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="co-warehouse"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Destination Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                id="co-warehouse"
                className={inputClass}
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">Select a warehouse</option>
                {warehouses
                  .filter((warehouse) => warehouse.is_active !== false)
                  .map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800">
                  Order Items
                </h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <UiIcon name="plus" size={13} /> Add Product
                </button>
              </div>
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const lineTotal =
                    (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
                  return (
                    <div
                      key={line.key}
                      className="grid grid-cols-[minmax(0,1fr)_90px_130px_80px_36px] gap-2 items-end rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Product {idx + 1}
                        </label>
                        <select
                          className={inputClass}
                          value={line.productId}
                          onChange={(e) =>
                            selectProduct(line.key, e.target.value)
                          }
                          required
                        >
                          <option value="">Select</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Qty
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Unit Cost
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(line.key, { unitCost: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="pb-1 text-sm font-bold tabular-nums text-emerald-700 text-right">
                        {fmt(lineTotal)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <UiIcon name="trash" size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="co-note"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Note{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="co-note"
                className={`${inputClass} min-h-20 resize-y`}
                placeholder="Delivery instructions or other details…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <div className="text-sm">
              <span className="text-slate-500">Total: </span>
              <span className="text-xl font-extrabold text-slate-900">
                {fmt(total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <UiIcon name="check" size={16} />
                    {editingOrder ? "Save Changes" : "Create Order"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Receive Purchase Order Modal ────────────────────────────────────────────

function ReceiveOrderModal({
  order,
  onClose,
  onSuccess,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onSuccess: (order: PurchaseOrder) => void;
}) {
  const toast = useToast();
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = order.items
      .map((item) => ({
        item_id: item.id,
        quantity: Number(quantities[item.id]) || 0,
      }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      toast.error("Enter at least one received quantity.");
      return;
    }
    const overReceived = items.some((received) => {
      const item = order.items.find(
        (candidate) => candidate.id === received.item_id,
      );
      return (
        !item ||
        received.quantity > item.ordered_quantity - item.received_quantity
      );
    });
    if (overReceived) {
      toast.error(
        "Received quantities cannot exceed the outstanding quantities.",
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await receivePurchaseOrder(order.id, { items });
      toast.success(`Received quantities recorded for ${order.order_number}.`);
      onSuccess(updated);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not record received quantities.",
        "Receive failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-order-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-modal relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Warehouse receiving
          </p>
          <h2
            id="receive-order-title"
            className="mt-1 text-lg font-extrabold text-slate-900"
          >
            Receive {order.order_number}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the quantities received for this order. Stock will be added to
            its destination warehouse.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5">
            {order.items.map((item) => {
              const outstanding = Math.max(
                0,
                item.ordered_quantity - item.received_quantity,
              );
              return (
                <label
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {item.product?.name ?? `Product #${item.product_id}`}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {item.received_quantity} received · {outstanding}{" "}
                      outstanding
                    </span>
                  </span>
                  <input
                    aria-label={`Received quantity for ${item.product?.name ?? `product ${item.product_id}`}`}
                    className={inputClass}
                    type="number"
                    min="0"
                    max={outstanding}
                    step="1"
                    placeholder="0"
                    value={quantities[item.id] ?? ""}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Record received stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Return Modal ──────────────────────────────────────────────────────

function CreateReturnModal({
  isOpen,
  editingReturn,
  suppliers,
  products,
  orders,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  editingReturn: PurchaseReturn | null;
  suppliers: Suppliers[];
  products: Product[];
  orders: PurchaseOrder[];
  onClose: () => void;
  onSuccess: (ret: PurchaseReturn) => void;
}) {
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([
    { key: 1, productId: "", quantity: "1", unitCost: "", reason: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!editingReturn) {
      setSupplierId("");
      setOrderId("");
      setReason("");
      setLines([{ key: 1, productId: "", quantity: "1", unitCost: "", reason: "" }]);
      setNextKey(2);
      return;
    }
    setSupplierId(String(editingReturn.supplier_id));
    setOrderId(editingReturn.purchase_order_id ? String(editingReturn.purchase_order_id) : "");
    setReason(editingReturn.reason ?? "");
    setLines(editingReturn.items.map((item, index) => ({
      key: index + 1,
      purchaseOrderItemId: item.purchase_order_item_id ?? undefined,
      productId: String(item.product_id),
      quantity: String(item.quantity),
      unitCost: String(item.unit_cost),
      reason: "",
    })));
    setNextKey(editingReturn.items.length + 1);
  }, [isOpen, editingReturn]);

  const filteredOrders = useMemo(
    () =>
      supplierId
        ? orders.filter((o) => String(o.supplier_id) === supplierId)
        : orders,
    [orders, supplierId],
  );

  const total = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [lines],
  );

  function reset() {
    setSupplierId("");
    setOrderId("");
    setReason("");
    setLines([
      { key: 1, productId: "", quantity: "1", unitCost: "", reason: "" },
    ]);
    setNextKey(2);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function updateLine(key: number, updates: Partial<ReturnLine>) {
    setLines((cur) =>
      cur.map((l) => (l.key === key ? { ...l, ...updates } : l)),
    );
  }

  function selectProduct(key: number, productId: string) {
    const product = products.find((p) => String(p.id) === productId);
    updateLine(key, {
      productId,
      unitCost: product ? String(product.cost_price ?? 0) : "",
    });
  }

  function addLine() {
    setLines((cur) => [
      ...cur,
      { key: nextKey, productId: "", quantity: "1", unitCost: "", reason: "" },
    ]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    setLines((cur) =>
      cur.length > 1 ? cur.filter((l) => l.key !== key) : cur,
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Choose a supplier.");
      return;
    }
    const validLines = lines.filter(
      (l) => l.productId && Number(l.quantity) > 0,
    );
    if (!validLines.length) {
      toast.error("Add at least one product to return.");
      return;
    }
    setSaving(true);
    try {
      const linkedOrder = orders.find((order) => String(order.id) === orderId);
      const input = {
        return_number: editingReturn?.return_number ?? generateOrderNumber("RTN"),
        supplier_id: Number(supplierId),
        purchase_order_id: orderId ? Number(orderId) : null,
        returned_at: editingReturn?.returned_at ?? new Date().toISOString(),
        items: validLines.map((l) => ({
          purchase_order_item_id:
            l.purchaseOrderItemId ??
            linkedOrder?.items.find((item) => item.product_id === Number(l.productId))?.id ??
            null,
          product_id: Number(l.productId),
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost) || 0,
        })),
        reason: reason.trim() || null,
      };
      const ret = editingReturn
        ? await updatePurchaseReturn(editingReturn.id, input)
        : await createPurchaseReturn(input);
      toast.success(editingReturn ? `Return ${ret.return_number} updated.` : `Return ${ret.return_number} created.`);
      onSuccess(ret);
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create return.",
        "Return failed",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="glass-modal animate-fade-in relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-md shadow-rose-600/20">
              <UiIcon name="arrow-right-left" size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                Returns
              </p>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingReturn ? "Edit Purchase Return" : "Create Purchase Return"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
            {/* Supplier + Order */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cr-supplier"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  id="cr-supplier"
                  className={inputClass}
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setOrderId("");
                  }}
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="cr-order"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Purchase Order{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <select
                  id="cr-order"
                  className={inputClass}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                >
                  <option value="">None / standalone return</option>
                  {filteredOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {fmt(orderTotal(o.items))}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800">
                  Return Items
                </h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <UiIcon name="plus" size={13} /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div
                    key={line.key}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_90px_36px] gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Product {idx + 1}
                        </label>
                        <select
                          className={inputClass}
                          value={line.productId}
                          onChange={(e) =>
                            selectProduct(line.key, e.target.value)
                          }
                          required
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Qty
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: e.target.value })
                          }
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <UiIcon name="trash" size={15} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Reason for return
                      </label>
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="e.g. Damaged goods, wrong item…"
                        value={line.reason}
                        onChange={(e) =>
                          updateLine(line.key, { reason: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="cr-reason"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Reason{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="cr-reason"
                className={`${inputClass} min-h-20 resize-y`}
                placeholder="e.g. Damaged goods, wrong items shipped…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <div className="text-sm">
              <span className="text-slate-500">Est. Refund: </span>
              <span className="text-xl font-extrabold text-rose-700">
                {fmt(total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition hover:from-rose-600 hover:to-orange-600 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <UiIcon name="check" size={16} />
                    {editingReturn ? "Save Changes" : "Create Return"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  loading,
  error,
  search,
  onView,
  onEdit,
  onDelete,
  onReady,
  onReceive,
  busyOrderId,
}: {
  orders: PurchaseOrder[];
  loading: boolean;
  error: string;
  search: string;
  onView: (id: number) => void;
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  onReady: (order: PurchaseOrder) => void;
  onReceive: (order: PurchaseOrder) => void;
  busyOrderId: number | null;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.order_number ?? "").toLowerCase().includes(q) ||
        String(o.supplier_id).includes(q) ||
        (o.status ?? "").toLowerCase().includes(q) ||
        String(o.id).includes(q),
    );
  }, [orders, search]);

  if (loading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
          <UiIcon name="alert-triangle" size={20} />
        </span>
        <p className="mt-2 text-sm font-bold text-rose-900">
          Failed to load orders
        </p>
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center bg-white">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <UiIcon name="package" size={22} />
        </span>
        <p className="mt-3 text-sm font-bold text-slate-800">
          {search ? "No matching orders" : "No purchase orders yet"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {search
            ? "Try a different search term."
            : "Create your first purchase order to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Order #</th>
              <th className="px-5 py-3.5">Supplier</th>
              <th className="px-5 py-3.5">Warehouse</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((order) => (
              <tr key={order.id} className="transition hover:bg-slate-50/60">
                <td className="px-5 py-4">
                  <span className="font-mono font-bold text-slate-800">
                    {order.order_number ?? `#${order.id}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <UiIcon name="truck" size={13} />
                    </span>
                    <span className="font-semibold text-slate-800">
                      {order.supplier_name ?? `Supplier #${order.supplier_id}`}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">
                  {order.warehouse_name ?? `Warehouse #${order.warehouse_id}`}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-900">
                  {fmt(orderTotal(order.items))}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {fmtDate(order.ordered_at)}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    {order.status?.toLowerCase() === "draft" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(order)}
                          title="Edit draft order"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(order)}
                          title="Delete draft order"
                          className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {order.status?.toLowerCase() === "draft" && (
                      <button
                        type="button"
                        onClick={() => onReady(order)}
                        disabled={busyOrderId === order.id}
                        className="rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                      >
                        {busyOrderId === order.id ? "Updating…" : "Mark ready"}
                      </button>
                    )}
                    {["ready", "partially_received"].includes(
                      order.status?.toLowerCase() ?? "",
                    ) && (
                      <button
                        type="button"
                        onClick={() => onReceive(order)}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
                      >
                        Receive
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onView(order.id)}
                      title="View order details"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <UiIcon name="eye" size={13} /> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
        Showing {filtered.length} of {orders.length} orders
      </div>
    </div>
  );
}

// ─── Returns Table ────────────────────────────────────────────────────────────

function ReturnsTable({
  returns,
  loading,
  error,
  search,
  onView,
  onEdit,
  onDelete,
}: {
  returns: PurchaseReturn[];
  loading: boolean;
  error: string;
  search: string;
  onView: (id: number) => void;
  onEdit: (ret: PurchaseReturn) => void;
  onDelete: (ret: PurchaseReturn) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter(
      (r) =>
        (r.return_number ?? "").toLowerCase().includes(q) ||
        String(r.supplier_id).includes(q) ||
        String(r.purchase_order_id ?? "").includes(q) ||
        String(r.id).includes(q),
    );
  }, [returns, search]);

  if (loading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
          <UiIcon name="alert-triangle" size={20} />
        </span>
        <p className="mt-2 text-sm font-bold text-rose-900">
          Failed to load returns
        </p>
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center bg-white">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <UiIcon name="arrow-right-left" size={22} />
        </span>
        <p className="mt-3 text-sm font-bold text-slate-800">
          {search ? "No matching returns" : "No purchase returns yet"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {search
            ? "Try a different search term."
            : "Create a return when sending goods back to a supplier."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Return #</th>
              <th className="px-5 py-3.5">Supplier</th>
              <th className="px-5 py-3.5">Linked Order</th>
              <th className="px-5 py-3.5 text-right">Refund</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((ret) => (
              <tr key={ret.id} className="transition hover:bg-slate-50/60">
                <td className="px-5 py-4">
                  <span className="font-mono font-bold text-slate-800">
                    {ret.return_number ?? `#${ret.id}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                      <UiIcon name="truck" size={13} />
                    </span>
                    <span className="font-semibold text-slate-800">
                      {ret.supplier_name ?? `Supplier #${ret.supplier_id}`}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-slate-500">
                  {ret.purchase_order_id ? `#${ret.purchase_order_id}` : "—"}
                </td>
                <td className="px-5 py-4 text-right font-bold tabular-nums text-rose-700">
                  {fmt(returnTotal(ret.items))}
                </td>
                <td className="px-5 py-4 text-slate-500">
                  {fmtDate(ret.returned_at)}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(ret)}
                      title="Edit purchase return"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ret)}
                      title="Delete purchase return"
                      className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => onView(ret.id)}
                      title="View return details"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <UiIcon name="eye" size={13} /> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
        Showing {filtered.length} of {returns.length} returns
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function PurchasesContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialTab = (
    searchParams.get("tab") === "returns" ? "returns" : "orders"
  ) as ActiveTab;

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [search, setSearch] = useState("");

  // Reference data
  const [suppliers, setSuppliers] = useState<Suppliers[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);

  // Orders
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [, startOrdersTransition] = useTransition();

  // Returns
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [returnsError, setReturnsError] = useState("");
  const [, startReturnsTransition] = useTransition();

  // Modals
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isCreateReturnOpen, setIsCreateReturnOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [viewOrderId, setViewOrderId] = useState<number | null>(null);
  const [viewReturnId, setViewReturnId] = useState<number | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  function fetchOrders() {
    setOrdersLoading(true);
    getPurchaseOrders({ limit: 100 })
      .then((data) => {
        setOrders(data);
        setOrdersError("");
      })
      .catch((e: unknown) =>
        setOrdersError(
          e instanceof Error ? e.message : "Failed to load orders.",
        ),
      )
      .finally(() => setOrdersLoading(false));
  }

  function fetchReturns() {
    setReturnsLoading(true);
    getPurchaseReturns({ limit: 100 })
      .then((data) => {
        setReturns(data);
        setReturnsError("");
      })
      .catch((e: unknown) =>
        setReturnsError(
          e instanceof Error ? e.message : "Failed to load returns.",
        ),
      )
      .finally(() => setReturnsLoading(false));
  }

  useEffect(() => {
    let active = true;
    setSuppliersLoading(true);
    Promise.all([getSuppliers(), getProducts(), getWarehouses()])
      .then(([s, p, w]) => {
        if (!active) return;
        setSuppliers(s.filter((x) => x.is_active !== false));
        setProducts(p.filter((x) => x.is_active));
        setWarehouses(w.filter((x) => x.is_active !== false));
      })
      .finally(() => {
        if (active) setSuppliersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);
  useEffect(() => {
    fetchReturns();
  }, []);

  async function handleMarkReady(order: PurchaseOrder) {
    setBusyOrderId(order.id);
    try {
      const updated = await markPurchaseOrderReady(order.id);
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(`${order.order_number} is ready to receive.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not mark this order ready.",
        "Update failed",
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  function handleReceived(updated: PurchaseOrder) {
    setOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleDeleteOrder(order: PurchaseOrder) {
    toast.confirm(
      `Delete draft purchase order ${order.order_number}? This cannot be undone.`,
      () => {
        void (async () => {
          try {
            await deletePurchaseOrder(order.id);
            setOrders((current) =>
              current.filter((item) => item.id !== order.id),
            );
            toast.success(`Order ${order.order_number} deleted.`);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not delete this order.",
              "Delete failed",
            );
          }
        })();
      },
      "Delete purchase order",
    );
  }

  function handleDeleteReturn(ret: PurchaseReturn) {
    toast.confirm(
      `Delete purchase return ${ret.return_number}? This cannot be undone.`,
      () => {
        void (async () => {
          try {
            await deletePurchaseReturn(ret.id);
            setReturns((current) => current.filter((item) => item.id !== ret.id));
            toast.success(`Return ${ret.return_number} deleted.`);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not delete this return.",
              "Delete failed",
            );
          }
        })();
      },
      "Delete purchase return",
    );
  }

  const totalOrderValue = useMemo(
    () => orders.reduce((s, o) => s + orderTotal(o.items), 0),
    [orders],
  );
  const totalReturnValue = useMemo(
    () => returns.reduce((s, r) => s + returnTotal(r.items), 0),
    [returns],
  );
  const pendingOrders = useMemo(
    () =>
      orders.filter((o) =>
        ["draft", "ready", "partially_received"].includes(
          o.status?.toLowerCase() ?? "",
        ),
      ).length,
    [orders],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Procurement
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Purchase Management
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage purchase orders from suppliers and track return requests.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeTab === "orders" ? (
            <>
              <button
                type="button"
                onClick={() => startOrdersTransition(fetchOrders)}
                title="Refresh orders"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <UiIcon
                  name="refresh"
                  size={16}
                  className={
                    ordersLoading ? "animate-spin text-emerald-600" : ""
                  }
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setIsCreateOrderOpen(true);
                }}
                disabled={suppliersLoading || warehouses.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50"
              >
                <UiIcon name="plus" size={16} />
                New Order
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startReturnsTransition(fetchReturns)}
                title="Refresh returns"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <UiIcon
                  name="refresh"
                  size={16}
                  className={returnsLoading ? "animate-spin text-rose-600" : ""}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingReturn(null);
                  setIsCreateReturnOpen(true);
                }}
                disabled={suppliersLoading || orders.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:from-rose-600 hover:to-orange-600 active:scale-95 disabled:opacity-50"
              >
                <UiIcon name="arrow-right-left" size={16} />
                New Return
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs card-hover-lift">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Orders
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {orders.length}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              Lifetime
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs card-hover-lift">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Open orders
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              {pendingOrders}
            </span>
            <span className="text-[11px] text-slate-500">orders</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs card-hover-lift">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Orders Value
          </span>
          <div className="mt-1.5">
            <span className="text-lg font-black text-slate-900">
              {fmt(totalOrderValue)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs card-hover-lift">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Returns Value
          </span>
          <div className="mt-1.5">
            <span className="text-lg font-black text-rose-700">
              {fmt(totalReturnValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs + Search bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("orders");
              setSearch("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === "orders"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UiIcon name="package" size={14} />
            Orders
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "orders" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
            >
              {orders.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("returns");
              setSearch("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === "returns"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UiIcon name="arrow-right-left" size={14} />
            Returns
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "returns" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}
            >
              {returns.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <label className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 text-slate-400 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 sm:max-w-xs">
          <UiIcon name="search" size={15} />
          <input
            type="text"
            placeholder={
              activeTab === "orders" ? "Search orders…" : "Search returns…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <UiIcon name="x" size={11} />
            </button>
          )}
        </label>
      </div>

      {/* Table */}
      <div className="mt-4 animate-fade-in">
        {activeTab === "orders" ? (
          <OrdersTable
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            search={search}
            onView={(id) => setViewOrderId(id)}
            onEdit={(order) => {
              setEditingOrder(order);
              setIsCreateOrderOpen(true);
            }}
            onDelete={handleDeleteOrder}
            onReady={handleMarkReady}
            onReceive={setReceivingOrder}
            busyOrderId={busyOrderId}
          />
        ) : (
          <ReturnsTable
            returns={returns}
            loading={returnsLoading}
            error={returnsError}
            search={search}
            onView={(id) => setViewReturnId(id)}
            onEdit={(ret) => {
              setEditingReturn(ret);
              setIsCreateReturnOpen(true);
            }}
            onDelete={handleDeleteReturn}
          />
        )}
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        editingOrder={editingOrder}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
        onClose={() => {
          setIsCreateOrderOpen(false);
          setEditingOrder(null);
        }}
        onSuccess={(order) =>
          setOrders((current) =>
            editingOrder
              ? current.map((item) => (item.id === order.id ? order : item))
              : [order, ...current],
          )
        }
      />

      <CreateReturnModal
        isOpen={isCreateReturnOpen}
        editingReturn={editingReturn}
        suppliers={suppliers}
        products={products}
        orders={orders}
        onClose={() => {
          setIsCreateReturnOpen(false);
          setEditingReturn(null);
        }}
        onSuccess={(ret) =>
          setReturns((current) =>
            editingReturn
              ? current.map((item) => (item.id === ret.id ? ret : item))
              : [ret, ...current],
          )
        }
      />

      <OrderDetailModal
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
      />

      {receivingOrder && (
        <ReceiveOrderModal
          key={receivingOrder.id}
          order={receivingOrder}
          onClose={() => setReceivingOrder(null)}
          onSuccess={handleReceived}
        />
      )}

      <ReturnDetailModal
        returnId={viewReturnId}
        onClose={() => setViewReturnId(null)}
      />
    </main>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            Loading purchases…
          </div>
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
