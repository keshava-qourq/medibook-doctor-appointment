import { expect, test } from "@playwright/test";

import {
  apiContext,
  bearer,
  createStaffUser,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";
import { adminCredentials } from "./support/admin";

// US-004-3: role and ownership enforcement across screens and endpoints. The API-only
// 403-empty-body contract (AC-016, role==ownership indistinguishability) lives in the
// pytest integration suite; here we prove the user-facing journeys: a signed-in user of
// the wrong role is denied a protected screen, and an unauthenticated visitor is sent to
// sign-in while a no-token API call is refused 401.

async function adminToken(api: Awaited<ReturnType<typeof apiContext>>) {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  landing: RegExp,
) {
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(landing);
}

test("[AC-014][NFR-003] a patient visiting an admin URL directly is denied the admin screen", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Patient No Admin",
    email,
    phone: "+15553330011",
    password,
  });
  expect(reg.status()).toBe(201);
  await api.dispose();

  await signIn(page, email, password, /find-a-doctor|\/search/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText(/admin console|admin dashboard/i)).not.toBeVisible();
});

test("[AC-014][NFR-003] a patient visiting a doctor URL directly is denied the doctor screen", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Patient No Doctor",
    email,
    phone: "+15553330022",
    password,
  });
  expect(reg.status()).toBe(201);
  await api.dispose();

  await signIn(page, email, password, /find-a-doctor|\/search/);

  await page.goto("/doctor-schedule");
  await expect(page).toHaveURL(/sign-in/);
});

test("[AC-014][NFR-003] a doctor visiting the admin URL directly is denied the admin screen", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const email = uniqueEmail("doctor");
  const password = generatedPassword();
  const created = await createStaffUser(api, token, {
    full_name: "Doctor No Admin",
    email,
    role: "doctor",
    initial_password: password,
  });
  expect(created.status()).toBe(201);
  await api.dispose();

  await signIn(page, email, password, /doctor-schedule/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText(/admin console|admin dashboard/i)).not.toBeVisible();
});

test("[AC-017][NFR-003] an unauthenticated visitor to a protected route is redirected to sign-in", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());

  for (const route of ["/my-appointments", "/admin", "/doctor-schedule"]) {
    await page.goto(route);
    await expect(page, `${route} must redirect an anonymous visitor to sign-in`).toHaveURL(
      /sign-in/,
    );
  }
});

test("[AC-017] a no-token API call returns 401 and does not leak data", async () => {
  const api = await apiContext();

  const me = await api.get("/api/auth/me");
  expect(me.status()).toBe(401);

  const admin = await api.get("/api/admin/users?limit=100", { headers: bearer("") });
  expect(admin.status()).toBe(401);

  await api.dispose();
});
