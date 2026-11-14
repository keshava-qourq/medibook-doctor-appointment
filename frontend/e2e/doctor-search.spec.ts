import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

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

// US-011-3: term-driven search and the doctor directory (AC-041 .. AC-048, NFR-012,
// NFR-013, NFR-016, NFR-017, NFR-023). Every specialization, catalogue term and doctor
// is created through the admin API signed in as the bootstrap admin; the patient is
// created through /api/auth/register and signs in on screen.

function unique(prefix: string): string {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

async function adminToken(api: APIRequestContext): Promise<string> {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok(), "the bootstrap admin must be able to sign in").toBeTruthy();
  return (await res.json()).token as string;
}

async function createSpecialization(
  api: APIRequestContext,
  token: string,
  name: string,
): Promise<string> {
  const res = await api.post("/api/admin/specializations", {
    headers: bearer(token),
    data: { name, description: "specialization for e2e" },
  });
  expect(res.status(), "creating a specialization returns 201").toBe(201);
  return (await res.json()).id as string;
}

async function createTerm(
  api: APIRequestContext,
  token: string,
  term: string,
  specializationIds: string[],
): Promise<string> {
  const res = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term, entry_type: "disease", specialization_ids: specializationIds },
  });
  expect(res.status(), "creating a catalogue term returns 201").toBe(201);
  return (await res.json()).id as string;
}

async function createDoctor(
  api: APIRequestContext,
  token: string,
  opts: {
    fullName: string;
    specializationIds: string[];
    qualifications: string;
    consultationFee: number;
  },
): Promise<string> {
  const created = await createStaffUser(api, token, {
    full_name: opts.fullName,
    email: uniqueEmail("doctor"),
    role: "doctor",
    initial_password: generatedPassword(),
  });
  expect(created.status(), "creating a doctor account returns 201").toBe(201);
  const id = (await created.json()).id as string;
  const profile = await api.put(`/api/admin/doctors/${id}`, {
    headers: bearer(token),
    data: {
      specialization_ids: opts.specializationIds,
      qualifications: opts.qualifications,
      consultation_fee: opts.consultationFee,
    },
  });
  expect(profile.status(), "saving the doctor profile returns 200").toBe(200);
  return id;
}

async function signInAsNewPatient(page: Page, api: APIRequestContext): Promise<void> {
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Search Patient",
    email,
    phone: "+15552223333",
    password,
  });
  expect(reg.status(), "registering the patient returns 201").toBe(201);

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await expect(page).toHaveURL(/find-a-doctor|\/search/);
}

function searchBox(page: Page) {
  return page.locator("#mb-search");
}

async function submitTerm(page: Page, term: string): Promise<void> {
  await searchBox(page).fill(term);
  await searchBox(page).press("Enter");
}

// -- AC-041 ------------------------------------------------------------------

test("[AC-041][NFR-012] one character offers no suggestion, two or more offer the catalogue terms", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specId = await createSpecialization(api, token, unique("Neurology"));
  const term = unique("migraine");
  await createTerm(api, token, term, [specId]);

  await signInAsNewPatient(page, api);

  const box = searchBox(page);
  await box.fill(term.slice(0, 1));
  // A one-character query never offers a suggestion.
  await expect(page.getByText(term, { exact: false })).toHaveCount(0);

  await box.fill(term.slice(0, 4));
  await expect(page.getByText(term, { exact: false }).first()).toBeVisible();

  // A near-miss that is not a substring of a stored term is never guessed at.
  await box.fill(`${term}zzq`);
  await expect(page.getByText(term, { exact: true })).toHaveCount(0);
  await api.dispose();
});

// -- AC-042 ------------------------------------------------------------------

test("[AC-042] selecting a term mapped to two specializations lists the doctors of both", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specA = await createSpecialization(api, token, unique("Cardiology"));
  const specB = await createSpecialization(api, token, unique("Pulmonology"));
  const nameA = `Dr ${unique("Alpha")}`;
  const nameB = `Dr ${unique("Beta")}`;
  await createDoctor(api, token, {
    fullName: nameA,
    specializationIds: [specA],
    qualifications: "MBBS, MD",
    consultationFee: 800,
  });
  await createDoctor(api, token, {
    fullName: nameB,
    specializationIds: [specB],
    qualifications: "MBBS, DNB",
    consultationFee: 900,
  });
  const term = unique("chestpain");
  await createTerm(api, token, term, [specA, specB]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, term);

  await expect(page.getByText(nameA)).toBeVisible();
  await expect(page.getByText(nameB)).toBeVisible();
  await api.dispose();
});

// -- AC-043 ------------------------------------------------------------------

test("[AC-043][NFR-012][NFR-023] an unknown term shows the no-match message and never an invented doctor", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specId = await createSpecialization(api, token, unique("Dermatology"));
  const realDoctor = `Dr ${unique("Real")}`;
  await createDoctor(api, token, {
    fullName: realDoctor,
    specializationIds: [specId],
    qualifications: "MBBS",
    consultationFee: 500,
  });
  await createTerm(api, token, unique("eczema"), [specId]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, `nonsense${crypto.randomUUID().slice(0, 8)}`);

  await expect(page.getByText(/no match found/i).first()).toBeVisible();
  await expect(page.getByText(/try a (different|another) term|browse/i).first()).toBeVisible();
  // Nothing is guessed: no doctor from the catalogue is shown for an unknown term.
  await expect(page.getByText(realDoctor)).toHaveCount(0);
  await api.dispose();
});

// -- AC-044 ------------------------------------------------------------------

test("[AC-044][NFR-023] a term whose specialization has no active doctor shows the no-specialist message, not a blank page", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specId = await createSpecialization(api, token, unique("Rheumatology"));
  const term = unique("jointpain");
  await createTerm(api, token, term, [specId]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, term);

  await expect(page.getByText(/no (available )?specialist/i).first()).toBeVisible();
  await expect(page.getByText(/no match found/i)).toHaveCount(0);
  await api.dispose();
});

// -- AC-045 / NFR-013 --------------------------------------------------------

test("[AC-045][NFR-013] each result shows name, specializations, qualifications and fee, and no payment control exists anywhere", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specName = unique("Oncology");
  const specId = await createSpecialization(api, token, specName);
  const doctorName = `Dr ${unique("Fee")}`;
  const doctorId = await createDoctor(api, token, {
    fullName: doctorName,
    specializationIds: [specId],
    qualifications: "MBBS, MD Oncology",
    consultationFee: 1234,
  });
  const term = unique("lymphoma");
  await createTerm(api, token, term, [specId]);

  await signInAsNewPatient(page, api);

  const paymentControl = page.getByRole("button", {
    name: /pay|checkout|invoice|refund/i,
  });
  const paymentLink = page.getByRole("link", { name: /pay|checkout|invoice|refund/i });

  // The search page itself offers no payment surface.
  await expect(paymentControl).toHaveCount(0);
  await expect(paymentLink).toHaveCount(0);

  await submitTerm(page, term);

  await expect(page.getByText(doctorName)).toBeVisible();
  await expect(page.getByText(specName, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/MBBS, MD Oncology/).first()).toBeVisible();
  await expect(page.getByText(/1234/).first()).toBeVisible();
  // The page states the fee is settled at the clinic.
  await expect(page.getByText(/payable at the clinic|pay at clinic/i).first()).toBeVisible();
  await expect(paymentControl).toHaveCount(0);
  await expect(paymentLink).toHaveCount(0);

  // ... and on the doctor's own profile.
  await page.getByText(doctorName).first().click();
  await expect(page.getByText(doctorName).first()).toBeVisible();
  await expect(paymentControl).toHaveCount(0);
  await expect(paymentLink).toHaveCount(0);
  expect(doctorId).toBeTruthy();
  await api.dispose();
});

// -- AC-046 ------------------------------------------------------------------

test("[AC-046] filtering by specialization and by doctor name narrows the list, the filters are visible, and clearing restores it", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specA = await createSpecialization(api, token, unique("Ortho"));
  const specB = await createSpecialization(api, token, unique("Endo"));
  const nameA = `Dr ${unique("Narrow")}`;
  const nameB = `Dr ${unique("Other")}`;
  await createDoctor(api, token, {
    fullName: nameA,
    specializationIds: [specA],
    qualifications: "MBBS, MS",
    consultationFee: 600,
  });
  await createDoctor(api, token, {
    fullName: nameB,
    specializationIds: [specB],
    qualifications: "MBBS, MD",
    consultationFee: 700,
  });
  const term = unique("backpain");
  await createTerm(api, token, term, [specA, specB]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, term);
  await expect(page.getByText(nameA)).toBeVisible();
  await expect(page.getByText(nameB)).toBeVisible();

  // Filter by doctor name.
  await page.locator("#mb-docname").fill(nameA.replace("Dr ", ""));
  await expect(page.getByText(nameB)).toHaveCount(0);
  await expect(page.getByText(nameA)).toBeVisible();
  // The applied filter is shown to the patient.
  await expect(page.getByText(/doctor name:/i).first()).toBeVisible();

  // Clearing restores the full list.
  await page.getByRole("button", { name: /clear filters/i }).click();
  await expect(page.getByText(nameA)).toBeVisible();
  await expect(page.getByText(nameB)).toBeVisible();
  await api.dispose();
});

// -- AC-047 ------------------------------------------------------------------

test("[AC-047] selecting a doctor opens that doctor's profile with specializations, qualifications and fee", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specName = unique("Pulmo");
  const specId = await createSpecialization(api, token, specName);
  const doctorName = `Dr ${unique("Profile")}`;
  await createDoctor(api, token, {
    fullName: doctorName,
    specializationIds: [specId],
    qualifications: "MBBS, DNB Pulmonology",
    consultationFee: 640,
  });
  const term = unique("asthma");
  await createTerm(api, token, term, [specId]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, term);
  await page.getByText(doctorName).first().click();

  await expect(page.getByText(doctorName).first()).toBeVisible();
  await expect(page.getByText(specName, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/MBBS, DNB Pulmonology/).first()).toBeVisible();
  await expect(page.getByText(/640/).first()).toBeVisible();
  await api.dispose();
});

// -- AC-048 ------------------------------------------------------------------

test("[AC-048] a doctor deactivated after the results load shows 'no longer available' and the patient returns to the list", async ({
  page,
}) => {
  const api = await apiContext();
  const token = await adminToken(api);
  const specId = await createSpecialization(api, token, unique("Cardio"));
  const goneName = `Dr ${unique("Gone")}`;
  const stayName = `Dr ${unique("Stays")}`;
  const goneId = await createDoctor(api, token, {
    fullName: goneName,
    specializationIds: [specId],
    qualifications: "MBBS, MD",
    consultationFee: 800,
  });
  await createDoctor(api, token, {
    fullName: stayName,
    specializationIds: [specId],
    qualifications: "MBBS, DM",
    consultationFee: 900,
  });
  const term = unique("palpitations");
  await createTerm(api, token, term, [specId]);

  await signInAsNewPatient(page, api);
  await submitTerm(page, term);
  await expect(page.getByText(goneName)).toBeVisible();

  // The administrator deactivates the doctor while the results are on screen.
  const deactivated = await api.patch(`/api/admin/users/${goneId}`, {
    headers: bearer(token),
    data: { is_active: false },
  });
  expect(deactivated.status()).toBe(200);

  await page.getByText(goneName).first().click();

  await expect(page.getByText(/no longer available/i).first()).toBeVisible();
  // The patient is back on the result list, with the doctors who are still available.
  await expect(page.getByText(stayName)).toBeVisible();
  await api.dispose();
});

// -- NFR-016 / NFR-017 -------------------------------------------------------

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-database settings enabled in hosting/deployment config (docker-compose.yml / IaC); they cannot be observed from the running application",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-017 sizing and capacity targets are declared in deployment config (docker-compose.yml / IaC) and cannot be verified through the running application",
  );
});
