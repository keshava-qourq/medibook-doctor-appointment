import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLINIC_DATE_FORMAT,
  CLINIC_DATE_TIME_FORMAT,
  CLINIC_TIME_FORMAT,
  DEFAULT_CLINIC_TIMEZONE,
  fetchClinicTimezone,
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  setClinicTimezone,
} from "./clinicTime";

// The test process has no @types/node; declare the one global we touch.
declare const process: { env: Record<string, string | undefined> };

// The test process runs in a device timezone that is deliberately not the clinic's.
// vitest.config sets none, so make it explicit here.
const DEVICE_TZ = "America/Los_Angeles";
const CLINIC_TZ = "Europe/London";

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.TZ = DEVICE_TZ;
  setClinicTimezone(CLINIC_TZ);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setClinicTimezone(DEFAULT_CLINIC_TIMEZONE);
});

describe("clinicTime formatters", () => {
  it("[AC-121] uses the one documented format for date, time and date-time", () => {
    expect(CLINIC_DATE_FORMAT).toBe("d MMM yyyy");
    expect(CLINIC_TIME_FORMAT).toBe("HH:mm");
    expect(CLINIC_DATE_TIME_FORMAT).toBe("d MMM yyyy HH:mm");
    const iso = "2026-07-02T09:30:00+01:00";
    expect(formatClinicDate(iso)).toBe("2 Jul 2026");
    expect(formatClinicTime(iso)).toBe("09:30");
    expect(formatClinicDateTime(iso)).toBe("2 Jul 2026 09:30");
  });

  it("[AC-120] renders in the clinic timezone even when the device timezone differs", () => {
    // 2026-07-02T23:30+01:00 London is 15:30 the same day in Los Angeles: the
    // device timezone must not change what is shown.
    const iso = "2026-07-02T23:30:00+01:00";
    expect(formatClinicDateTime(iso)).toBe("2 Jul 2026 23:30");
    expect(new Date(iso).getHours()).not.toBe(23);
  });

  it("[AC-120] an instant given with another offset is shown in the clinic timezone", () => {
    expect(formatClinicDateTime("2026-01-15T22:00:00+05:30", "Europe/London")).toBe(
      "15 Jan 2026 16:30",
    );
    expect(formatClinicDateTime("2026-01-15T22:00:00+05:30", "Asia/Kolkata")).toBe(
      "15 Jan 2026 22:00",
    );
  });

  it("[AC-120] a bare clinic wall-clock value keeps its wall-clock time", () => {
    expect(formatClinicDateTime("2026-11-13T16:30")).toBe("13 Nov 2026 16:30");
    expect(formatClinicDate("2026-11-13")).toBe("13 Nov 2026");
  });

  it("[AC-120] reads the clinic timezone from GET /api/settings", async () => {
    fetchMock.mockResolvedValue(
      res(200, { timezone: CLINIC_TZ, booking_cutoff_hours: 24, timezone_confirmed: true }),
    );
    await expect(fetchClinicTimezone()).resolves.toBe(CLINIC_TZ);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/settings");
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe("application/json");
  });

  it("[AC-120] defaults to UTC while the timezone is unconfirmed", async () => {
    fetchMock.mockResolvedValue(
      res(200, { timezone: "UTC", booking_cutoff_hours: 24, timezone_confirmed: false }),
    );
    await expect(fetchClinicTimezone()).resolves.toBe("UTC");
  });
});
