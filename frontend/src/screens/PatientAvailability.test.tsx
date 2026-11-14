import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PatientAvailability from "./PatientAvailability";

const TZ = "Asia/Kolkata";
const DOCTORS = [
  { id: "d1", full_name: "Dr Anita Rao" },
  { id: "d2", full_name: "Dr Owen Brennan" },
];

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function slot(start: string, end: string, available: boolean) {
  return { slot_start: start, slot_end: end, available };
}

function payload(items: ReturnType<typeof slot>[]) {
  return { timezone: TZ, items, total: items.length };
}

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string }>;

function route(responder: (url: string) => Response) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET" });
    return Promise.resolve(responder(String(url)));
  });
}

function renderScreen(props: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PatientAvailability doctors={DOCTORS} {...props} />
    </QueryClientProvider>,
  );
}

const availCalls = () => calls.filter((c) => c.url.includes("/availability"));

beforeEach(() => {
  calls = [];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("PatientAvailability", () => {
  it("[AC-061] fetches slots fresh on open and renders a taken slot as not bookable", async () => {
    route(() =>
      res(
        200,
        payload([
          slot("2026-11-20T09:00:00+05:30", "2026-11-20T09:30:00+05:30", true),
          slot("2026-11-20T09:30:00+05:30", "2026-11-20T10:00:00+05:30", false),
        ]),
      ),
    );
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20" });

    expect(await screen.findByText("09:00–09:30")).toBeInTheDocument();
    await waitFor(() => expect(availCalls().length).toBeGreaterThanOrEqual(1));
    expect(availCalls()[0].url).toContain(
      "/api/doctors/d1/availability?date_from=2026-11-20&date_to=2026-11-20",
    );
    // the taken slot is shown as unavailable with no Book control
    const taken = screen.getByText("09:30–10:00").closest("li") as HTMLElement;
    expect(within(taken).getByText("Unavailable")).toBeInTheDocument();
    expect(within(taken).queryByRole("button", { name: "Book" })).toBeNull();
    // the open slot is bookable
    const open = screen.getByText("09:00–09:30").closest("li") as HTMLElement;
    expect(within(open).getByRole("button", { name: "Book" })).toBeInTheDocument();
  });

  it("[AC-062] a short refetch interval updates the list so a newly taken slot becomes unavailable", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let available = true;
    route(() =>
      res(
        200,
        payload([slot("2026-11-20T09:00:00+05:30", "2026-11-20T09:30:00+05:30", available)]),
      ),
    );
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20", refreshIntervalMs: 5000 });

    expect(await screen.findByRole("button", { name: "Book" })).toBeInTheDocument();

    // the slot is taken elsewhere; the next poll must reflect it
    available = false;
    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => expect(screen.getByText("Unavailable")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
    expect(availCalls().length).toBeGreaterThanOrEqual(2);
  });

  it("[AC-063] changing the doctor clears the previous slots and fetches the new selection fresh", async () => {
    route((url) =>
      url.includes("/doctors/d1/")
        ? res(200, payload([slot("2026-11-20T09:00:00+05:30", "2026-11-20T09:30:00+05:30", true)]))
        : res(200, payload([slot("2026-11-20T14:00:00+05:30", "2026-11-20T14:30:00+05:30", true)])),
    );
    const u = userEvent.setup();
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20" });

    expect(await screen.findByText("09:00–09:30")).toBeInTheDocument();

    await u.selectOptions(screen.getByLabelText("Doctor"), "d2");

    // the previous doctor's slot is gone and the new doctor's is shown
    await waitFor(() => expect(screen.queryByText("09:00–09:30")).toBeNull());
    expect(await screen.findByText("14:00–14:30")).toBeInTheDocument();
    expect(availCalls().some((c) => c.url.includes("/doctors/d2/availability"))).toBe(true);
  });

  it("[AC-063] changing the date clears the previous slots and fetches fresh for the new date", async () => {
    route((url) =>
      url.includes("date_from=2026-11-20")
        ? res(200, payload([slot("2026-11-20T09:00:00+05:30", "2026-11-20T09:30:00+05:30", true)]))
        : res(200, payload([slot("2026-11-21T11:00:00+05:30", "2026-11-21T11:30:00+05:30", true)])),
    );
    const u = userEvent.setup();
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20" });

    expect(await screen.findByText("09:00–09:30")).toBeInTheDocument();

    await u.clear(screen.getByLabelText("Date"));
    await u.type(screen.getByLabelText("Date"), "2026-11-21");

    await waitFor(() => expect(screen.queryByText("09:00–09:30")).toBeNull());
    expect(await screen.findByText("11:00–11:30")).toBeInTheDocument();
    expect(availCalls().some((c) => c.url.includes("date_from=2026-11-21"))).toBe(true);
  });

  it("[AC-064] shows an explicit error and renders no bookable slot when availability cannot be fetched", async () => {
    route(() => res(500, { detail: "boom" }));
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load availability/i);
    expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
  });

  it("[AC-063] slot times are shown in the clinic timezone, never the device timezone", async () => {
    // 23:30 +05:30 is still 23:30 in Kolkata but an earlier hour elsewhere.
    route(() =>
      res(200, payload([slot("2026-11-20T23:30:00+05:30", "2026-11-21T00:00:00+05:30", true)])),
    );
    renderScreen({ initialDoctorId: "d1", initialDate: "2026-11-20" });
    expect(await screen.findByText("23:30–00:00")).toBeInTheDocument();
    expect(
      screen.getByText(/All times are shown in the clinic timezone, Asia\/Kolkata/),
    ).toBeInTheDocument();
  });

  it("[NFR-023] prompts for a doctor and date before any fetch", async () => {
    route(() => res(200, payload([])));
    renderScreen();
    expect(await screen.findByText("Choose a doctor and a date")).toBeInTheDocument();
    expect(availCalls()).toHaveLength(0);
  });
});
