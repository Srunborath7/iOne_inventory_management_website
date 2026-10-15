import { httpClient } from "@/services/http/client";

import type {
  WarehousesInventory,
  WarehousesInventoryResponse,
  CreateWarehousesInventoryInput,
  CreateWarehouseInventoryInput,
  UpdateWarehousesInventoryInput,
  UpdateWarehouseInventoryInput,
  AdjustStockInput,
  StockTransferInput,
  StockTransferResponse,
  WarehouseInventoryFilterParams,
  WarehouseInventoryMovement,
  CreateWarehouseInventoryMovementInput,
} from "./type";

type WarehouseInventoryMovementEnvelope = {
  data: WarehouseInventoryMovement[];
};

// Get stock movement history
export async function getWarehouseInventoryMovements(): Promise<WarehouseInventoryMovement[]> {
  const response = await httpClient.get<
    WarehouseInventoryMovement[] | WarehouseInventoryMovementEnvelope
  >("/stock-movements");

  return Array.isArray(response) ? response : response.data;
}

// Record a stock movement; the backend should update stock and create its audit row atomically.
export async function createWarehouseInventoryMovement(
  input: CreateWarehouseInventoryMovementInput,
): Promise<WarehouseInventoryMovement> {
  return httpClient.post<WarehouseInventoryMovement>("/stock-movements", {
    ...input,
    product_id: Number(input.product_id),
    warehouse_id: Number(input.warehouse_id),
    quantity_change: Number(input.quantity_change),
  });
}

// Get all warehouse inventory with optional filter parameters or pagination
export async function getWarehousesInventory(
  params?: WarehouseInventoryFilterParams
): Promise<WarehousesInventory[]>;
export async function getWarehousesInventory(
  offset?: number,
  limit?: number
): Promise<WarehousesInventory[]>;
export async function getWarehousesInventory(
  paramsOrOffset?: WarehouseInventoryFilterParams | number,
  maybeLimit?: number
): Promise<WarehousesInventory[]> {
  const queryParams = new URLSearchParams();

  if (typeof paramsOrOffset === "number") {
    queryParams.set("offset", String(paramsOrOffset));
    if (maybeLimit !== undefined) {
      queryParams.set("limit", String(maybeLimit));
    }
  } else if (typeof paramsOrOffset === "object" && paramsOrOffset !== null) {
    if (paramsOrOffset.offset !== undefined) {
      queryParams.set("offset", String(paramsOrOffset.offset));
    }
    if (paramsOrOffset.limit !== undefined) {
      queryParams.set("limit", String(paramsOrOffset.limit));
    }
    if (paramsOrOffset.product_id !== undefined && paramsOrOffset.product_id !== "") {
      queryParams.set("product_id", String(paramsOrOffset.product_id));
    }
    const whId = paramsOrOffset.warehouses_id ?? paramsOrOffset.warehouse_id;
    if (whId !== undefined && whId !== "") {
      queryParams.set("warehouses_id", String(whId));
    }
  }

  const queryStr = queryParams.toString();
  const endpoint = `/warehouses-inventory${queryStr ? `?${queryStr}` : ""}`;
  const response = await httpClient.get<WarehousesInventory[] | WarehousesInventoryResponse>(endpoint);

  return Array.isArray(response) ? response : response.data ?? [];
}

// Get warehouse inventory by ID
export async function getWarehouseInventoryById(
  id: number | string
): Promise<WarehousesInventory> {
  return httpClient.get<WarehousesInventory>(`/warehouses-inventory/${id}`);
}

// Create a warehouse inventory record
export async function createWarehouseInventory(
  input: CreateWarehouseInventoryInput | CreateWarehousesInventoryInput
): Promise<WarehousesInventory> {
  const warehousesId = input.warehouses_id ?? (input as { warehouse_id?: number }).warehouse_id;
  const quantity = input.quantity !== undefined ? Math.max(0, Number(input.quantity)) : 0;

  return httpClient.post<WarehousesInventory>("/warehouses-inventory", {
    product_id: Number(input.product_id),
    warehouses_id: Number(warehousesId),
    quantity,
    is_active: input.is_active ?? true,
  });
}

// Update a warehouse inventory record
export async function updateWarehouseInventory(
  id: number | string,
  input: UpdateWarehouseInventoryInput | UpdateWarehousesInventoryInput
): Promise<WarehousesInventory> {
  const payload: UpdateWarehouseInventoryInput = {};

  if (input.quantity !== undefined) {
    payload.quantity = Math.max(0, Number(input.quantity));
  }
  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return httpClient.put<WarehousesInventory>(`/warehouses-inventory/${id}`, payload);
}

// Delete a warehouse inventory record
export async function deleteWarehouseInventory(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/warehouses-inventory/${id}`);
}

// Adjust stock quantity (+/- delta)
export async function adjustWarehouseInventoryStock(
  input: AdjustStockInput
): Promise<WarehousesInventory>;
export async function adjustWarehouseInventoryStock(
  inventoryId: number | string,
  delta: number
): Promise<WarehousesInventory>;
export async function adjustWarehouseInventoryStock(
  inputOrId: number | string | AdjustStockInput,
  maybeDelta?: number
): Promise<WarehousesInventory> {
  const isInputObj = typeof inputOrId === "object" && inputOrId !== null;
  const inventoryId = isInputObj ? inputOrId.inventory_id : inputOrId;
  const delta = isInputObj ? inputOrId.delta : (maybeDelta ?? 0);

  return httpClient.post<WarehousesInventory>(
    `/warehouses-inventory/${inventoryId}/adjust-stock`,
    { delta: Number(delta) }
  );
}

// Transfer stock between two warehouses
export async function transferStock(
  input: StockTransferInput
): Promise<StockTransferResponse> {
  return httpClient.post<StockTransferResponse>(
    "/warehouses-inventory/transfer",
    {
      from_warehouse_id: Number(input.from_warehouse_id),
      to_warehouse_id: Number(input.to_warehouse_id),
      product_id: Number(input.product_id),
      quantity: Number(input.quantity),
    }
  );
}

// Aliases for consistent naming across conventions
export const getWarehouseInventory = getWarehousesInventory;
export const getWarehousesInventoryById = getWarehouseInventoryById;
export const createWarehousesInventory = createWarehouseInventory;
export const updateWarehousesInventory = updateWarehouseInventory;
export const deleteWarehousesInventory = deleteWarehouseInventory;
export const adjustWarehousesInventoryStock = adjustWarehouseInventoryStock;
