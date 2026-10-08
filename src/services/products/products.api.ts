import { httpClient } from '@/services/http/client';
import type { Product, ProductResponse, CreateProductInput, UpdateProductInput } from './type';

export async function getProducts(offset = 0, limit = 100): Promise<Product[]> {
  // The API rejects page sizes above 100.
  const query = `?offset=${Math.max(0, offset)}&limit=${Math.min(100, Math.max(1, limit))}`;
  const response = await httpClient.get<Product[] | ProductResponse>(`/products${query}`);
  return Array.isArray(response) ? response : response.data;
}

export async function getProductById(id: number | string): Promise<Product> {
  return httpClient.get<Product>(`/products/${id}`);
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  if (input.description !== undefined && input.description !== null) {
    formData.append('description', input.description.trim());
  }
  formData.append('selling_price', String(input.selling_price));
  formData.append('cost_price', String(input.cost_price));
  formData.append('min_stock', String(input.min_stock));
  formData.append('max_stock', String(input.max_stock));
  if (input.barcode) {
    formData.append('barcode', input.barcode.trim());
  }
  if (input.brand_id !== undefined && input.brand_id !== null) {
    formData.append('brand_id', String(input.brand_id));
  }
  if (input.category_id !== undefined && input.category_id !== null) {
    formData.append('category_id', String(input.category_id));
  }
  if (input.is_active !== undefined) {
    formData.append('is_active', String(input.is_active));
  }
  if (input.image) {
    formData.append('image', input.image);
  }

  return httpClient.post<Product>('/products', formData);
}

export async function updateProduct(id: number | string, input: UpdateProductInput): Promise<Product> {
  const formData = new FormData();
  if (input.name !== undefined && input.name.trim()) {
    formData.append('name', input.name.trim());
  }
  if (input.description !== undefined) {
    formData.append('description', input.description ? input.description.trim() : '');
  }
  if (input.selling_price !== undefined) {
    formData.append('selling_price', String(input.selling_price));
  }
  if (input.cost_price !== undefined) {
    formData.append('cost_price', String(input.cost_price));
  }
  if (input.min_stock !== undefined) {
    formData.append('min_stock', String(input.min_stock));
  }
  if (input.max_stock !== undefined) {
    formData.append('max_stock', String(input.max_stock));
  }
  if (input.barcode !== undefined) {
    formData.append('barcode', input.barcode.trim());
  }
  if (input.brand_id !== undefined) {
    formData.append('brand_id', String(input.brand_id));
  }
  if (input.category_id !== undefined) {
    formData.append('category_id', String(input.category_id));
  }
  if (input.is_active !== undefined) {
    formData.append('is_active', String(input.is_active));
  }
  if (input.image) {
    formData.append('image', input.image);
  }

  return httpClient.put<Product>(`/products/${id}`, formData);
}

export async function deleteProduct(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/products/${id}`);
}

export function getProductImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}
