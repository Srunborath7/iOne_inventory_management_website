export type Brand = {
  id: number | string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateBrandInput = {
  name: string;
  description?: string;
  image?: File | null;
};

export type UpdateBrandInput = {
  name?: string;
  description?: string;
  image?: File | null;
};

export type BrandResponse = {
  code?: string | number;
  msg?: string;
  data: Brand[];
};

