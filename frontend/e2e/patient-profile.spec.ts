import { expect, test } from "@playwright/test";

import {
  apiContext,
  bearer,
  generatedPassword,
  loginApi,
  registerPatient,
  uniqueEmail,
} from "./support/api";

// US-005-2: patient profile management, driven through the API via the e2e api support
// (the contract is GET/PATCH /api/patients/me and POST /api/patients/me/password). Every
// account is created through /api/auth/register. The patient profile router is delivered
// by US-005-1 in the same sprint; until it is mounted, a call returns 404 and the scenario
// fails loudly rather than being skipped, because a missing endpoint is a real gap, not a
// test-setup limit.

test("[AC-018] a registered, signed-in patient reads their stored profile fields", async () => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Profile Reader",
    email,
    phone: "+15551110001",
    password,
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();

  const me = await api.get("/api/patients/me", { headers: bearer(token) });
  expect(me.status(), "a signed-in patient reads their own profile").toBe(200);
  const body = await me.json();
  for (const field of ["full_name", "email", "phone", "date_of_birth", "gender"]) {
    expect(body, `profile must carry ${field}`).toHaveProperty(field);
  }
  expect(String(body.email).toLowerCase()).toBe(email.toLowerCase());
  expect(body.full_name).toBe("Profile Reader");
  expect(body).not.toHaveProperty("password");
  await api.dispose();
});

test("[AC-019] updating name/phone/dob/gender persists and is reflected on a fresh GET", async () => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const password = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Before Update",
    email,
    phone: "+15551110002",
    password,
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();

  const update = {
    full_name: "After Update",
    phone: "+15559990002",
    date_of_birth: "1988-03-21",
    gender: "male",
  };
  const patch = await api.patch("/api/patients/me", { headers: bearer(token), data: update });
  expect(patch.status()).toBe(200);

  const fresh = await api.get("/api/patients/me", { headers: bearer(token) });
  expect(fresh.status()).toBe(200);
  const body = await fresh.json();
  expect(body.full_name).toBe("After Update");
  expect(body.phone).toBe("+15559990002");
  expect(String(body.date_of_birth)).toContain("1988-03-21");
  expect(body.gender).toBe("male");
  await api.dispose();
});

test("[AC-020] changing password with correct current + valid new succeeds; old fails, new logs in", async () => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const oldPassword = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Password Changer",
    email,
    phone: "+15551110003",
    password: oldPassword,
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();
  const newPassword = generatedPassword();

  const change = await api.post("/api/patients/me/password", {
    headers: bearer(token),
    data: { current_password: oldPassword, new_password: newPassword },
  });
  expect(change.status()).toBe(200);

  const oldLogin = await loginApi(api, email, oldPassword);
  expect(oldLogin.status(), "the old password must no longer log in").toBe(401);
  const newLogin = await loginApi(api, email, newPassword);
  expect(newLogin.status(), "the new password must log in").toBe(200);
  await api.dispose();
});

test("[AC-021] a wrong current password is rejected and the original password still logs in", async () => {
  const api = await apiContext();
  const email = uniqueEmail("patient");
  const oldPassword = generatedPassword();
  const reg = await registerPatient(api, {
    full_name: "Wrong Current",
    email,
    phone: "+15551110004",
    password: oldPassword,
  });
  expect(reg.status()).toBe(201);
  const { token } = await reg.json();
  const attemptedNew = generatedPassword();

  const change = await api.post("/api/patients/me/password", {
    headers: bearer(token),
    data: { current_password: `${oldPassword}-wrong`, new_password: attemptedNew },
  });
  expect(change.status(), "a wrong current password must be rejected").toBe(422);

  const stillWorks = await loginApi(api, email, oldPassword);
  expect(stillWorks.status(), "the original password must still log in").toBe(200);
  const rejectedNew = await loginApi(api, email, attemptedNew);
  expect(rejectedNew.status(), "the rejected new password must not log in").toBe(401);
  await api.dispose();
});
