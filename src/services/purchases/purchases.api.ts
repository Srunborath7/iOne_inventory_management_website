import { httpClient } from '@/services/http/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderItem = {
  id: number;
  product_id: number;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: string | number;
  product?: {
    id: number;
    name: string;
    barcode?: string;
    image_url?: string | null;
  } | null;
};

export type PurchaseOrder = {
  id: number;
  order_number: string;
  supplier_id: number;
  status: string;
  ordered_at: string;
  expected_at?: string | null;
  note?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
};

export type PurchaseReturnItem = {
  id: number;
  product_id: number;
  quantity: number;
  unit_cost: string | number;
  product?: {
    id: number;
    name: string;
    barcode?: string;
    image_url?: string | null;
  } | null;
};

export type PurchaseReturn = {
  id: number;
  return_number: string;
  supplier_id: number;
  purchase_order_id: number | null;
  returned_at: string;
  reason?: string | null;
  created_by?: number | null;
  created_at: string;
  items: PurchaseReturnItem[];
};

// ─── Input Types ──────────────────────────────────────────────────────────────

export type PurchaseOrderItemInput = {
  product_id: number;
  ordered_quantity: number;
  unit_cost: number;
  received_quantity?: number;
};

export type CreatePurchaseOrderInput = {
  order_number: string;
  supplier_id: number;
  items: PurchaseOrderItemInput[];
  status?: string;
  ordered_at?: string | null;
  expected_at?: string | null;
  note?: string | null;
};

export type PurchaseReturnItemInput = {
  product_id: number;
  quantity: number;
  unit_cost: number;
};

export type CreatePurchaseReturnInput = {
  return_number: string;
  supplier_id: number;
  purchase_order_id?: number | null;
  items: PurchaseReturnItemInput[];
  returned_at?: string | null;
  reason?: string | null;
};

// ─── Orders ───────────────────────────────────────────────────────────────────

const ordersPath = '/purchases/orders';
const returnsPath = '/purchases/returns';

export async function getPurchaseOrders(
  params?: { supplier_id?: number; status?: string; offset?: number; limit?: number },
): Promise<PurchaseOrder[]> {
  const sp = new URLSearchParams();
  if (params?.supplier_id) sp.set('supplier_id', String(params.supplier_id));
  if (params?.status) sp.set('status', params.status);
  if (params?.offset !== undefined) sp.set('offset', String(params.offset));
  if (params?.limit !== undefined) sp.set('limit', String(params.limit));
  const query = sp.toString() ? `?${sp.toString()}` : '';
  const res = await httpClient.get<PurchaseOrder[] | { data?: PurchaseOrder[]; items?: PurchaseOrder[] }>(
    `${ordersPath}${query}`,
  );
  return Array.isArray(res) ? res : (res.data ?? res.items ?? []);
}

export async function getPurchaseOrder(orderId: number): Promise<PurchaseOrder> {
  return httpClient.get<PurchaseOrder>(`${ordersPath}/${orderId}`);
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  return httpClient.post<PurchaseOrder>(ordersPath, input);
}

// ─── Returns ──────────────────────────────────────────────────────────────────

export async function getPurchaseReturns(
  params?: { supplier_id?: number; purchase_order_id?: number; offset?: number; limit?: number },
): Promise<PurchaseReturn[]> {
  const sp = new URLSearchParams();
  if (params?.supplier_id) sp.set('supplier_id', String(params.supplier_id));
  if (params?.purchase_order_id) sp.set('purchase_order_id', String(params.purchase_order_id));
  if (params?.offset !== undefined) sp.set('offset', String(params.offset));
  if (params?.limit !== undefined) sp.set('limit', String(params.limit));
  const query = sp.toString() ? `?${sp.toString()}` : '';
  const res = await httpClient.get<PurchaseReturn[] | { data?: PurchaseReturn[]; items?: PurchaseReturn[] }>(
    `${returnsPath}${query}`,
  );
  return Array.isArray(res) ? res : (res.data ?? res.items ?? []);
}

export async function getPurchaseReturn(returnId: number): Promise<PurchaseReturn> {
  return httpClient.get<PurchaseReturn>(`${returnsPath}/${returnId}`);
}

export async function createPurchaseReturn(input: CreatePurchaseReturnInput): Promise<PurchaseReturn> {
  return httpClient.post<PurchaseReturn>(returnsPath, input);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a human-readable order number like PO-20261015-0001 */
export function generateOrderNumber(prefix = 'PO'): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}
