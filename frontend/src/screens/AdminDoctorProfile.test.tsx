import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminDoctorProfile from "./AdminDoctorProfile";

const specs = [
  { id: "s-neuro", name: "Neurology" },
  { id: "s-cardio", name: "Cardiology" },
];

const doctor = {
  id: "d1",
  full_name: "Dr Anita Rao",
  specializations: [{ id: "s-neuro", name: "Neurology" }],
  specialization_ids: ["s-neuro"],
  qualifications: "MBBS, MD Neurology",
  bio: "Headache care.",
  location: "Wing B, Room 204",
  consultation_fee: 800,
  is_active: true,
  affected_future_appointments: 0,
};

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string; body: unknown }>;

function route(overrides: Record<string, () => Response> = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });
    const key = `${method} ${
      String(url)
        .replace(/^.*(\/api)/, "$1")
        .split("?")[0]
    }`;
    if (overrides[key]) return Promise.resolve(overrides[key]());
    if (key === "GET /api/doctors")
      return Promise.resolve(
        res(200, { items: [{ id: "d1", full_name: "Dr Anita Rao" }], total: 1 }),
      );
    if (key === "GET /api/doctors/d1") return Promise.resolve(res(200, doctor));
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

async function openDoctor(u: ReturnType<typeof userEvent.setup>) {
  render(<AdminDoctorProfile specializations={specs} />);
  await screen.findByRole("option", { name: "Dr Anita Rao" });
  await u.selectOptions(screen.getByLabelText("Doctor"), "d1");
  await waitFor(() => expect(screen.getByLabelText("Display name")).toHaveValue("Dr Anita Rao"));
}

describe("AdminDoctorProfile", () => {
  it("[AC-026] saves the whole profile with PUT and shows the saved values back", async () => {
    const u = userEvent.setup();
    route({
      "PUT /api/admin/doctors/d1": () =>
        res(200, {
          ...doctor,
          full_name: "Dr Anita R Rao",
          bio: "Headache and epilepsy care.",
          consultation_fee: 950,
        }),
    });
    await openDoctor(u);

    const name = screen.getByLabelText("Display name");
    await u.clear(name);
    await u.type(name, "Dr Anita R Rao");
    const bio = screen.getByLabelText("Biography");
    await u.clear(bio);
    await u.type(bio, "Headache and epilepsy care.");
    const fee = screen.getByLabelText("Consultation fee");
    await u.clear(fee);
    await u.type(fee, "950");
    await u.click(screen.getByRole("checkbox", { name: "Cardiology" }));
    await u.click(screen.getByRole("button", { name: "Save profile" }));

    const put = calls.filter((c) => c.method === "PUT");
    await waitFor(() => expect(put.length).toBe(1));
    expect(put[0].url).toContain("/api/admin/doctors/d1");
    expect(put[0].body).toEqual({
      full_name: "Dr Anita R Rao",
      specialization_ids: ["s-neuro", "s-cardio"],
      qualifications: "MBBS, MD Neurology",
      bio: "Headache and epilepsy care.",
      location: "Wing B, Room 204",
      consultation_fee: 950,
      is_active: true,
    });
    expect(await screen.findByText("Saved Dr Anita R Rao.")).toBeInTheDocument();
    expect(screen.getByText("Headache and epilepsy care.")).toBeInTheDocument();
    expect(screen.getByText(/Consultation fee: 950/)).toBeInTheDocument();
  });

  it("[NFR-013] the fee is informational, payable at the clinic, with no payment control", async () => {
    const u = userEvent.setup();
    await openDoctor(u);
    expect(screen.getAllByText(/payable at the clinic/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /pay|checkout|invoice|refund/i })).toBeNull();
  });

  it("[AC-027] saving with no specialization shows an inline error and keeps what was typed", async () => {
    const u = userEvent.setup();
    await openDoctor(u);
    const name = screen.getByLabelText("Display name");
    await u.clear(name);
    await u.type(name, "Dr Anita Typed");
    await u.click(screen.getByRole("checkbox", { name: "Neurology" }));
    await u.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText(/at least one specialization is required/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
    expect(screen.getByLabelText("Display name")).toHaveValue("Dr Anita Typed");
    expect(screen.getByLabelText("Qualifications")).toHaveValue("MBBS, MD Neurology");
  });

  it("[NFR-022] a 422 from the API maps to the same inline specialization error", async () => {
    const u = userEvent.setup();
    route({
      "PUT /api/admin/doctors/d1": () =>
        res(422, {
          detail: [{ field: "specialization_ids", msg: "At least one specialization is required" }],
        }),
    });
    await openDoctor(u);
    await u.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("At least one specialization is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Dr Anita Rao");
  });

  it("[AC-029] deactivating shows the affected future appointment count and that nothing is cancelled", async () => {
    const u = userEvent.setup();
    route({
      "PUT /api/admin/doctors/d1": () =>
        res(200, { ...doctor, is_active: false, affected_future_appointments: 3 }),
    });
    await openDoctor(u);
    await u.click(screen.getByRole("checkbox", { name: "Active" }));
    await u.click(screen.getByRole("button", { name: "Save profile" }));

    const message = await screen.findByText(
      /3 future appointments remain visible to the patient and the doctor and are not cancelled/i,
    );
    expect(message).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "PUT")[0].body).toMatchObject({ is_active: false });
  });
});
