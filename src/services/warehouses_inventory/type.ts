export type WarehousesInventory = {
  id: number | string;
  product_id: number;
  warehouses_id: number;
  quantity: number;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

/** A single stock movement returned by the warehouse inventory movement API. */
export type WarehouseInventoryMovement = {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity_change: number;
  movement_type: string;
  reference: string;
  user_id: number;
  created_at: string;
};

export type WarehouseInventoryMovementType =
  | 'received'
  | 'sold'
  | 'adjusted'
  | 'returned';

export type CreateWarehouseInventoryMovementInput = {
  product_id: number;
  warehouse_id: number;
  quantity_change: number;
  movement_type: WarehouseInventoryMovementType;
  reference: string;
};

export type WarehouseInventoryMovementResponse = WarehouseInventoryMovement[];

export type CreateWarehousesInventoryInput = {
  product_id: number;
  warehouses_id: number;
  warehouse_id?: number;
  quantity?: number; // defaults to 0, must be >= 0
  is_active?: boolean; // defaults to true
};

export type UpdateWarehousesInventoryInput = {
  quantity?: number; // must be >= 0
  is_active?: boolean;
};

export type AdjustStockInput = {
  inventory_id: number | string;
  delta: number; // positive to add (+), negative to deduct (-)
};

export type StockTransferInput = {
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number; // must be > 0
};

export type StockTransferResult = {
  source_inventory: WarehousesInventory;
  destination_inventory: WarehousesInventory;
  transferred_quantity: number;
};

export type StockTransferResponse = {
  code?: string | number;
  msg?: string;
  data?: StockTransferResult;
  source_inventory?: WarehousesInventory;
  destination_inventory?: WarehousesInventory;
  transferred_quantity?: number;
};

export type WarehousesInventoryResponse = {
  code?: string | number;
  msg?: string;
  data: WarehousesInventory[];
};

export type WarehouseInventoryFilterParams = {
  product_id?: number | string;
  warehouses_id?: number | string;
  warehouse_id?: number | string;
  offset?: number;
  limit?: number;
};

// Singular & plural aliases for API consistency
export type WarehouseInventory = WarehousesInventory;
export type CreateWarehouseInventoryInput = CreateWarehousesInventoryInput;
export type UpdateWarehouseInventoryInput = UpdateWarehousesInventoryInput;
export type WarehouseInventoryResponse = WarehousesInventoryResponse;
export type WarehousesInventoryFilterParams = WarehouseInventoryFilterParams;
