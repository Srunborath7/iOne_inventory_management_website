import { httpClient } from "@/services/http/client";

import type {
  WarehousesResponse,
  Warehouses,
  CreateWarehousesInput,
  UpdateWarehousesInput,
} from "./type";

// Get all warehouses
export async function getWarehouses(offset = 0,limit = 100,): Promise<Warehouses[]> {
  const response = await httpClient.get<Warehouses[] | WarehousesResponse>(
    `/warehouses?offset=${offset}&limit=${limit}`,
  );

  return Array.isArray(response) ? response : response.data;
}

// Get warehouse by ID
export async function getWarehousesById( id: number | string): Promise<Warehouses> {
  return httpClient.get<Warehouses>(`/warehouses/${id}`);
}

// Create a warehouse
export async function createWarehouses( input: CreateWarehousesInput): Promise<Warehouses> {
  return httpClient.post<Warehouses>("/warehouses", {
    name: input.name.trim(),
    code: input.code.trim(),
    address: input.address.trim(),
    description: input.description?.trim() || null,
    is_active: input.is_active ?? true,
  });
}

// Update a warehouse
export async function updateWarehouses( id: number | string, input: UpdateWarehousesInput,): Promise<Warehouses> {
  const payload: UpdateWarehousesInput = {};

  if (input.name !== undefined) {
    payload.name = input.name.trim();
  }

  if (input.code !== undefined) {
    payload.code = input.code.trim();
  }

  if (input.address !== undefined) {
    payload.address = input.address.trim();
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return httpClient.put<Warehouses>(`/warehouses/${id}`, payload);
}

// Delete a warehouse
export async function deleteWarehouses(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/warehouses/${id}`);
}
