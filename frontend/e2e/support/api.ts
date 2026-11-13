import { randomUUID } from "node:crypto";

import { request, type APIRequestContext } from "@playwright/test";

// The frontend and the API run as separate webServer entries (see playwright.config.ts):
// the frontend preview on E2E_BASE_URL/baseURL, the API on its own port. Tests that must
// act through the API directly (admin actions, duplicate-account checks) talk to this.
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_BASE_URL });
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

export function generatedPassword(): string {
  // Letters and digits so it also satisfies the registration form's own pattern.
  return `Aa1-${randomUUID().replace(/-/g, "")}`;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export async function registerPatient(api: APIRequestContext, input: RegisterInput) {
  return api.post("/api/auth/register", { data: input });
}

export async function loginApi(api: APIRequestContext, email: string, password: string) {
  return api.post("/api/auth/login", { data: { email, password } });
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createStaffUser(
  api: APIRequestContext,
  adminToken: string,
  input: { full_name: string; email: string; role: "doctor" | "admin"; initial_password: string },
) {
  return api.post("/api/admin/users", { data: input, headers: bearer(adminToken) });
}

export async function deactivateUser(api: APIRequestContext, adminToken: string, userId: string) {
  return api.patch(`/api/admin/users/${userId}`, {
    data: { is_active: false },
    headers: bearer(adminToken),
  });
}

export async function resetPassword(
  api: APIRequestContext,
  adminToken: string,
  userId: string,
  newPassword: string,
) {
  return api.post(`/api/admin/users/${userId}/password`, {
    data: { new_password: newPassword },
    headers: bearer(adminToken),
  });
}
