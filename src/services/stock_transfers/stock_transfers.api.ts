import { httpClient } from "@/services/http/client";

import type {
  StockTransfer,
  StockTransferResponse,
  StockTransferListResponse,
  CreateStockTransferInput,
  StockTransferFilterParams,
} from "./type";

// ─── GET /stock-transfers ────────────────────────────────────────────────────

/**
 * Fetch all stock transfer records, with optional filters / pagination.
 */
export async function getStockTransfers(
  params?: StockTransferFilterParams
): Promise<StockTransfer[]> {
  const qs = new URLSearchParams();

  if (params) {
    if (params.from_warehouse_id !== undefined && params.from_warehouse_id !== "")
      qs.set("from_warehouse_id", String(params.from_warehouse_id));
    if (params.to_warehouse_id !== undefined && params.to_warehouse_id !== "")
      qs.set("to_warehouse_id", String(params.to_warehouse_id));
    if (params.product_id !== undefined && params.product_id !== "")
      qs.set("product_id", String(params.product_id));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
  }

  const endpoint = `/stock-transfers${qs.toString() ? `?${qs}` : ""}`;
  const response = await httpClient.get<StockTransfer[] | StockTransferListResponse>(endpoint);

  return Array.isArray(response) ? response : (response.data ?? []);
}

// ─── GET /stock-transfers/:id ────────────────────────────────────────────────

/**
 * Fetch a single stock transfer record by its ID.
 */
export async function getStockTransferById(
  id: number | string
): Promise<StockTransfer> {
  return httpClient.get<StockTransfer>(`/stock-transfers/${id}`);
}

// ─── POST /stock-transfers ───────────────────────────────────────────────────

/**
 * Create (execute) a stock transfer between two warehouses.
 * This is the primary entry-point used by the StockTransferModal.
 */
export async function createStockTransfer(
  input: CreateStockTransferInput
): Promise<StockTransferResponse> {
  return httpClient.post<StockTransferResponse>("/stock-transfers", {
    from_warehouse_id: Number(input.from_warehouse_id),
    to_warehouse_id: Number(input.to_warehouse_id),
    product_id: Number(input.product_id),
    quantity: Number(input.quantity),
    ...(input.note !== undefined ? { note: input.note } : {}),
  });
}

// ─── Convenience alias ───────────────────────────────────────────────────────

/** Alias matching the existing `transferStock` call-signature used in StockTransferModal. */
export const transferStock = createStockTransfer;
