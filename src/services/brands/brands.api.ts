import { httpClient } from '@/services/http/client';
import type { BrandResponse, Brand, CreateBrandInput, UpdateBrandInput } from './type';

export async function getBrands(offset = 0, limit = 100): Promise<Brand[]> {
  const query = `?offset=${offset}&limit=${limit}`;
  const response = await httpClient.get<Brand[] | BrandResponse>(`/brands${query}`);
  return Array.isArray(response) ? response : response.data;
}

export async function getBrandById(id: number | string): Promise<Brand> {
  return httpClient.get<Brand>(`/brands/${id}`);
}

export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  if (input.description && input.description.trim()) {
    formData.append('description', input.description.trim());
  }
  if (input.image) {
    formData.append('image', input.image);
  }

  return httpClient.post<Brand>('/brands', formData);
}

export async function updateBrand(id: number | string, input: UpdateBrandInput): Promise<Brand> {
  const formData = new FormData();
  if (input.name !== undefined && input.name.trim()) {
    formData.append('name', input.name.trim());
  }
  if (input.description !== undefined) {
    formData.append('description', input.description ? input.description.trim() : '');
  }
  if (input.image) {
    formData.append('image', input.image);
  }

  return httpClient.put<Brand>(`/brands/${id}`, formData);
}

export async function deleteBrand(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/brands/${id}`);
}

export function getBrandImageUrl(path?: string | null): string | null {
  if (!path) return null;
  // Preserve absolute public Supabase URLs exactly as returned by the API.
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}
