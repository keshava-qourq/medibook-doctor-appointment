import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { Button, Card, CardContent, Empty, Input, Label, Select } from "@/lib/ui";
import { formatClinicDate, formatClinicTime } from "@/lib/clinicTime";

export interface DoctorOption {
  id: string;
  full_name: string;
}

export interface AvailabilitySlot {
  slot_start: string;
  slot_end: string;
  available: boolean;
}

export interface AvailabilityResponse {
  timezone: string;
  items: AvailabilitySlot[];
  total: number;
}

// A short poll keeps the list fresh without a push layer (NFR-015): a slot taken
// elsewhere turns unavailable within one interval, no manual reload needed.
const DEFAULT_REFRESH_MS = 15000;

interface Props {
  doctors?: DoctorOption[];
  initialDoctorId?: string;
  initialDate?: string;
  refreshIntervalMs?: number;
}

export default function PatientAvailability({
  doctors = [],
  initialDoctorId = "",
  initialDate = "",
  refreshIntervalMs = DEFAULT_REFRESH_MS,
}: Props) {
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState(initialDate);

  const enabled = Boolean(doctorId && date);

  const availability = useQuery({
    // The key carries the current selection, so changing the doctor or the date
    // clears the previous slots (nothing cached, gcTime 0) and fetches afresh.
    queryKey: ["availability", doctorId, date],
    queryFn: () =>
      apiFetch<AvailabilityResponse>(
        `/api/doctors/${doctorId}/availability?date_from=${date}&date_to=${date}`,
      ),
    enabled,
    retry: false,
    // Fetch fresh on open, never serve a cached copy, and poll on a short interval.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchInterval: refreshIntervalMs,
  });

  const timezone = availability.data?.timezone;
  const slots = availability.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--brand-font-heading)" }}>
        Available appointments
      </h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Label htmlFor="pa-doctor">Doctor</Label>
          <Select id="pa-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Choose a doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="pa-date">Date</Label>
          <Input id="pa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <section aria-label="Availability" className="mt-8">
        {!enabled ? (
          <Empty
            title="Choose a doctor and a date"
            description="Pick a doctor and a date to see their available appointment times."
          />
        ) : availability.isPending ? (
          <p className="text-sm">Loading availability…</p>
        ) : availability.isError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            We could not load availability for this doctor and date. Please try again — no times can
            be booked until it loads.
          </p>
        ) : slots.length === 0 ? (
          <Empty
            title="No available appointments"
            description={`There are no open slots for ${formatClinicDate(date)}. Try another date.`}
          />
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {`All times are shown in the clinic timezone, ${timezone}.`}
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {slots.map((slot) => {
                const label = `${formatClinicTime(slot.slot_start, timezone)}–${formatClinicTime(
                  slot.slot_end,
                  timezone,
                )}`;
                return (
                  <li key={slot.slot_start}>
                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <span className="text-sm font-medium">{label}</span>
                        {slot.available ? (
                          <Button type="button" size="sm">
                            Book
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-500">Unavailable</span>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
