import { expect, test } from "@playwright/test";

import {
  apiContext,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";

// US-031-2: protection of health data. The observable halves (AC-124 stored password
// material, AC-125 errors and logs) are proven in the pytest integration suite, which can
// inspect the stored rows and the log records. Here we cover the user-facing error path
// (AC-125 on screen) and declare the infrastructure-only criteria as [KNOWN-LIMIT] skips:
// AC-122/NFR-005 (TLS in transit) and AC-123/NFR-006 (encryption at rest) are provisioning
// settings of the load balancer and the managed database that no application test can
// observe from inside this sandbox, which serves plain HTTP on localhost.

test("[AC-125][NFR-007] a failed sign-in shows a generic message on screen and never echoes the password", async ({
  page,
}) => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Error Path Patient",
    email,
    phone: "+15557770001",
    password,
  });
  expect(reg.status()).toBe(201);
  await api.dispose();

  await page.goto("/sign-in");
  await page.locator("#at-email").fill(email);
  await page.locator("#at-password").fill(`${password}-wrong`);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  expect(response.status(), "a wrong password must be refused").toBe(401);
  const body = await response.text();
  expect(body, "the error body must not echo the submitted password").not.toContain(password);

  const rendered = (await page.locator("body").innerText()).toLowerCase();
  expect(rendered, "the screen must not display the submitted password").not.toContain(
    password.toLowerCase(),
  );
  expect(
    rendered,
    "no password, hash or session token may be shown in an error message",
  ).not.toContain("password_hash");
});

test("[AC-125][NFR-007] a refused API call returns no credential or clinical content in its body", async () => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Refusal Patient",
    email,
    phone: "+15557770002",
    password,
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();

  const forbidden = await api.get("/api/admin/users?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(forbidden.status(), "a patient calling an admin API is refused 403").toBe(403);
  expect((await forbidden.text()).trim(), "a role refusal carries an empty body").toBe("");

  const badLogin = await loginApi(api, email, `${password}-wrong`);
  expect(badLogin.status()).toBe(401);
  const text = await badLogin.text();
  expect(text).not.toContain(password);
  expect(text).not.toContain(token);
  expect(text.toLowerCase()).not.toContain("password_hash");
  await api.dispose();
});

test("[AC-122][NFR-005] all application traffic travels over TLS and an unencrypted request is redirected to HTTPS", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] TLS termination and the HTTP->HTTPS redirect are load-balancer/hosting settings; this sandbox serves the app over plain HTTP on localhost, so no application test can observe them. The declaration is asserted against the deployment guide in backend/tests/integration/test_health_data_protection_acceptance.py",
  );
});

test("[AC-123][NFR-006] patient, appointment and consultation data is held in a database with encryption at rest enabled", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] encryption at rest is a managed-database (KMS) provisioning setting, not observable from the running application. The declaration is asserted against the deployment guide in backend/tests/integration/test_health_data_protection_acceptance.py",
  );
});

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] automated backups and point-in-time recovery are managed-database settings enabled in hosting, not observable or exercisable from the running application",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] production sizing and capacity targets are infrastructure provisioning concerns that cannot be verified through the application in this sandbox",
  );
});
