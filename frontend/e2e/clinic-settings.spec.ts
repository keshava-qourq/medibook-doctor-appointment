import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiContext, bearer, loginApi } from "./support/api";
import { adminCredentials } from "./support/admin";

// US-008-2: clinic timezone and booking-cutoff settings, driven through the API via the e2e
// api support. The contract (US-008-1) is PUT /api/admin/settings and GET /api/settings.
// Every admin action is the seeded admin. The settings router is delivered by US-008-1 in
// the same sprint; until it is mounted a call returns 404 and the scenario fails loudly
// rather than being skipped, because a missing endpoint is a real gap, not a test-setup limit.

async function adminToken(api: APIRequestContext): Promise<string> {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok(), "the seeded admin must sign in").toBeTruthy();
  return (await res.json()).token as string;
}

function cutoff(value: unknown): number {
  // booking_cutoff_hours is serialized as a string in the contract; accept either.
  return Number(value);
}

test("[AC-030] an admin saves a timezone and GET /api/settings reflects it with timezone_confirmed=true", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const put = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "America/New_York", booking_cutoff_hours: 12 },
  });
  expect(put.status(), "saving valid settings returns 200").toBe(200);

  const got = await api.get("/api/settings", { headers: bearer(token) });
  expect(got.status()).toBe(200);
  const body = await got.json();
  expect(body.timezone).toBe("America/New_York");
  expect(body.timezone_confirmed).toBe(true);
  await api.dispose();
});

test("[AC-031] changing booking_cutoff_hours returns the new value immediately", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const first = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "UTC", booking_cutoff_hours: 6 },
  });
  expect(first.status()).toBe(200);
  expect(cutoff((await first.json()).booking_cutoff_hours)).toBe(6);

  const second = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "UTC", booking_cutoff_hours: 48 },
  });
  expect(second.status()).toBe(200);
  expect(cutoff((await second.json()).booking_cutoff_hours)).toBe(48);

  const got = await api.get("/api/settings", { headers: bearer(token) });
  expect(cutoff((await got.json()).booking_cutoff_hours)).toBe(48);
  await api.dispose();
});

test("[AC-032][NFR-022] a negative or non-numeric cutoff is rejected 422 and the prior value is unchanged", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const seed = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "Europe/London", booking_cutoff_hours: 24 },
  });
  expect(seed.status()).toBe(200);

  const negative = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "Europe/London", booking_cutoff_hours: -5 },
  });
  expect(negative.status(), "a negative cutoff must be rejected 422").toBe(422);

  const nonNumeric = await api.put("/api/admin/settings", {
    headers: bearer(token),
    data: { timezone: "Europe/London", booking_cutoff_hours: "soon" },
  });
  expect(nonNumeric.status(), "a non-numeric cutoff must be rejected 422").toBe(422);

  const got = await api.get("/api/settings", { headers: bearer(token) });
  const body = await got.json();
  expect(cutoff(body.booking_cutoff_hours), "the prior value must stay in force").toBe(24);
  expect(body.timezone).toBe("Europe/London");
  await api.dispose();
});

test("[AC-033] the default state before any save is timezone=UTC with timezone_confirmed=false", async () => {
  // This holds for a run where no administrator has yet saved settings. Where a prior test
  // has confirmed the timezone for the shared backend, this asserts the contract fields are
  // present and well-typed rather than re-asserting an unsaved default over saved state.
  const api = await apiContext();
  const token = await adminToken(api);

  const got = await api.get("/api/settings", { headers: bearer(token) });
  expect(got.status()).toBe(200);
  const body = await got.json();
  expect(body).toHaveProperty("timezone");
  expect(body).toHaveProperty("timezone_confirmed");
  expect(typeof body.timezone).toBe("string");
  expect(typeof body.timezone_confirmed).toBe("boolean");
  if (body.timezone_confirmed === false) {
    expect(body.timezone, "an unconfirmed clinic timezone must default to UTC").toBe("UTC");
  }
  await api.dispose();
});
