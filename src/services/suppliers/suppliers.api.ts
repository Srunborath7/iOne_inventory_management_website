import { httpClient } from '@/services/http/client';
import type { SuppliersResponse, Suppliers, CreateSuppliersInput, UpdateSuppliersInput } from './type';

export async function getSuppliers(offset = 0, limit = 100): Promise<Suppliers[]> {
  const query = `?offset=${offset}&limit=${limit}`;
  const response = await httpClient.get<Suppliers[] | SuppliersResponse>(`/suppliers${query}`);
  return Array.isArray(response) ? response : response.data;
}

export async function getSuppliersById(id: number | string): Promise<Suppliers> {
  return httpClient.get<Suppliers>(`/suppliers/${id}`);
}

export async function createSuppliers(input: CreateSuppliersInput): Promise<Suppliers> {
  return httpClient.post<Suppliers>('/suppliers', {
    name: input.name.trim(),
    age: input.age,
    gender: input.gender,
    contact: input.contact?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    is_active: input.is_active ?? true,
    note: input.note?.trim() || null,
  });
}

export async function updateSuppliers(id: number | string,input: UpdateSuppliersInput): Promise<Suppliers> {
  const payload: UpdateSuppliersInput = {};
  if (input.name !== undefined) {
    payload.name = input.name === null ? null : input.name.trim();
  }
  if (input.age !== undefined) payload.age = input.age;
  if (input.gender !== undefined) payload.gender = input.gender;
  if (input.contact !== undefined) payload.contact = input.contact?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.address !== undefined) payload.address = input.address?.trim() || null;
  if (input.is_active !== undefined) payload.is_active = input.is_active;
  if (input.note !== undefined) payload.note = input.note?.trim() || null;

  return httpClient.put<Suppliers>(`/suppliers/${id}`, payload);
}

export async function deleteSuppliers(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/suppliers/${id}`);
}
