import { httpClient } from "@/services/http/client";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "./type";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAuthResponse(value: unknown): AuthResponse {
  let current: unknown = value;
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let user: AuthResponse["user"];
  let message: string | undefined;

  // Accept both a direct auth payload and common API envelopes such as { data: ... }.
  for (let depth = 0; depth < 5 && isRecord(current); depth += 1) {
    accessToken ??= [
      current.accessToken,
      current.access_token,
      current.token,
    ].find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0,
    );
    refreshToken ??= [current.refreshToken, current.refresh_token].find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0,
    );
    if (!user && isRecord(current.user))
      user = current.user as AuthResponse["user"];
    message ??= [current.message, current.msg, current.error].find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.length > 0,
    );

    if (accessToken) break;
    current = current.data ?? current.result ?? current.payload;
  }

  if (!accessToken) {
    throw new Error(
      message ??
        "The auth response did not contain an access token. Check the API response format.",
    );
  }

  return { accessToken, refreshToken, user };
}

export async function getMe(): Promise<AuthUser> {
  const data = await httpClient.get<{
    id: number | string;
    full_name: string;
    email: string;
    created_at?: string;
  }>("/auth/me");

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    created_at: data.created_at,
  };
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await httpClient.post<unknown>("/auth/login", payload);
  const normalized = normalizeAuthResponse(response);

  // If the user object wasn't embedded in login response, fetch it via /auth/me
  if (!normalized.user && normalized.accessToken) {
    try {
      const me = await httpClient.get<{
        id: number | string;
        full_name: string;
        email: string;
        created_at?: string;
      }>("/auth/me", {
        headers: { Authorization: `Bearer ${normalized.accessToken}` },
      });
      normalized.user = {
        id: me.id,
        name: me.full_name,
        email: me.email,
        created_at: me.created_at,
      };
    } catch {
      // Fallback if /auth/me fails: extrapolate name from email
      normalized.user = {
        id: "1",
        name: payload.email.split("@")[0],
        email: payload.email,
      };
    }
  }

  return normalized;
}

export async function register(
  payload: RegisterRequest,
): Promise<AuthResponse> {
  // FastAPI expects { full_name, email, password }
  await httpClient.post<unknown>("/auth/register", {
    full_name: payload.name,
    email: payload.email,
    password: payload.password,
  });

  // After successful registration, log in directly to retrieve token & user profile
  return login({
    email: payload.email,
    password: payload.password,
  });
}
