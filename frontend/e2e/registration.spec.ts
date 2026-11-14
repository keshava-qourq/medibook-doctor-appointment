import { expect, test } from "@playwright/test";

import {
  apiContext,
  generatedPassword,
  registerPatient,
  uniqueEmail,
  bearer,
  loginApi,
} from "./support/api";
import { adminCredentials } from "./support/admin";

async function countAccounts(
  api: Awaited<ReturnType<typeof apiContext>>,
  email: string,
): Promise<number> {
  const admin = adminCredentials();
  const adminLogin = await loginApi(api, admin.email, admin.password);
  expect(adminLogin.ok()).toBeTruthy();
  const { token: adminToken } = await adminLogin.json();
  const users = await api.get("/api/admin/users?limit=100", { headers: bearer(adminToken) });
  const body = await users.json();
  return (body.items as Array<{ email: string }>).filter(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  ).length;
}

test("[AC-001] registers a new patient and lands on the doctor search screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: /register as patient/i }).click();

  const email = uniqueEmail("patient");
  const password = generatedPassword();

  await page.locator("#at-reg-name").fill("Test Patient");
  await page.locator("#at-reg-email").fill(email);
  await page.locator("#at-reg-phone").fill("+15551234567");
  await page.locator("#at-reg-password").fill(password);

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/register") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /create account/i }).click(),
  ]);

  expect(response.status(), "registration must succeed with 201").toBe(201);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);
  await expect(page.getByText(/find a doctor/i).first()).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem("session_token"));
  expect(token, "a session token must be stored after registration").toBeTruthy();
});

test("[AC-002] duplicate email registration shows the already-registered message and creates no second account", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("dup");
  const password = generatedPassword();

  const first = await registerPatient(api, {
    full_name: "Existing Patient",
    email,
    phone: "+15550000000",
    password,
  });
  expect(first.status(), "seed registration must succeed").toBe(201);

  await page.goto("/sign-in");
  await page.getByRole("tab", { name: /register as patient/i }).click();
  await page.locator("#at-reg-name").fill("Second Attempt");
  await page.locator("#at-reg-email").fill(email);
  await page.locator("#at-reg-phone").fill("+15551111111");
  await page.locator("#at-reg-password").fill(generatedPassword());

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/register") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /create account/i }).click(),
  ]);
  expect(response.status(), "duplicate email must be refused with 409").toBe(409);
  await expect(page.getByText(/already registered/i)).toBeVisible();

  const admin = adminCredentials();
  const adminLogin = await loginApi(api, admin.email, admin.password);
  expect(adminLogin.ok()).toBeTruthy();
  const { token: adminToken } = await adminLogin.json();
  const users = await api.get("/api/admin/users?limit=100", { headers: bearer(adminToken) });
  const body = await users.json();
  const matches = (body.items as Array<{ email: string }>).filter(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  expect(matches.length, "exactly one account must exist for the email").toBe(1);
  await api.dispose();
});

test("[AC-003][NFR-022] invalid registration input is flagged inline per field and preserves typed values", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("tab", { name: /register as patient/i }).click();

  const typedName = "Jane Doe";
  const typedEmail = "not-an-email";
  const typedPassword = "short";

  await page.locator("#at-reg-name").fill(typedName);
  await page.locator("#at-reg-email").fill(typedEmail);
  await page.locator("#at-reg-phone").fill("");
  await page.locator("#at-reg-password").fill(typedPassword);

  // No network call should happen: the form must reject this client-side.
  const registerCall = page
    .waitForResponse((r) => r.url().includes("/api/auth/register"), { timeout: 2000 })
    .catch(() => null);
  await page.getByRole("button", { name: /create account/i }).click();
  const madeCall = await registerCall;
  expect(madeCall, "invalid input must not reach the API").toBeNull();

  await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
  await expect(page.getByText(/8 characters|weak password/i)).toBeVisible();
  await expect(page.getByText(/phone.*required|required.*phone/i)).toBeVisible();
  await expect(page).toHaveURL(/sign-in/);

  await expect(page.locator("#at-reg-name")).toHaveValue(typedName);
  await expect(page.locator("#at-reg-email")).toHaveValue(typedEmail);
});

test("[AC-004][NFR-014] a rejected registration leaves no usable account, so the same email can be newly registered once the details are valid", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("rejected");

  await page.goto("/sign-in");
  await page.getByRole("tab", { name: /register as patient/i }).click();

  // First attempt is rejected: a password that is too short. The form must not submit, so
  // nothing reaches the API and no account can be written.
  await page.locator("#at-reg-name").fill("Rejected Then Valid");
  await page.locator("#at-reg-email").fill(email);
  await page.locator("#at-reg-phone").fill("+15559990000");
  await page.locator("#at-reg-password").fill("short");

  const rejectedCall = page
    .waitForResponse((r) => r.url().includes("/api/auth/register"), { timeout: 2000 })
    .catch(() => null);
  await page.getByRole("button", { name: /create account/i }).click();
  expect(await rejectedCall, "the rejected attempt must not reach the API").toBeNull();
  await expect(page.getByText(/8 characters|weak password/i)).toBeVisible();

  // No account exists for that email after the rejected attempt.
  expect(await countAccounts(api, email), "a rejected attempt must leave no account").toBe(0);

  // The same email can now be registered once the details are valid.
  await page.locator("#at-reg-password").fill(generatedPassword());
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/register") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: /create account/i }).click(),
  ]);
  expect(response.status(), "the valid retry must succeed with 201").toBe(201);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);

  expect(await countAccounts(api, email), "exactly one account must exist after the valid retry").toBe(
    1,
  );
  await api.dispose();
});
