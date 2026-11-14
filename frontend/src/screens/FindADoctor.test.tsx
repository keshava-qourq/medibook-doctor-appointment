import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FindADoctor from "./FindADoctor";
import DoctorProfile from "./DoctorProfile";

const spec = { id: "s1", name: "Neurology" };
const doctor = {
  id: "d1",
  full_name: "Dr Anita Rao",
  specializations: [spec],
  qualifications: "MBBS, MD Neurology",
  consultation_fee: 800,
  is_active: true,
};

function res(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

function renderScreen(path = "/find-a-doctor") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/find-a-doctor" element={<FindADoctor />} />
          <Route path="/doctors/:doctorId" element={<DoctorProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.useRealTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function routeBy(map: Record<string, () => Response>) {
  fetchMock.mockImplementation((url: string) => {
    const u = String(url);
    for (const [fragment, make] of Object.entries(map)) {
      if (u.includes(fragment)) return Promise.resolve(make());
    }
    return Promise.resolve(res(200, {}));
  });
}

describe("Find a Doctor", () => {
  it("[AC-041] one character queries nothing, two or more show the suggestions returned", async () => {
    routeBy({
      "/api/catalog/suggest": () =>
        res(200, {
          items: [{ id: "t1", term: "Migraine", entry_type: "disease", specializations: [spec] }],
          total: 1,
        }),
    });
    const u = userEvent.setup();
    renderScreen();
    const box = screen.getByLabelText(/disease, symptom or specialization/i);
    await u.type(box, "m");
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Migraine")).toBeNull();

    await u.type(box, "ig");
    expect(await screen.findByText("Migraine")).toBeInTheDocument();
    expect(screen.getByText("(disease)")).toBeInTheDocument();
    await waitFor(() =>
      expect(String(fetchMock.mock.calls[0][0])).toContain("/api/catalog/suggest?q=mig"),
    );
  });

  it("[AC-042][AC-045] selecting a suggestion lists the doctors with fee and the payable-at-clinic note", async () => {
    routeBy({
      "/api/catalog/suggest": () =>
        res(200, {
          items: [{ id: "t1", term: "Migraine", entry_type: "disease", specializations: [spec] }],
          total: 1,
        }),
      "/api/search/doctors": () =>
        res(200, { items: [doctor], total: 1, resolution: "matched", specializations: [spec] }),
    });
    const u = userEvent.setup();
    renderScreen();
    await u.type(screen.getByLabelText(/disease, symptom or specialization/i), "mig");
    await u.click(await screen.findByText("Migraine"));
    expect(await screen.findByText("Dr Anita Rao")).toBeInTheDocument();
    expect(screen.getByText("MBBS, MD Neurology")).toBeInTheDocument();
    expect(screen.getByText(/Consultation fee: 800/)).toBeInTheDocument();
    expect(screen.getAllByText(/payable at the clinic/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /pay|checkout|invoice|refund/i })).toBeNull();
  });

  it("[AC-043] a no_match resolution shows no match found and can browse the specializations", async () => {
    routeBy({
      "/api/search/doctors": () =>
        res(200, { items: [], total: 0, resolution: "no_match", specializations: [] }),
      "/api/specializations": () => res(200, { items: [{ ...spec, description: null }], total: 1 }),
    });
    const u = userEvent.setup();
    renderScreen("/find-a-doctor?term=zzzz");
    expect(await screen.findByText(/no match found/i)).toBeInTheDocument();
    expect(screen.getByText(/try a different term/i)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /browse all specializations/i }));
    expect(await screen.findByRole("button", { name: "Neurology" })).toBeInTheDocument();
  });

  it("[AC-044] a no_specialist_available resolution explains the clinic has no specialist", async () => {
    routeBy({
      "/api/search/doctors": () =>
        res(200, {
          items: [],
          total: 0,
          resolution: "no_specialist_available",
          specializations: [spec],
        }),
    });
    renderScreen("/find-a-doctor?term=jointpain");
    expect(
      await screen.findByText(/clinic has no available specialist for that condition/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no match found/i)).toBeNull();
  });

  it("[AC-044] a failed search shows an explicit error state", async () => {
    routeBy({ "/api/search/doctors": () => res(500, { detail: "boom" }) });
    renderScreen("/find-a-doctor?term=migraine");
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the doctors/i);
  });

  it("[AC-046] the doctor-name filter narrows the list, is shown and is clearable", async () => {
    const other = { ...doctor, id: "d2", full_name: "Dr Beta Singh" };
    routeBy({
      "/api/search/doctors": () =>
        res(200, {
          items: [doctor, other],
          total: 2,
          resolution: "matched",
          specializations: [spec],
        }),
    });
    const u = userEvent.setup();
    renderScreen("/find-a-doctor?term=migraine");
    expect(await screen.findByText("Dr Beta Singh")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/doctor name/i), "Anita");
    await waitFor(() => expect(screen.queryByText("Dr Beta Singh")).toBeNull());
    const chip = screen.getByRole("button", { name: /doctor name: Anita/i });
    expect(chip).toBeInTheDocument();
    await u.click(chip);
    expect(await screen.findByText("Dr Beta Singh")).toBeInTheDocument();
  });

  it("[AC-047] selecting a doctor opens the profile with specializations, qualifications and fee", async () => {
    routeBy({
      "/api/search/doctors": () =>
        res(200, { items: [doctor], total: 1, resolution: "matched", specializations: [spec] }),
      "/api/doctors/d1": () => res(200, doctor),
    });
    const u = userEvent.setup();
    renderScreen("/find-a-doctor?term=migraine");
    await u.click(await screen.findByText("Dr Anita Rao"));
    expect(await screen.findByRole("heading", { name: "Dr Anita Rao" })).toBeInTheDocument();
    expect(screen.getByText("Neurology")).toBeInTheDocument();
    expect(screen.getByText("MBBS, MD Neurology")).toBeInTheDocument();
    expect(screen.getByText(/Consultation fee: 800/)).toBeInTheDocument();
    expect(screen.getByText(/payable at the clinic/i)).toBeInTheDocument();
  });

  it("[AC-048] a 404 doctor_unavailable says so and returns the patient to the result list", async () => {
    routeBy({
      "/api/search/doctors": () =>
        res(200, { items: [doctor], total: 1, resolution: "matched", specializations: [spec] }),
      "/api/doctors/d1": () => res(404, { code: "doctor_unavailable" }),
    });
    const u = userEvent.setup();
    renderScreen("/find-a-doctor?term=migraine");
    await u.click(await screen.findByText("Dr Anita Rao"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer available/i);
    expect(await screen.findByLabelText(/disease, symptom or specialization/i)).toBeInTheDocument();
    expect(await screen.findByText("Dr Anita Rao")).toBeInTheDocument();
  });
});
