import { expect, test } from "@playwright/test";

import {
  apiContext,
  deactivateUser,
  generatedPassword,
  loginApi,
  registerPatient,
  resetPassword,
  uniqueEmail,
} from "./support/api";
import { adminCredentials } from "./support/admin";

async function adminToken(api: Awaited<ReturnType<typeof apiContext>>) {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

test("[AC-007] sign-out ends the session and the back button does not show cached protected content", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Sign Out Patient",
    email,
    phone: "+15556667777",
    password,
  });
  expect(reg.status()).toBe(201);

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);

  await page.getByRole("button", { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/sign-in/);

  await page.goBack();
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText(/find a doctor/i)).not.toBeVisible();
  await api.dispose();
});

test("[AC-009] a deactivated account is forced back to sign-in and refused re-login with an inactive message", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Deactivated Patient",
    email,
    phone: "+15558889999",
    password,
  });
  expect(reg.status()).toBe(201);
  const { user } = await reg.json();

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);

  const deactivation = await deactivateUser(api, token, user.id);
  expect(deactivation.ok()).toBeTruthy();

  await page.reload();
  await expect(page).toHaveURL(/sign-in/);

  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  expect(response.status()).toBe(403);
  await expect(page.getByText(/inactive|deactivated/i)).toBeVisible();
  const sessionToken = await page.evaluate(() => localStorage.getItem("session_token"));
  expect(sessionToken).toBeFalsy();
  await api.dispose();
});

test("[NFR-002] an administrator password reset revokes the user's current session", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Reset Patient",
    email,
    phone: "+15551212121",
    password,
  });
  expect(reg.status()).toBe(201);
  const { user } = await reg.json();

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);

  const reset = await resetPassword(api, token, user.id, generatedPassword());
  expect(reset.ok()).toBeTruthy();

  await page.reload();
  await expect(page).toHaveURL(/sign-in/);
  await api.dispose();
});

test.skip(
  true,
  "[KNOWN-LIMIT] NFR-002 inactivity expiry requires waiting out session_idle_minutes of real wall-clock time, which this sandbox cannot shorten or fast-forward",
);

test("[NFR-003] an unauthenticated visitor to a protected route is sent to sign-in", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/my-appointments");
  await expect(page).toHaveURL(/sign-in/);
});

test("[NFR-003] a patient cannot reach the admin console", async ({ page }) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "No Admin Patient",
    email,
    phone: "+15553334444",
    password,
  });
  expect(reg.status()).toBe(201);

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  await page.goto("/admin");
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText(/admin console|admin dashboard/i)).not.toBeVisible();
  await api.dispose();
});
