import { useEffect, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { apiFetch } from "@/lib/api";

/**
 * The one documented date/time format used everywhere in the app (NFR-020, AC-121):
 *
 *   date       d MMM yyyy        e.g. 13 Nov 2026
 *   time       HH:mm (24-hour)   e.g. 09:30
 *   date-time  d MMM yyyy HH:mm  e.g. 13 Nov 2026 09:30
 *
 * Every value is rendered in the single configured clinic timezone and is never
 * converted to the device timezone. Screens label what they render with the
 * timezone returned by `useClinicTimezone()`.
 */
export const CLINIC_DATE_FORMAT = "d MMM yyyy";
export const CLINIC_TIME_FORMAT = "HH:mm";
export const CLINIC_DATE_TIME_FORMAT = "d MMM yyyy HH:mm";

export const DEFAULT_CLINIC_TIMEZONE = "UTC";

export interface ClinicSettings {
  timezone: string;
  booking_cutoff_hours: number;
  timezone_confirmed: boolean;
}

// The single clinic timezone, shared by every screen. It stays "UTC" until the
// settings call reports a confirmed timezone (behaviour rule: the clinic timezone
// defaults to UTC with timezone_confirmed=false).
let currentTimezone = DEFAULT_CLINIC_TIMEZONE;

export function clinicTimezone(): string {
  return currentTimezone;
}

export function setClinicTimezone(timezone: string): void {
  currentTimezone = timezone || DEFAULT_CLINIC_TIMEZONE;
}

export async function fetchClinicTimezone(): Promise<string> {
  const settings = await apiFetch<ClinicSettings>("/api/settings");
  return settings.timezone_confirmed && settings.timezone
    ? settings.timezone
    : DEFAULT_CLINIC_TIMEZONE;
}

/** Reads the clinic timezone from GET /api/settings once and shares it app-wide. */
export function useClinicTimezone(): string {
  const [timezone, setTimezone] = useState(clinicTimezone());
  useEffect(() => {
    let cancelled = false;
    fetchClinicTimezone()
      .then((tz) => {
        if (cancelled) return;
        setClinicTimezone(tz);
        setTimezone(tz);
      })
      .catch(() => {
        // Settings unreachable: keep the UTC default rather than the device timezone.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return timezone;
}

export type ClinicInstant = Date | string | number;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;

/**
 * Turns a value into the instant it denotes:
 *  - a Date or epoch is already an instant;
 *  - an ISO-8601 string with an explicit offset (what the API returns) is parsed as such;
 *  - a bare "yyyy-MM-ddTHH:mm" is clinic wall-clock time, resolved in the clinic timezone.
 */
export function toClinicInstant(value: ClinicInstant, timezone = clinicTimezone()): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (DATE_ONLY.test(value)) return fromZonedTime(`${value}T00:00:00`, timezone);
  if (NAIVE.test(value)) return fromZonedTime(value.replace(" ", "T"), timezone);
  return new Date(value);
}

function render(value: ClinicInstant, pattern: string, timezone: string): string {
  return formatInTimeZone(toClinicInstant(value, timezone), timezone, pattern);
}

export function formatClinicDate(value: ClinicInstant, timezone = clinicTimezone()): string {
  return render(value, CLINIC_DATE_FORMAT, timezone);
}

export function formatClinicTime(value: ClinicInstant, timezone = clinicTimezone()): string {
  return render(value, CLINIC_TIME_FORMAT, timezone);
}

export function formatClinicDateTime(value: ClinicInstant, timezone = clinicTimezone()): string {
  return render(value, CLINIC_DATE_TIME_FORMAT, timezone);
}
