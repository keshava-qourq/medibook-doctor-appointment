import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Screen from "./Admin";

// The admin screen loads the specialization and catalogue lists from the API on open,
// so every test answers those two calls (and the user list the accounts panel loads).
const specs = {
  items: [
    { id: "s-neuro", name: "Neurology", description: "Brain and nerves.", is_active: true },
    { id: "s-cardio", name: "Cardiology", description: "Heart.", is_active: true },
  ],
  total: 2,
};
const terms = {
  items: [
    { id: "t-mig", term: "Migraine", entry_type: "disease", specialization_ids: ["s-neuro"] },
  ],
  total: 1,
};

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

type Overrides = Record<string, () => Response>;

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string; body: unknown }>;

function route(overrides: Overrides = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const key = `${method} ${url.replace(/^.*(\/api)/, "$1").split("?")[0]}`;
    if (overrides[key]) return Promise.resolve(overrides[key]());
    if (key === "GET /api/specializations") return Promise.resolve(res(200, specs));
    if (key === "GET /api/admin/catalog-terms") return Promise.resolve(res(200, terms));
    if (key === "GET /api/admin/users") return Promise.resolve(res(200, { items: [], total: 0 }));
    return Promise.resolve(res(200, {}));
  });
}

beforeEach(() => {
  calls = [];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  route();
});
afterEach(() => vi.unstubAllGlobals());

function termSpecs(): HTMLElement {
  // the term form's own specialization picker (the doctor profile form has one too)
  const el = document.querySelector('[data-wf="i-5-1-2"]');
  if (!el) throw new Error("the term form's specialization picker is missing");
  return el as HTMLElement;
}

function sent(method: string, fragment: string) {
  return calls.filter((c) => c.method === method && c.url.includes(fragment));
}

describe("Admin catalogue", () => {
  it("[AC-034] lists the catalogue terms the API returns, not sample rows", async () => {
    render(<Screen />);
    const table = await screen.findByRole("table", { name: "Disease and symptom catalogue" });
    expect(await within(table).findByText("Migraine")).toBeInTheDocument();
    await waitFor(() => expect(sent("GET", "/api/admin/catalog-terms").length).toBe(1));
    expect(sent("GET", "/api/specializations").length).toBe(1);
  });

  it("[AC-037] adding a term posts it and reloads the catalogue", async () => {
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Term"), "Chest pain");
    await u.click(within(termSpecs()).getByRole("checkbox", { name: /Cardiology/ }));
    await u.click(screen.getByRole("button", { name: "Save term" }));
    await waitFor(() => expect(sent("POST", "/api/admin/catalog-terms").length).toBe(1));
    expect(sent("POST", "/api/admin/catalog-terms")[0].body).toEqual({
      term: "Chest pain",
      kind: "disease",
      specialization_ids: ["s-cardio"],
    });
    await waitFor(() => expect(sent("GET", "/api/admin/catalog-terms").length).toBe(2));
  });

  it("[AC-038] a term with no specialization is refused before any request", async () => {
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Term"), "Dizziness");
    await u.click(screen.getByRole("button", { name: "Save term" }));
    expect(await screen.findByText(/at least one specialization/i)).toBeInTheDocument();
    expect(sent("POST", "/api/admin/catalog-terms")).toHaveLength(0);
  });

  it("[AC-037] a duplicate term is reported as already in the catalogue", async () => {
    route({
      "POST /api/admin/catalog-terms": () => res(409, { code: "duplicate_name" }),
    });
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Term"), "Chest pain");
    await u.click(within(termSpecs()).getByRole("checkbox", { name: /Cardiology/ }));
    await u.click(screen.getByRole("button", { name: "Save term" }));
    expect(await screen.findByText(/already in the catalogue/i)).toBeInTheDocument();
  });

  it("[AC-035] editing a term loads it into the form and saves it with PUT", async () => {
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Edit Migraine" }));
    const field = screen.getByLabelText("Term") as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe("Migraine"));
    await u.clear(field);
    await u.type(field, "Migraine headache");
    await u.click(screen.getByRole("button", { name: "Save term" }));
    await waitFor(() => expect(sent("PUT", "/api/admin/catalog-terms/t-mig").length).toBe(1));
    expect(sent("PUT", "/api/admin/catalog-terms/t-mig")[0].body).toEqual({
      term: "Migraine headache",
      kind: "disease",
      specialization_ids: ["s-neuro"],
    });
  });

  it("[AC-040] deleting a term confirms, calls DELETE and reloads", async () => {
    route({ "DELETE /api/admin/catalog-terms/t-mig": () => res(204) });
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Delete Migraine" }));
    await u.click(await screen.findByRole("button", { name: "Yes, delete" }));
    await waitFor(() => expect(sent("DELETE", "/api/admin/catalog-terms/t-mig").length).toBe(1));
    expect(await screen.findByText(/no longer resolves in patient search/i)).toBeInTheDocument();
    await waitFor(() => expect(sent("GET", "/api/admin/catalog-terms").length).toBe(2));
  });

  it("[AC-040] a failed delete says nothing was changed", async () => {
    route({ "DELETE /api/admin/catalog-terms/t-mig": () => res(500, { detail: "boom" }) });
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Delete Migraine" }));
    await u.click(await screen.findByRole("button", { name: "Yes, delete" }));
    expect(await screen.findByText(/Nothing was changed/i)).toBeInTheDocument();
  });

  it("[AC-040] cancelling a delete leaves the term alone", async () => {
    render(<Screen />);
    await screen.findByText("Migraine");
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Delete Migraine" }));
    await u.click(await screen.findByRole("button", { name: "Keep it" }));
    expect(sent("DELETE", "/api/admin/catalog-terms/t-mig")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Delete Migraine" })).toBeInTheDocument();
  });

  it("[AC-034] a failing catalogue load shows a load error", async () => {
    route({ "GET /api/admin/catalog-terms": () => res(500, { detail: "boom" }) });
    render(<Screen />);
    expect(await screen.findByText(/Could not load the catalogue/i)).toBeInTheDocument();
  });
});
