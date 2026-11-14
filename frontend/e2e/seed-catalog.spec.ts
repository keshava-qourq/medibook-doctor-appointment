import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  apiContext,
  bearer,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";
import { adminCredentials } from "./support/admin";

// US-009-2: the seeded disease and symptom catalogue, on screen.
//   AC-034 a patient types a seeded term on the search page and sees it suggested.
//   AC-035 the administrator reviews the catalogue (term, entry type, mapped
//          specializations for seeded entries), edits one entry and deletes another.
//   NFR-016 / NFR-017 are infrastructure promises declared in docker-compose.yml and the
//          deployment config; they are recorded here as [KNOWN-LIMIT] skips.
// The seeded entries are read through GET /api/admin/catalog-terms (is_seeded=true), so the
// documented seed list is never duplicated in the test. The seeder and the wired screens are
// delivered in this sprint; until they exist these scenarios fail loudly, because a missing
// seed or a screen on sample data is a real gap, not a test-setup limit.

interface SeededTerm {
  id: string;
  term: string;
  entry_type: string;
  is_seeded?: boolean;
  specializations: Array<{ id: string; name: string }>;
}

async function adminToken(api: APIRequestContext): Promise<string> {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok(), "the seeded admin must sign in").toBeTruthy();
  return (await res.json()).token as string;
}

async function seededTerms(api: APIRequestContext, token: string): Promise<SeededTerm[]> {
  const res = await api.get("/api/admin/catalog-terms", {
    headers: bearer(token),
    params: { limit: 100, offset: 0 },
  });
  expect(res.status(), "the administrator must be able to list catalogue entries").toBe(200);
  const body = await res.json();
  const items = (body.items ?? []) as SeededTerm[];
  const seeded = items.filter((t) => t.is_seeded);
  expect(
    seeded.length,
    "the starter catalogue must be seeded at launch, before any administrator edit",
  ).toBeGreaterThan(1);
  return seeded;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
}

test("[AC-034] a patient types a term from the seeded catalogue on the search page and sees it suggested", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const seeded = await seededTerms(api, token);
  const target = seeded[0];

  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Seed Catalogue Patient",
    email,
    phone: "+15551112222",
    password,
  });
  expect(reg.status(), "the patient must register through the API").toBe(201);
  await api.dispose();

  await signIn(page, email, password);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);

  const search = page.getByRole("combobox").first();
  await expect(search, "the patient search field must be on the page").toBeVisible();
  // At least two characters: the catalogue suggests nothing below that.
  await search.fill(target.term.slice(0, Math.max(3, Math.min(6, target.term.length))));

  const suggestion = page.getByRole("option", { name: new RegExp(target.term, "i") }).first();
  await expect(
    suggestion,
    `the seeded term "${target.term}" must be suggested as the patient types it`,
  ).toBeVisible();
});

test("[AC-035] the administrator reviews the seeded catalogue, then edits one entry and deletes another", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const seeded = await seededTerms(api, token);
  const target = seeded[0];
  const victim = seeded[1];

  const admin = adminCredentials();
  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/admin/);

  const catalogue = page.getByRole("table", { name: /catalogue/i }).first();
  await expect(catalogue, "the catalogue must be reviewable by the administrator").toBeVisible();

  // Term, entry type and mapped specializations are shown for a seeded entry.
  const row = catalogue.getByRole("row").filter({ hasText: target.term }).first();
  await expect(row, `the seeded term "${target.term}" must be listed`).toBeVisible();
  await expect(row, "the entry type must be shown").toContainText(
    new RegExp(target.entry_type, "i"),
  );
  for (const spec of target.specializations) {
    await expect(row, "every mapped specialization must be shown").toContainText(spec.name);
  }

  // A seeded entry is editable like any administrator-created one.
  const renamed = `${target.term} ${crypto.randomUUID().slice(0, 6)}`;
  await row.getByRole("button", { name: /edit/i }).first().click();
  const termField = page.getByLabel(/^term$/i).first();
  await expect(termField, "editing a seeded entry must open the term in the form").toBeVisible();
  await termField.fill(renamed);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/admin/catalog-terms")),
    page
      .getByRole("button", { name: /save term/i })
      .first()
      .click(),
  ]);
  await expect(
    catalogue.getByRole("row").filter({ hasText: renamed }).first(),
    "the edited seeded entry must show its new wording",
  ).toBeVisible();

  // And deletable like any administrator-created one.
  const victimRow = catalogue.getByRole("row").filter({ hasText: victim.term }).first();
  await victimRow
    .getByRole("button", { name: /delete/i })
    .first()
    .click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/admin/catalog-terms")),
    page
      .getByRole("button", { name: /yes, delete/i })
      .first()
      .click(),
  ]);
  await expect(
    catalogue.getByRole("row").filter({ hasText: victim.term }),
    "the deleted seeded entry must disappear from the catalogue",
  ).toHaveCount(0);

  // The API agrees with the screen: the edit is stored and the deletion is a soft delete.
  const after = await api.get("/api/admin/catalog-terms", {
    headers: bearer(token),
    params: { limit: 100, offset: 0 },
  });
  expect(after.status()).toBe(200);
  const terms = ((await after.json()).items ?? []).map((t: SeededTerm) => t.term);
  expect(terms).toContain(renamed);
  expect(terms).not.toContain(victim.term);
  await api.dispose();
});

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-database settings declared in docker-compose.yml / the deployment config; they cannot be observed or exercised from the running application",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-017 sizing and capacity targets are provisioning concerns declared in docker-compose.yml / the deployment config; they cannot be verified through the application",
  );
});
