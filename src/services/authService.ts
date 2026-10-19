import { apiRequest } from "./apiClient";

export type Credentials = {
  email: string;
  password: string;
};

export type UserRole = "customer" | "staff" | "manager";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type AuthResponse = { token: string; user: AuthUser };

export async function signIn(credentials: Credentials, role: UserRole) {
  return apiRequest<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ ...credentials, role }),
    },
  );
}

export async function signUp(credentials: Credentials) {
  return apiRequest<AuthResponse>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );
}

export async function getManagerSetupStatus() {
  return apiRequest<{ available: boolean; configured: boolean }>(
    "/api/auth/manager-setup",
  );
}

export async function createFirstManager(
  credentials: Credentials & { setupCode: string },
) {
  return apiRequest<AuthResponse>("/api/auth/manager-setup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(token: string) {
  return apiRequest<{ user: AuthUser }>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function signOut(token: string) {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
