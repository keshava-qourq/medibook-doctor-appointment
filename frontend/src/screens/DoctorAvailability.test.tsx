import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DoctorAvailability from "./DoctorAvailability";

const TZ = "Asia/Kolkata";

function day(weekday: number, working = false) {
  return working
    ? {
        weekday,
        is_working: true,
        start_time: "09:00",
        end_time: "13:00",
        slot_minutes: 30,
        breaks: [{ start_time: "10:30", end_time: "11:00" }],
      }
    : {
        weekday,
        is_working: false,
        start_time: null,
        end_time: null,
        slot_minutes: null,
        breaks: [],
      };
}

const weekly = {
  timezone: TZ,
  days: [day(0, true), day(1), day(2), day(3), day(4), day(5), day(6)],
};

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string; body: Record<string, unknown> | null }>;

function route(overrides: Record<string, () => Response> = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({
      url: String(url),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const key = `${method} ${
      String(url)
        .replace(/^.*(\/api)/, "$1")
        .split("?")[0]
    }`;
    if (overrides[key]) return Promise.resolve(overrides[key]());
    if (key === "GET /api/doctors/me/weekly-availability") return Promise.resolve(res(200, weekly));
    if (key === "GET /api/doctors/me/exceptions")
      return Promise.resolve(res(200, { items: [], total: 0 }));
    return Promise.resolve(res(200, {}));
  });
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DoctorAvailability />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  calls = [];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  route();
});
afterEach(() => vi.unstubAllGlobals());

const sent = (method: string, fragment: string) =>
  calls.filter((c) => c.method === method && c.url.includes(fragment));

describe("DoctorAvailability", () => {
  it("[AC-049] loads the seven-day week labelled with the clinic timezone and saves it with PUT", async () => {
    route({
      "PUT /api/doctors/me/weekly-availability": () =>
        res(200, {
          ...weekly,
          days: [{ ...day(0, true), end_time: "14:00" }, ...weekly.days.slice(1)],
          affected_appointments: [],
          affected_count: 0,
        }),
    });
    const u = userEvent.setup();
    renderScreen();

    expect(
      await screen.findByText(/All times are in the clinic timezone, Asia\/Kolkata/),
    ).toBeInTheDocument();
    for (const name of ["Monday", "Tuesday", "Sunday"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByLabelText("Monday start time")).toHaveValue("09:00"));
    expect(screen.getByLabelText("Monday slot length (minutes)")).toHaveValue(30);
    expect(screen.getByLabelText("Monday break 1 start")).toHaveValue("10:30");

    const end = screen.getByLabelText("Monday end time");
    await u.clear(end);
    await u.type(end, "14:00");
    await u.click(screen.getByRole("button", { name: "Save weekly availability" }));

    await waitFor(() => expect(sent("PUT", "/api/doctors/me/weekly-availability")).toHaveLength(1));
    const body = sent("PUT", "/api/doctors/me/weekly-availability")[0].body as {
      days: Array<Record<string, unknown>>;
    };
    expect(body.days).toHaveLength(7);
    expect(body.days[0]).toEqual({
      weekday: 0,
      is_working: true,
      start_time: "09:00",
      end_time: "14:00",
      slot_minutes: 30,
      breaks: [{ start_time: "10:30", end_time: "11:00" }],
    });
    expect(await screen.findByText("Weekly availability saved.")).toBeInTheDocument();
    expect(
      screen.getByText("Monday: 09:00–14:00, 30 minute slots, breaks 10:30–11:00"),
    ).toBeInTheDocument();
  });

  it("[AC-050] an end time not after the start is rejected inline on that day, nothing is sent and what was typed is kept", async () => {
    const u = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText("Monday start time")).toHaveValue("09:00"));

    const end = screen.getByLabelText("Monday end time");
    await u.clear(end);
    await u.type(end, "08:00");
    await u.click(screen.getByRole("button", { name: "Save weekly availability" }));

    expect(
      await screen.findByText("Monday: End time must be later than start time"),
    ).toBeInTheDocument();
    expect(sent("PUT", "/api/doctors/me/weekly-availability")).toHaveLength(0);
    expect(screen.getByLabelText("Monday end time")).toHaveValue("08:00");
    // the previously saved pattern stays displayed as in force
    expect(
      screen.getByText("Monday: 09:00–13:00, 30 minute slots, breaks 10:30–11:00"),
    ).toBeInTheDocument();
  });

  it("[AC-051] two overlapping breaks on one day are refused with the overlap message", async () => {
    const u = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText("Monday start time")).toHaveValue("09:00"));

    await u.click(screen.getByRole("button", { name: "Add a break on Monday" }));
    await u.type(screen.getByLabelText("Monday break 2 start"), "10:45");
    await u.type(screen.getByLabelText("Monday break 2 end"), "11:30");
    await u.click(screen.getByRole("button", { name: "Save weekly availability" }));

    expect(await screen.findByText("Break periods may not overlap")).toBeInTheDocument();
    expect(sent("PUT", "/api/doctors/me/weekly-availability")).toHaveLength(0);
  });

  it("[AC-052] affected appointments returned by the PUT are listed as preserved, not cancelled", async () => {
    route({
      "PUT /api/doctors/me/weekly-availability": () =>
        res(200, {
          ...weekly,
          affected_appointments: [
            {
              id: "a1",
              patient_name: "Meera Kulkarni",
              slot_start: "2026-11-16T09:30:00+05:30",
              status: "booked",
            },
          ],
          affected_count: 1,
        }),
    });
    const u = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText("Monday start time")).toHaveValue("09:00"));
    await u.click(screen.getByRole("button", { name: "Save weekly availability" }));

    expect(
      await screen.findByText(/1 booked appointment fall.*preserved, not cancelled/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Meera Kulkarni · 16 Nov 2026 09:30 · booked/)).toBeInTheDocument();
  });

  it("[AC-056] a past exception date is refused inline with the today-or-future message", async () => {
    const u = userEvent.setup();
    renderScreen();
    await screen.findByText(/All times are in the clinic timezone/);

    await u.type(screen.getByLabelText("Date"), "2020-01-01");
    await u.type(screen.getByLabelText("Reason"), "Conference");
    await u.click(screen.getByRole("button", { name: "Save exception" }));

    expect(
      await screen.findByText("Exceptions can only be set for today or future dates"),
    ).toBeInTheDocument();
    expect(sent("POST", "/api/doctors/me/exceptions")).toHaveLength(0);
    expect(screen.getByLabelText("Reason")).toHaveValue("Conference");
  });

  it("[AC-055] an extra-hours window is posted and listed", async () => {
    const created = {
      id: "e1",
      date: "2099-01-05",
      kind: "extra_hours",
      start_time: "14:00",
      end_time: "17:00",
      reason: null,
    };
    let saved = false;
    route({
      "POST /api/doctors/me/exceptions": () => {
        saved = true;
        return res(201, { ...created, cancelled_appointments: [] });
      },
      "GET /api/doctors/me/exceptions": () =>
        res(200, saved ? { items: [created], total: 1 } : { items: [], total: 0 }),
    });
    const u = userEvent.setup();
    renderScreen();
    await screen.findByText("No exceptions recorded.");

    await u.type(screen.getByLabelText("Date"), "2099-01-05");
    await u.selectOptions(screen.getByLabelText("Kind"), "extra_hours");
    await u.type(screen.getByLabelText("Exception start time"), "14:00");
    await u.type(screen.getByLabelText("Exception end time"), "17:00");
    await u.click(screen.getByRole("button", { name: "Save exception" }));

    await waitFor(() => expect(sent("POST", "/api/doctors/me/exceptions")).toHaveLength(1));
    expect(sent("POST", "/api/doctors/me/exceptions")[0].body).toEqual({
      date: "2099-01-05",
      kind: "extra_hours",
      start_time: "14:00",
      end_time: "17:00",
      reason: null,
      confirm: false,
    });
    expect(await screen.findByText("2099-01-05 · Extra hours 14:00–17:00")).toBeInTheDocument();
  });

  it("[AC-053][AC-054] a 409 lists the booked appointments and only an explicit confirm re-posts and reports the cancellations", async () => {
    const affected = [
      {
        id: "a9",
        patient_name: "Daniel Okafor",
        slot_start: "2099-02-10T10:00:00+05:30",
        status: "booked",
      },
    ];
    let confirmed = false;
    route({
      "POST /api/doctors/me/exceptions": () => {
        const body = calls[calls.length - 1].body as { confirm?: boolean };
        if (!body?.confirm) {
          return res(409, { code: "confirmation_required", affected_appointments: affected });
        }
        confirmed = true;
        return res(201, {
          id: "e2",
          date: "2099-02-10",
          kind: "unavailable",
          start_time: null,
          end_time: null,
          reason: "Conference",
          cancelled_appointments: affected,
        });
      },
    });
    const u = userEvent.setup();
    renderScreen();
    await screen.findByText(/All times are in the clinic timezone/);

    await u.type(screen.getByLabelText("Date"), "2099-02-10");
    await u.type(screen.getByLabelText("Reason"), "Conference");
    await u.click(screen.getByRole("button", { name: "Save exception" }));

    expect(
      await screen.findByText(/1 booked appointment fall inside this unavailable period/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Daniel Okafor · 10 Feb 2099 10:00 · booked/)).toBeInTheDocument();
    expect(sent("POST", "/api/doctors/me/exceptions")).toHaveLength(1);
    expect(confirmed).toBe(false);

    await u.click(screen.getByRole("button", { name: "Confirm and cancel these appointments" }));

    await waitFor(() => expect(sent("POST", "/api/doctors/me/exceptions")).toHaveLength(2));
    expect(sent("POST", "/api/doctors/me/exceptions")[1].body).toMatchObject({ confirm: true });
    expect(
      await screen.findByText(/1 appointment was cancelled with the reason "Conference"/),
    ).toBeInTheDocument();
  });

  it("[AC-057] no sample data, no payment control and no language selector appear", async () => {
    renderScreen();
    await screen.findByText(/All times are in the clinic timezone/);
    expect(screen.queryByText(/Meera Kulkarni|Sofia Marini|Europe\/London/)).toBeNull();
    expect(screen.queryByRole("button", { name: /pay|checkout|invoice|refund/i })).toBeNull();
    expect(screen.queryByLabelText(/language/i)).toBeNull();
  });
});
