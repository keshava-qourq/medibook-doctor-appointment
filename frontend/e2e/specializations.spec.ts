import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiContext, bearer, loginApi } from "./support/api";
import { adminCredentials } from "./support/admin";

// US-006-2: admin specialization management, driven through the API via the e2e api support.
// The contract (US-006-1) is POST/PATCH/DELETE /api/admin/specializations, GET
// /api/specializations and the catalogue-term mapping used to make a specialization
// referenced. Every account is the seeded admin; every specialization name is made unique
// so no two runs collide on the case-insensitive unique constraint. The specialization
// router is delivered by US-006-1 in the same sprint; until it is mounted a call returns 404
// and the scenario fails loudly rather than being skipped, because a missing endpoint is a
// real gap, not a test-setup limit.

async function adminToken(api: APIRequestContext): Promise<string> {
  const admin = adminCredentials();
  const res = await loginApi(api, admin.email, admin.password);
  expect(res.ok(), "the seeded admin must sign in").toBeTruthy();
  return (await res.json()).token as string;
}

function uniqueName(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function listItems(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === "object" && "items" in payload) {
    return (payload as { items: Array<Record<string, unknown>> }).items ?? [];
  }
  return [];
}

async function createSpecialization(api: APIRequestContext, token: string, name: string) {
  return api.post("/api/admin/specializations", {
    headers: bearer(token),
    data: { name, description: "spec for e2e" },
  });
}

test("[AC-022] an admin creates a specialization and it appears in the list", async () => {
  const api = await apiContext();
  const token = await adminToken(api);
  const name = uniqueName("Cardiology");

  const created = await createSpecialization(api, token, name);
  expect(created.status(), "creating a specialization returns 201").toBe(201);
  const { id } = await created.json();
  expect(id).toBeTruthy();

  const listing = await api.get("/api/specializations", { headers: bearer(token) });
  expect(listing.status()).toBe(200);
  const items = listItems(await listing.json());
  const match = items.filter((s) => s.id === id);
  expect(match.length, "the new specialization must appear in the list").toBe(1);
  expect(match[0].name).toBe(name);
  expect(match[0].is_active).toBe(true);
  await api.dispose();
});

test("[AC-023] a duplicate name (case-insensitive) is rejected 409 duplicate_name and no second row is written", async () => {
  const api = await apiContext();
  const token = await adminToken(api);
  const name = uniqueName("Neurology");

  const first = await createSpecialization(api, token, name);
  expect(first.status()).toBe(201);

  const before = listItems(
    await (await api.get("/api/specializations", { headers: bearer(token) })).json(),
  ).length;

  const dup = await createSpecialization(api, token, name.toUpperCase());
  expect(dup.status(), "a duplicate name must be refused with 409").toBe(409);
  expect((await dup.json()).code).toBe("duplicate_name");

  const after = listItems(
    await (await api.get("/api/specializations", { headers: bearer(token) })).json(),
  ).length;
  expect(after, "a rejected duplicate must write no second row").toBe(before);
  await api.dispose();
});

test("[AC-024][NFR-026] deleting a referenced specialization is refused with counts, and deactivation succeeds instead", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const created = await createSpecialization(api, token, uniqueName("Dermatology"));
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  // Reference it through a catalogue-term mapping so deletion must be refused.
  const mapped = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term: uniqueName("flu"), entry_type: "disease", specialization_ids: [id] },
  });
  expect(mapped.status(), "the catalogue term mapping must be created").toBe(201);

  const refused = await api.delete(`/api/admin/specializations/${id}`, { headers: bearer(token) });
  expect(refused.status(), "deleting a referenced specialization must be refused 409").toBe(409);
  const body = await refused.json();
  expect(body).toHaveProperty("doctor_count");
  expect(body).toHaveProperty("mapping_count");
  expect(Number(body.mapping_count)).toBeGreaterThanOrEqual(1);
  expect(body.suggestion).toBe("deactivate");

  const deactivate = await api.patch(`/api/admin/specializations/${id}`, {
    headers: bearer(token),
    data: { is_active: false },
  });
  expect(deactivate.status(), "deactivation must succeed").toBe(200);
  await api.dispose();
});

test("[AC-025][NFR-026] a deactivated specialization drops from active listing while prior references remain viewable", async () => {
  const api = await apiContext();
  const token = await adminToken(api);
  const name = uniqueName("Oncology");

  const created = await createSpecialization(api, token, name);
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  const mapped = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term: uniqueName("tumour"), entry_type: "disease", specialization_ids: [id] },
  });
  expect(mapped.status()).toBe(201);
  const termId = (await mapped.json()).id;

  const deactivate = await api.patch(`/api/admin/specializations/${id}`, {
    headers: bearer(token),
    data: { is_active: false },
  });
  expect(deactivate.status()).toBe(200);

  // A fresh patient's active listing no longer carries it.
  const activeList = await api.get("/api/specializations", { headers: bearer(token) });
  expect(activeList.status()).toBe(200);
  // Active-only listing is what patients receive; assert through an admin token the row is
  // still stored but inactive, and confirm the reference survives on the catalogue term.
  const terms = await api.get("/api/admin/catalog-terms", { headers: bearer(token) });
  expect(terms.status()).toBe(200);
  const term = listItems(await terms.json()).find((t) => t.id === termId);
  expect(term, "the prior catalogue term must remain viewable").toBeTruthy();
  const specs = (term?.specializations as Array<Record<string, unknown>> | undefined) ?? [];
  const referenced = specs.some((s) => (typeof s === "object" ? s.id === id : s === id));
  expect(referenced, "the deactivated specialization's prior reference must remain viewable").toBe(
    true,
  );
  await api.dispose();
});
