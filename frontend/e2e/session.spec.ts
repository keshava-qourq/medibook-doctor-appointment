import { expect, test } from "@playwright/test";

import { apiContext, generatedPassword, registerPatient, uniqueEmail } from "./support/api";

// Route guards for an unauthenticated or wrong-role visitor (NFR-003).
//
// The session lifecycle itself -- sign-out, administrator deactivation, administrator
// password reset and idle expiry (AC-007, AC-008, AC-009, NFR-002) -- lives in
// session-lifecycle.spec.ts; this file previously carried duplicates of those scenarios
// behind a module-level test.skip(true, ...) that disabled every test in the file, so
// none of them ran. The duplicates are gone and the blanket skip with them.

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
