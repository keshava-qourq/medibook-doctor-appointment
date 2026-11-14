import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DoctorSchedule from "./DoctorSchedule";
import { DEFAULT_CLINIC_TIMEZONE, setClinicTimezone } from "@/lib/clinicTime";

// The test process has no @types/node; declare the one global we touch.
declare const process: { env: Record<string, string | undefined> };

const CLINIC_TZ = "Europe/London";

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // The test process runs in a timezone that is not the clinic's.
  process.env.TZ = "America/Los_Angeles";
  setClinicTimezone(DEFAULT_CLINIC_TIMEZONE);
  fetchMock = vi.fn((url: string) => {
    if (String(url).includes("/api/settings")) {
      return Promise.resolve(
        res(200, { timezone: CLINIC_TZ, booking_cutoff_hours: 24, timezone_confirmed: true }),
      );
    }
    return Promise.resolve(res(200, {}));
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setClinicTimezone(DEFAULT_CLINIC_TIMEZONE);
});

describe("DoctorSchedule timezone label", () => {
  it("[AC-119][AC-120] labels the schedule with the clinic timezone from settings", async () => {
    render(
      <MemoryRouter>
        <DoctorSchedule />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/all times shown in the clinic timezone, Europe\/London/i),
    ).toBeInTheDocument();
  });

  it("[AC-119] shows no language selector", async () => {
    render(
      <MemoryRouter>
        <DoctorSchedule />
      </MemoryRouter>,
    );
    await screen.findByText(/all times shown in the clinic timezone/i);
    expect(screen.queryByLabelText(/language/i)).toBeNull();
    expect(screen.queryByRole("combobox", { name: /language/i })).toBeNull();
  });
});
