import type { Category } from '@/services/categories/type';
import type { Brand } from '@/services/brands/type';

export type ProductCreator = {
  id: number | string;
  name?: string;
  full_name?: string;
  email?: string;
};

export type ActivityType =
  | 'create'
  | 'update'
  | 'price_change'
  | 'stock_threshold'
  | 'status_change'
  | 'image_update'
  | 'delete'
  | 'note';

export type ActivityDiff = {
  field: string;
  label?: string;
  old_value?: string | number | boolean | null;
  new_value?: string | number | boolean | null;
};

export type ActivityLog = {
  id: string | number;
  product_id: string | number;
  action: ActivityType;
  title: string;
  description: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  diff?: ActivityDiff[];
};

export type Product = {
  id: number | string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  selling_price: number;
  cost_price: number;
  min_stock: number;
  max_stock: number;
  barcode: string;
  brand_id: number;
  category_id: number;
  is_active: boolean;
  created_by?: number | string | null;
  creator?: ProductCreator | null;
  created_at?: string;
  updated_at?: string;
  category?: Category | null;
  brand?: Brand | null;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  selling_price: number;
  cost_price: number;
  min_stock: number;
  max_stock: number;
  barcode: string;
  brand_id: number;
  category_id: number;
  is_active?: boolean;
  image?: File | null;
};

export type UpdateProductInput = {
  name?: string;
  description?: string;
  selling_price?: number;
  cost_price?: number;
  min_stock?: number;
  max_stock?: number;
  barcode?: string;
  brand_id?: number;
  category_id?: number;
  is_active?: boolean;
  image?: File | null;
};

export type ProductResponse = {
  code?: number | string;
  msg?: string;
  message?: string;
  data: Product[];
  total?: number;
};