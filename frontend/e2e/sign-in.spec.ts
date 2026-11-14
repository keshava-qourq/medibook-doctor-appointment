import { expect, test } from "@playwright/test";

import {
  apiContext,
  createStaffUser,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";
import { adminCredentials } from "./support/admin";
import { smokeCredentials } from "./support/smoke";

async function adminToken(api: Awaited<ReturnType<typeof apiContext>>) {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

test("[AC-005] patient sign-in reaches the doctor search screen", async ({ page }) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Patient Role",
    email,
    phone: "+15552223333",
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
  await api.dispose();
});

test("[AC-005] doctor sign-in reaches their schedule", async ({ page }) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const email = uniqueEmail("doctor");
  const password = generatedPassword();
  const created = await createStaffUser(api, token, {
    full_name: "Doctor Role",
    email,
    role: "doctor",
    initial_password: password,
  });
  expect(created.status()).toBe(201);

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/doctor-schedule/);
  await api.dispose();
});

test("[AC-005] admin sign-in reaches the admin dashboard", async ({ page }) => {
  const admin = adminCredentials();
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(admin.email);
  await page.locator("#at-password").fill(admin.password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/\/admin/);
});

test("[seed] the seeded admin and smoke patient can sign in with their fixed credentials", async ({
  page,
}) => {
  const admin = adminCredentials();
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(admin.email);
  await page.locator("#at-password").fill(admin.password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/\/admin/);

  const smoke = smokeCredentials();
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(smoke.email);
  await page.locator("#at-password").fill(smoke.password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);
});

test("[AC-006][NFR-004] a wrong password shows one generic message and creates no session", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Wrong Password Patient",
    email,
    phone: "+15554445555",
    password,
  });
  expect(reg.status()).toBe(201);

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password + "-wrong");
  const [wrongPasswordResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  expect(wrongPasswordResponse.status()).toBe(401);
  const wrongPasswordMessage =
    (await page
      .getByRole("alert")
      .textContent()
      .catch(() => null)) ?? (await page.locator("body").innerText());

  await page.reload();
  await page.locator("#at-email").fill(uniqueEmail("unknown"));
  await page.locator("#at-password").fill(password);
  const [unknownEmailResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  expect(unknownEmailResponse.status()).toBe(401);
  const unknownEmailMessage =
    (await page
      .getByRole("alert")
      .textContent()
      .catch(() => null)) ?? (await page.locator("body").innerText());

  const token = await page.evaluate(() => localStorage.getItem("session_token"));
  expect(token, "a failed sign-in must not create a session").toBeFalsy();
  expect(wrongPasswordMessage?.trim(), "a wrong password must show a message").toBeTruthy();
  // NFR-004: the message must not reveal whether the email is registered, so a wrong
  // password and an unknown email must show the identical generic failure.
  expect(
    (unknownEmailMessage ?? "").trim(),
    "wrong password and unknown email must show the same generic message",
  ).toBe((wrongPasswordMessage ?? "").trim());
  await api.dispose();
});
