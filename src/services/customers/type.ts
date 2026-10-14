export type Customers = {
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

export type CreateCustomersInput = {
    name: string;
    age: number;
    gender: "male" | "female" | "other";
    contact?: string | null;
    phone?: string | null;
    address?: string | null;
    is_active?: boolean;
    note?: string | null;
};

export type UpdateCustomersInput = {
    name?: string | null;
    age?: number | null;
    gender?: "male" | "female" | "other" | null;
    contact?: string | null;
    phone?: string | null;
    address?: string | null;
    is_active?: boolean | null;
    note?: string | null;
};

export type CustomersResponse = {
    code?: string | number;
    msg?: string;
    data: Customers[];
};
