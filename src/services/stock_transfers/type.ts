// ─── Stock Transfer Types ────────────────────────────────────────────────────

export type StockTransfer = {
  id: number | string;
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number;
  note?: string | null;
  status?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateStockTransferInput = {
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number; // must be > 0
  note?: string | null;
};

export type StockTransferResult = {
  source_inventory?: {
    id: number | string;
    warehouses_id: number;
    product_id: number;
    quantity: number;
  };
  destination_inventory?: {
    id: number | string;
    warehouses_id: number;
    product_id: number;
    quantity: number;
  };
  transferred_quantity?: number;
  transfer?: StockTransfer;
};

export type StockTransferResponse = {
  code?: string | number;
  msg?: string;
  data?: StockTransferResult | StockTransfer;
};

export type StockTransferListResponse = {
  code?: string | number;
  msg?: string;
  data: StockTransfer[];
};

export type StockTransferFilterParams = {
  from_warehouse_id?: number | string;
  to_warehouse_id?: number | string;
  product_id?: number | string;
  offset?: number;
  limit?: number;
};
