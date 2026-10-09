export type Suppliers = {
    id: number | string;
    name: string;
    age: number;
    gender: string;
    contact?: string | null;
    phone?: string | null;
    address?: string | null;
    is_active?: boolean;
    note?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type CreateSuppliersInput = {
    name: string;
    age: number;
    gender: "male" | "female" | "other";
    contact?: string | null;
    phone?: string | null;
    address?: string | null;
    is_active?: boolean;
    note?: string | null;
};

export type UpdateSuppliersInput = {
    name?: string | null;
    age?: number | null;
    gender?: "male" | "female" | "other" | null;
    contact?: string | null;
    phone?: string | null;
    address?: string | null;
    is_active?: boolean | null;
    note?: string | null;
};

export type SuppliersResponse = {
    code?: string | number;
    msg?: string;
    data: Suppliers[];
};
