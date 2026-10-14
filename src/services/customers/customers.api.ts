import { httpClient } from '@/services/http/client';
import type { CustomersResponse, Customers, CreateCustomersInput, UpdateCustomersInput } from './type';

export async function getCustomers(offset = 0, limit = 100): Promise<Customers[]> {
  const query = `?offset=${offset}&limit=${limit}`;
  const response = await httpClient.get<Customers[] | CustomersResponse>(`/customers${query}`);
  return Array.isArray(response) ? response : response.data;
}

export async function getCustomersById(id: number | string): Promise<Customers> {
  return httpClient.get<Customers>(`/customers/${id}`);
}

export async function createCustomers(input: CreateCustomersInput): Promise<Customers> {
  return httpClient.post<Customers>('/customers', {
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

export async function updateCustomers(id: number | string,input: UpdateCustomersInput): Promise<Customers> {
  const payload: UpdateCustomersInput = {};
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

  return httpClient.put<Customers>(`/customers/${id}`, payload);
}

export async function deleteCustomers(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/customers/${id}`);
}
