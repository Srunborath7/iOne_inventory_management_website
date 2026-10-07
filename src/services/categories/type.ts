export type Category = {
  id: number | string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateCategoryInput = {
  name: string;
  description?: string;
  image?: File | null;
};

export type UpdateCategoryInput = {
  name?: string;
  description?: string;
  image?: File | null;
};

export type CategoriesResponse = {
  code?: string | number;
  msg?: string;
  data: Category[];
};

