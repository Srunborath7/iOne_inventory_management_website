export type Warehouses = {
  id: number | string;
  name: string;
  code: string;
  address: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateWarehousesInput = {
  name: string;
  code: string;
  address: string;
  description?: string | null;
  is_active?: boolean;
};

export type UpdateWarehousesInput = {
  name?: string;
  code?: string;
  address?: string;
  description?: string | null;
  is_active?: boolean;
};

export type WarehousesResponse = {
  code?: string | number;
  msg?: string;
  data: Warehouses[];
};

export type Warehouse = Warehouses;
export type CreateWarehouseInput = CreateWarehousesInput;
export type UpdateWarehouseInput = UpdateWarehousesInput;