export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  created_at?: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
};

