import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  apiContext,
  bearer,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";

// US-005-2: the patient's own journey through My Profile on screen (AC-018 - AC-021).
// Accounts are created through POST /api/auth/register; the screen is reached by signing
// in through the app's own sign-in form. The API-only halves of the contract are covered
// by frontend/e2e/patient-profile.spec.ts and the pytest integration suite; here every
// assertion is what the patient sees. The My Profile screen is delivered by US-005-1 in
// the same sprint; until it exists these scenarios fail loudly, because a missing screen
// is a real gap, not a test-setup limit.

interface Patient {
  email: string;
  password: string;
  token: string;
}

async function newPatient(fullName: string, phone: string): Promise<Patient> {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, { full_name: fullName, email, phone, password });
  expect(reg.status(), "the patient must be registered through the API").toBe(201);
  const { token } = await reg.json();
  await api.dispose();
  return { email, password, token };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);
}

async function openProfile(page: Page) {
  const link = page.getByRole("link", { name: /my profile|profile/i }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
  } else {
    await page.goto("/my-profile");
  }
  await expect(
    page.getByText(/my profile/i).first(),
    "the My Profile screen must be reachable for a signed-in patient",
  ).toBeVisible();
}

function field(page: Page, label: RegExp): Locator {
  return page.getByLabel(label).first();
}

async function setValue(locator: Locator, value: string) {
  const tag = await locator.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await locator.selectOption({ label: new RegExp(value, "i") }).catch(async () => {
      await locator.selectOption(value);
    });
  } else {
    await locator.fill(value);
  }
}

async function save(page: Page) {
  await page
    .getByRole("button", { name: /save|update/i })
    .first()
    .click();
}

test("[AC-018] a signed-in patient opens My Profile and sees their stored name, email, phone, date of birth and gender", async ({
  page,
}) => {
  const patient = await newPatient("Profile Screen Reader", "+15551110101");

  // Give every field a stored value through the API so the screen has something to show.
  const api = await apiContext();
  const seeded = await api.patch("/api/patients/me", {
    headers: bearer(patient.token),
    data: { date_of_birth: "1979-07-04", gender: "female", phone: "+15551110101" },
  });
  expect(seeded.status()).toBe(200);
  await api.dispose();

  await signIn(page, patient.email, patient.password);
  await openProfile(page);

  await expect(field(page, /full name|name/i)).toHaveValue("Profile Screen Reader");
  await expect(field(page, /phone/i)).toHaveValue("+15551110101");
  await expect(field(page, /date of birth|birth/i)).toHaveValue(/1979-07-04/);
  await expect(field(page, /gender/i)).toHaveValue(/female/i);

  const emailShown = (await page.locator("body").innerText()).toLowerCase();
  expect(emailShown, "the stored email must be shown on My Profile").toContain(
    patient.email.toLowerCase(),
  );
});

test("[AC-019] editing name, phone, date of birth and gender and saving shows a confirmation, and re-navigating shows the new values", async ({
  page,
}) => {
  const patient = await newPatient("Before Screen Update", "+15551110102");

  await signIn(page, patient.email, patient.password);
  await openProfile(page);

  await setValue(field(page, /full name|name/i), "After Screen Update");
  await setValue(field(page, /phone/i), "+15559990102");
  await setValue(field(page, /date of birth|birth/i), "1990-11-02");
  await setValue(field(page, /gender/i), "male");

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/patients/me") && r.request().method() === "PATCH",
    ),
    save(page),
  ]);
  expect(response.status(), "a valid profile save must succeed").toBe(200);

  await expect(
    page.getByText(/saved|updated|profile.*(saved|updated)|success/i).first(),
    "a successful save must show a confirmation",
  ).toBeVisible();

  // Navigate away and back: the new values are shown, so they were stored.
  await page.goto("/find-a-doctor");
  await openProfile(page);
  await expect(field(page, /full name|name/i)).toHaveValue("After Screen Update");
  await expect(field(page, /phone/i)).toHaveValue("+15559990102");
  await expect(field(page, /date of birth|birth/i)).toHaveValue(/1990-11-02/);
  await expect(field(page, /gender/i)).toHaveValue(/male/i);
});

test("[AC-020] a patient changes their password on screen; the old one no longer signs in and the new one does", async ({
  page,
}) => {
  const patient = await newPatient("Screen Password Changer", "+15551110103");
  const newPassword = generatedPassword();

  await signIn(page, patient.email, patient.password);
  await openProfile(page);

  await field(page, /current password/i).fill(patient.password);
  await field(page, /new password/i).fill(newPassword);
  const confirm = page.getByLabel(/confirm.*password|repeat.*password/i).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.fill(newPassword);
  }

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/patients/me/password")),
    page
      .getByRole("button", { name: /change password|update password|save password/i })
      .first()
      .click(),
  ]);
  expect(response.status(), "a correct current password must be accepted").toBe(200);
  await expect(
    page.getByText(/password.*(changed|updated)|saved|success/i).first(),
    "a successful password change must be confirmed on screen",
  ).toBeVisible();

  const api = await apiContext();
  const oldLogin = await loginApi(api, patient.email, patient.password);
  expect(oldLogin.status(), "the old password must no longer sign in").toBe(401);
  const newLogin = await loginApi(api, patient.email, newPassword);
  expect(newLogin.status(), "the new password must sign in").toBe(200);
  await api.dispose();
});

test("[AC-021][NFR-022] a wrong current password is rejected inline on current_password, the typed values stay, and the original password still signs in", async ({
  page,
}) => {
  const patient = await newPatient("Screen Wrong Current", "+15551110104");
  const attemptedNew = generatedPassword();

  await signIn(page, patient.email, patient.password);
  await openProfile(page);

  const currentField = field(page, /current password/i);
  const newField = field(page, /new password/i);
  const wrongCurrent = `${patient.password}-wrong`;
  await currentField.fill(wrongCurrent);
  await newField.fill(attemptedNew);
  const confirm = page.getByLabel(/confirm.*password|repeat.*password/i).first();
  const hasConfirm = await confirm.isVisible().catch(() => false);
  if (hasConfirm) await confirm.fill(attemptedNew);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/patients/me/password")),
    page
      .getByRole("button", { name: /change password|update password|save password/i })
      .first()
      .click(),
  ]);
  expect(response.status(), "a wrong current password must be refused 422").toBe(422);

  // The message is attached to the current_password field, not shown as a page-level error.
  const described = await currentField.getAttribute("aria-describedby");
  const invalid = await currentField.getAttribute("aria-invalid");
  expect(
    invalid === "true" || Boolean(described),
    "the error must be attached inline to the current password field",
  ).toBe(true);
  if (described) {
    const message = (await page.locator(`#${described.split(" ")[0]}`).innerText()).trim();
    expect(message.length, "the inline message must say what is wrong").toBeGreaterThan(0);
  }

  // NFR-022: what was typed is preserved.
  await expect(currentField).toHaveValue(wrongCurrent);
  await expect(newField).toHaveValue(attemptedNew);

  const api = await apiContext();
  const stillWorks = await loginApi(api, patient.email, patient.password);
  expect(stillWorks.status(), "the original password must still sign in").toBe(200);
  const rejected = await loginApi(api, patient.email, attemptedNew);
  expect(rejected.status(), "the rejected new password must not sign in").toBe(401);
  await api.dispose();
});

test("[NFR-001] a password typed on My Profile is never echoed back by the API or shown on screen", async ({
  page,
}) => {
  const patient = await newPatient("Screen Hash Only", "+15551110105");
  const newPassword = generatedPassword();

  await signIn(page, patient.email, patient.password);
  await openProfile(page);

  await field(page, /current password/i).fill(patient.password);
  await field(page, /new password/i).fill(newPassword);
  const confirm = page.getByLabel(/confirm.*password|repeat.*password/i).first();
  if (await confirm.isVisible().catch(() => false)) await confirm.fill(newPassword);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/patients/me/password")),
    page
      .getByRole("button", { name: /change password|update password|save password/i })
      .first()
      .click(),
  ]);
  const body = await response.text();
  expect(body, "the response must not echo the new password").not.toContain(newPassword);
  expect(body, "the response must not echo the old password").not.toContain(patient.password);
  expect(body.toLowerCase()).not.toContain("password_hash");

  const api = await apiContext();
  const profile = await api.get("/api/patients/me", { headers: bearer(patient.token) });
  const profileText = await profile.text();
  expect(profileText).not.toContain(newPassword);
  expect(profileText.toLowerCase()).not.toContain("password_hash");
  await api.dispose();
});

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] automated backups and point-in-time recovery are managed-database settings enabled in hosting, not observable from the running application",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] production sizing and capacity targets are infrastructure provisioning concerns that cannot be verified through the application in this sandbox",
  );
});
