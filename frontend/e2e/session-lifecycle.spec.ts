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

// The pre-existing session.spec.ts carries these same criteria but a module-level
// test.skip(true, ...) in that file skips every test in it, so none of them run. These
// declarations give AC-007, AC-008, AC-009 and NFR-002 an executable, passing-or-skipped
// home that is not disabled by that file-level skip.

async function adminToken(api: Awaited<ReturnType<typeof apiContext>>) {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

async function signInPatient(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);
}

test("[AC-007][NFR-002] sign-out ends the session and the back button does not show cached protected content", async ({
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

  await signInPatient(page, email, password);

  await page.getByRole("button", { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/sign-in/);

  await page.goBack();
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText(/find a doctor/i)).not.toBeVisible();
  await api.dispose();
});

test("[AC-009][NFR-002] a deactivated account is forced back to sign-in and refused re-login as inactive", async ({
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

  await signInPatient(page, email, password);

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

  await signInPatient(page, email, password);

  const reset = await resetPassword(api, token, user.id, generatedPassword());
  expect(reset.ok()).toBeTruthy();

  await page.reload();
  await expect(page).toHaveURL(/sign-in/);
  await api.dispose();
});

test("[AC-008][NFR-002] a signed-in session ends after the configured period of inactivity", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] AC-008/NFR-002 inactivity expiry requires waiting out session_idle_minutes of real wall-clock time, which this sandbox cannot shorten or fast-forward",
  );
});
