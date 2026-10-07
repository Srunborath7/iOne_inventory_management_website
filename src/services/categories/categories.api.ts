import { httpClient } from '@/services/http/client';
import type { CategoriesResponse, Category, CreateCategoryInput, UpdateCategoryInput } from './type';

export async function getCategories(offset = 0, limit = 100): Promise<Category[]> {
  const query = `?offset=${offset}&limit=${limit}`;
  const response = await httpClient.get<Category[] | CategoriesResponse>(`/categories${query}`);
  return Array.isArray(response) ? response : response.data;
}

export async function getCategoryById(id: number | string): Promise<Category> {
  return httpClient.get<Category>(`/categories/${id}`);
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const formData = new FormData();
  formData.append('name', input.name.trim());
  if (input.description && input.description.trim()) {
    formData.append('description', input.description.trim());
  }
  if (input.image) {
    formData.append('image', input.image);
  }

  return httpClient.post<Category>('/categories', formData);
}

export async function updateCategory(id: number | string, input: UpdateCategoryInput): Promise<Category> {
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

  return httpClient.put<Category>(`/categories/${id}`, formData);
}

export async function deleteCategory(id: number | string): Promise<void> {
  await httpClient.delete<void>(`/categories/${id}`);
}

export function getCategoryImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
  // Strip trailing '/api/v1' or '/api/v1/' to get base origin:
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

