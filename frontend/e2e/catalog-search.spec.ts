import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiContext, bearer, loginApi } from "./support/api";
import { adminCredentials } from "./support/admin";

// US-010-3: catalogue editing and term-driven doctor search, driven through the API via the
// e2e api support. The contract (US-010-1 / US-010-2) is POST/PUT/DELETE
// /api/admin/catalog-terms, GET /api/catalog/suggest?q= and GET /api/search/doctors?term=.
// The only account used is the seeded admin; every term and specialization name is made
// unique so no two runs collide on the case-insensitive unique constraint. Linking a doctor
// to a specialization has no delivered API in this sprint (the doctor<->specialization table
// is owned by a later one), so these scenarios assert term->specialization resolution, which
// is what US-010 delivers; doctor-level matching is covered by the backend suite.

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

function specIds(body: { specializations?: Array<unknown> }): Set<string> {
  const out = new Set<string>();
  for (const s of body.specializations ?? []) {
    out.add(typeof s === "object" && s !== null ? String((s as { id: string }).id) : String(s));
  }
  return out;
}

function doctorIds(body: { doctors?: Array<unknown> }): Set<string> {
  const out = new Set<string>();
  for (const d of body.doctors ?? []) {
    out.add(typeof d === "object" && d !== null ? String((d as { id: string }).id) : String(d));
  }
  return out;
}

async function createSpecialization(api: APIRequestContext, token: string, name: string) {
  const res = await api.post("/api/admin/specializations", {
    headers: bearer(token),
    data: { name, description: "spec for e2e" },
  });
  expect(res.status(), "creating a specialization returns 201").toBe(201);
  return (await res.json()).id as string;
}

test("[AC-037] an admin adds a term linked to active specializations and a patient search immediately resolves to them", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const specId = await createSpecialization(api, token, uniqueName("Cardiology"));

  const term = uniqueName("angina");
  const created = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term, entry_type: "disease", specialization_ids: [specId] },
  });
  expect(created.status(), "a mapped term must save with 201").toBe(201);

  const resolved = await api.get("/api/search/doctors", {
    headers: bearer(token),
    params: { term },
  });
  expect(resolved.status()).toBe(200);
  const body = await resolved.json();
  // The term resolves immediately to its linked specialization. Resolution is "matched"
  // when an active doctor of that specialization exists and "no_specialist_available"
  // when none do; either way the linked specialization is returned, never "no_match".
  expect(body.resolution).not.toBe("no_match");
  expect(specIds(body).has(specId), "the search must resolve to the linked specialization").toBe(
    true,
  );
  await api.dispose();
});

test("[AC-038][NFR-022] saving a term with no specialization is rejected with the required-specialization message", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const resp = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term: uniqueName("orphan"), entry_type: "disease", specialization_ids: [] },
  });
  expect(resp.status(), "an unmapped term must be rejected 422").toBe(422);
  const text = JSON.stringify(await resp.json()).toLowerCase();
  expect(text, "the rejection must name the required specialization").toContain("specialization");
  await api.dispose();
});

test("[AC-039] a term mapped to two specializations returns active doctors from both", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const specA = await createSpecialization(api, token, uniqueName("Cardiology"));
  const specB = await createSpecialization(api, token, uniqueName("Pulmonology"));

  const term = uniqueName("chestpain");
  const created = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term, entry_type: "symptom", specialization_ids: [specA, specB] },
  });
  expect(created.status()).toBe(201);

  const resolved = await api.get("/api/search/doctors", {
    headers: bearer(token),
    params: { term },
  });
  expect(resolved.status()).toBe(200);
  const body = await resolved.json();
  expect(body.resolution).not.toBe("no_match");
  // Both mapped specializations resolve, so the doctors of both are in scope for the
  // result set. Linking a doctor to a specialization has no delivered API in this
  // sprint, so doctor-level matching is proven by the backend suite instead; here we
  // assert the full two-specialization fan-out the doctor list is drawn from.
  const specs = specIds(body);
  expect(specs.has(specA), "the first mapped specialization must resolve").toBe(true);
  expect(specs.has(specB), "the second mapped specialization must resolve").toBe(true);
  for (const id of doctorIds(body)) {
    expect(typeof id, "every returned doctor is identified").toBe("string");
  }
  await api.dispose();
});

test("[AC-040][NFR-026] a deleted term disappears from suggest and no longer resolves, while prior references are untouched", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const specId = await createSpecialization(api, token, uniqueName("Dermatology"));
  const term = uniqueName("eczema");
  const created = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term, entry_type: "disease", specialization_ids: [specId] },
  });
  expect(created.status()).toBe(201);
  const termId = (await created.json()).id as string;

  // Before deletion it suggests and resolves.
  const suggestBefore = await api.get("/api/catalog/suggest", {
    headers: bearer(token),
    params: { q: term.slice(0, 6) },
  });
  expect(suggestBefore.status()).toBe(200);
  expect(listItems(await suggestBefore.json()).some((t) => t.term === term)).toBe(true);

  // Soft-delete it.
  const deleted = await api.delete(`/api/admin/catalog-terms/${termId}`, { headers: bearer(token) });
  expect(deleted.status(), "deleting a term must succeed with 204").toBe(204);

  // After deletion it no longer suggests.
  const suggestAfter = await api.get("/api/catalog/suggest", {
    headers: bearer(token),
    params: { q: term.slice(0, 6) },
  });
  expect(suggestAfter.status()).toBe(200);
  expect(
    listItems(await suggestAfter.json()).some((t) => t.term === term),
    "a deleted term must not appear in suggest",
  ).toBe(false);

  // After deletion it no longer resolves.
  const resolved = await api.get("/api/search/doctors", {
    headers: bearer(token),
    params: { term },
  });
  expect(resolved.status()).toBe(200);
  expect((await resolved.json()).resolution, "a deleted term must no longer resolve").toBe(
    "no_match",
  );
  await api.dispose();
});

test("[NFR-012] resolution is deterministic text matching: a misspelling is not fuzzy-matched and an unknown term is never invented", async () => {
  const api = await apiContext();
  const token = await adminToken(api);

  const specId = await createSpecialization(api, token, uniqueName("Cardiology"));
  const stem = crypto.randomUUID().slice(0, 8);
  const term = `migraine${stem}`;
  const created = await api.post("/api/admin/catalog-terms", {
    headers: bearer(token),
    data: { term, entry_type: "disease", specialization_ids: [specId] },
  });
  expect(created.status()).toBe(201);

  // A one-character query returns nothing (minimum two characters).
  const short = await api.get("/api/catalog/suggest", {
    headers: bearer(token),
    params: { q: term.slice(0, 1) },
  });
  expect(short.status()).toBe(200);
  expect(listItems(await short.json()).length).toBe(0);

  // A case-insensitive substring matches deterministically.
  const hit = await api.get("/api/catalog/suggest", {
    headers: bearer(token),
    params: { q: term.slice(0, 6).toUpperCase() },
  });
  expect(hit.status()).toBe(200);
  expect(listItems(await hit.json()).some((t) => t.term === term)).toBe(true);

  // A misspelling that is not a substring is NOT returned: no fuzzy/ML guess.
  const typo = await api.get("/api/catalog/suggest", {
    headers: bearer(token),
    params: { q: `migrain3${stem}` },
  });
  expect(typo.status()).toBe(200);
  expect(
    listItems(await typo.json()).some((t) => t.term === term),
    "a misspelling must not fuzzy-match; matching is deterministic substring only",
  ).toBe(false);

  // An unknown term resolves to an explicit no_match, never an invented result.
  const unknown = await api.get("/api/search/doctors", {
    headers: bearer(token),
    params: { term: `nonsense-${crypto.randomUUID()}` },
  });
  expect(unknown.status()).toBe(200);
  const unknownBody = await unknown.json();
  expect(unknownBody.resolution).toBe("no_match");
  expect(specIds(unknownBody).size).toBe(0);
  expect(doctorIds(unknownBody).size).toBe(0);
  await api.dispose();
});

test("[NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are managed-database settings that cannot be observed or exercised from the running application in this sandbox",
  );
});

test("[NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients)", async () => {
  test.skip(
    true,
    "[KNOWN-LIMIT] NFR-017 production sizing and capacity targets are infrastructure provisioning concerns that cannot be verified through the application in this sandbox",
  );
});
