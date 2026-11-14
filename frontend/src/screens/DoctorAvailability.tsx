import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";

import { ApiError, apiFetch } from "@/lib/api";
import { Button, Card, CardContent, Input, Label, Select } from "@/lib/ui";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const OVERLAP_MESSAGE = "Break periods may not overlap";
export const PAST_DATE_MESSAGE = "Exceptions can only be set for today or future dates";
export const END_AFTER_START_MESSAGE = "End time must be later than start time";
export const SLOT_POSITIVE_MESSAGE = "Slot length must be greater than zero";
export const BREAK_INSIDE_MESSAGE = "Break must fall inside working hours";

interface BreakOut {
  start_time: string;
  end_time: string;
}
interface DayOut {
  weekday: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_minutes: number | null;
  breaks: BreakOut[];
}
interface WeeklyOut {
  timezone: string;
  days: DayOut[];
}
interface AffectedAppointment {
  id: string;
  patient_name: string;
  slot_start: string;
  status: string;
}
interface WeeklySaved extends WeeklyOut {
  affected_appointments?: AffectedAppointment[];
  affected_count?: number;
}
interface ExceptionItem {
  id: string;
  date: string;
  kind: "unavailable" | "extra_hours";
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}
interface ExceptionList {
  items: ExceptionItem[];
  total: number;
}
interface ExceptionCreated extends ExceptionItem {
  cancelled_appointments?: AffectedAppointment[];
}

interface BreakValue {
  start_time: string;
  end_time: string;
}
interface DayValue {
  weekday: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: string;
  breaks: BreakValue[];
}
interface WeeklyForm {
  days: DayValue[];
}
interface ExceptionForm {
  date: string;
  kind: "unavailable" | "extra_hours";
  start_time: string;
  end_time: string;
  reason: string;
}

const EMPTY_WEEK: DayValue[] = DAY_NAMES.map((_, weekday) => ({
  weekday,
  is_working: false,
  start_time: "",
  end_time: "",
  slot_minutes: "",
  breaks: [],
}));

function toMinutes(value: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return Number.NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function toValues(data: WeeklyOut): WeeklyForm {
  const byDay = new Map(data.days.map((d) => [d.weekday, d]));
  return {
    days: DAY_NAMES.map((_, weekday) => {
      const d = byDay.get(weekday);
      return {
        weekday,
        is_working: d?.is_working ?? false,
        start_time: d?.start_time ?? "",
        end_time: d?.end_time ?? "",
        slot_minutes: d?.slot_minutes == null ? "" : String(d.slot_minutes),
        breaks: (d?.breaks ?? []).map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
      };
    }),
  };
}

// 422 bodies name the exact field: {"detail":[{"field":"days[2].end_time","msg":"..."}]}.
function serverFieldErrors(body: unknown): Array<{ name: string; message: string }> {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return [];
  return (detail as Array<{ field?: string; msg?: string }>)
    .filter((e) => e.field && e.msg)
    .map((e) => ({
      name: String(e.field).replace(/\[(\d+)\]/g, ".$1"),
      message: String(e.msg),
    }));
}

function DayBreaks({
  index,
  dayName,
  control,
  register,
  errors,
}: {
  index: number;
  dayName: string;
  control: Control<WeeklyForm>;
  register: UseFormRegister<WeeklyForm>;
  errors: ReturnType<typeof useForm<WeeklyForm>>["formState"]["errors"];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: `days.${index}.breaks` });
  const dayErrors = errors.days?.[index]?.breaks;

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, b) => {
        const startError = dayErrors?.[b]?.start_time?.message;
        const endError = dayErrors?.[b]?.end_time?.message;
        return (
          <div key={field.id} className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor={`break-${index}-${b}-start`}>{`${dayName} break ${
                b + 1
              } start`}</Label>
              <Input
                id={`break-${index}-${b}-start`}
                type="time"
                aria-invalid={startError ? true : undefined}
                {...register(`days.${index}.breaks.${b}.start_time`)}
              />
            </div>
            <div>
              <Label htmlFor={`break-${index}-${b}-end`}>{`${dayName} break ${b + 1} end`}</Label>
              <Input
                id={`break-${index}-${b}-end`}
                type="time"
                aria-invalid={endError ? true : undefined}
                {...register(`days.${index}.breaks.${b}.end_time`)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => remove(b)}
            >{`Remove ${dayName} break ${b + 1}`}</Button>
            {startError ? (
              <p role="alert" className="w-full text-xs font-medium text-red-700">
                {startError}
              </p>
            ) : null}
            {endError ? (
              <p role="alert" className="w-full text-xs font-medium text-red-700">
                {endError}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="button"
        variant="secondary"
        onClick={() => append({ start_time: "", end_time: "" })}
      >
        {`Add a break on ${dayName}`}
      </Button>
    </div>
  );
}

function savedDayLine(day: DayOut): string {
  const name = DAY_NAMES[day.weekday] ?? `Day ${day.weekday}`;
  if (!day.is_working) return `${name}: not working`;
  const breaks = day.breaks.length
    ? `, breaks ${day.breaks.map((b) => `${b.start_time}–${b.end_time}`).join(", ")}`
    : ", no breaks";
  return `${name}: ${day.start_time}–${day.end_time}, ${day.slot_minutes} minute slots${breaks}`;
}

export default function DoctorAvailability() {
  const queryClient = useQueryClient();
  const [affected, setAffected] = useState<AffectedAppointment[]>([]);
  const [weeklyNotice, setWeeklyNotice] = useState("");
  const [weeklyError, setWeeklyError] = useState("");
  const [pending, setPending] = useState<AffectedAppointment[] | null>(null);
  const [exceptionNotice, setExceptionNotice] = useState("");
  const [exceptionError, setExceptionError] = useState("");

  const weekly = useQuery({
    queryKey: ["weekly-availability"],
    queryFn: () => apiFetch<WeeklyOut>("/api/doctors/me/weekly-availability"),
  });
  const exceptions = useQuery({
    queryKey: ["availability-exceptions"],
    queryFn: () => apiFetch<ExceptionList>("/api/doctors/me/exceptions?limit=100&offset=0"),
  });

  const timezone = weekly.data?.timezone ?? "UTC";
  const fmtSlot = (iso: string) => formatInTimeZone(new Date(iso), timezone, "d MMM yyyy HH:mm");

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<WeeklyForm>({ defaultValues: { days: EMPTY_WEEK } });

  useEffect(() => {
    if (weekly.data) reset(toValues(weekly.data));
  }, [weekly.data, reset]);

  const exceptionForm = useForm<ExceptionForm>({
    defaultValues: { date: "", kind: "unavailable", start_time: "", end_time: "", reason: "" },
  });

  const save = useMutation({
    mutationFn: (body: { days: DayOut[] }) =>
      apiFetch<WeeklySaved>("/api/doctors/me/weekly-availability", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  });

  const onSave = handleSubmit(async (values) => {
    clearErrors();
    setWeeklyError("");
    setWeeklyNotice("");
    setAffected([]);

    let invalid = false;
    values.days.forEach((day, i) => {
      if (!day.is_working) return;
      const start = toMinutes(day.start_time);
      const end = toMinutes(day.end_time);
      if (Number.isNaN(start)) {
        setError(`days.${i}.start_time`, { message: "Set a start time" });
        invalid = true;
      }
      if (Number.isNaN(end)) {
        setError(`days.${i}.end_time`, { message: "Set an end time" });
        invalid = true;
      } else if (!Number.isNaN(start) && end <= start) {
        setError(`days.${i}.end_time`, { message: END_AFTER_START_MESSAGE });
        invalid = true;
      }
      const slot = Number(day.slot_minutes);
      if (!day.slot_minutes.trim() || Number.isNaN(slot) || slot <= 0) {
        setError(`days.${i}.slot_minutes`, { message: SLOT_POSITIVE_MESSAGE });
        invalid = true;
      }
      const ranges: Array<{ index: number; from: number; to: number }> = [];
      day.breaks.forEach((b, j) => {
        const from = toMinutes(b.start_time);
        const to = toMinutes(b.end_time);
        if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
          setError(`days.${i}.breaks.${j}.end_time`, { message: END_AFTER_START_MESSAGE });
          invalid = true;
          return;
        }
        if (!Number.isNaN(start) && !Number.isNaN(end) && (from < start || to > end)) {
          setError(`days.${i}.breaks.${j}.start_time`, { message: BREAK_INSIDE_MESSAGE });
          invalid = true;
          return;
        }
        ranges.push({ index: j, from, to });
      });
      const sorted = [...ranges].sort((a, b) => a.from - b.from);
      for (let k = 1; k < sorted.length; k += 1) {
        if (sorted[k].from < sorted[k - 1].to) {
          setError(`days.${i}.breaks.${sorted[k].index}.start_time`, { message: OVERLAP_MESSAGE });
          invalid = true;
          break;
        }
      }
    });

    if (invalid) {
      // Nothing is sent: what was typed stays, and the saved pattern stays in force.
      setWeeklyError("This pattern was not saved. Fix the fields marked below.");
      return;
    }

    const body = {
      days: values.days.map((day) => ({
        weekday: day.weekday,
        is_working: day.is_working,
        start_time: day.is_working ? day.start_time : null,
        end_time: day.is_working ? day.end_time : null,
        slot_minutes: day.is_working ? Number(day.slot_minutes) : null,
        breaks: day.is_working ? day.breaks : [],
      })),
    };

    try {
      const result = await save.mutateAsync(body);
      queryClient.setQueryData(["weekly-availability"], {
        timezone: result.timezone,
        days: result.days,
      });
      setAffected(result.affected_appointments ?? []);
      setWeeklyNotice("Weekly availability saved.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const fields = serverFieldErrors(e.body);
        for (const f of fields) {
          setError(f.name as `days.${number}.end_time`, { message: f.message });
        }
        setWeeklyError(
          fields.length
            ? "This pattern was not saved. Fix the fields marked below."
            : "This pattern was not saved. Nothing was changed.",
        );
      } else {
        setWeeklyError("Could not save your availability. Nothing was changed.");
      }
    }
  });

  const postException = async (values: ExceptionForm, confirm: boolean) => {
    const reason = values.reason.trim();
    return apiFetch<ExceptionCreated>("/api/doctors/me/exceptions", {
      method: "POST",
      body: JSON.stringify({
        date: values.date,
        kind: values.kind,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        reason: reason || null,
        confirm,
      }),
    });
  };

  const afterException = (created: ExceptionCreated, values: ExceptionForm) => {
    const cancelled = created.cancelled_appointments ?? [];
    const reason = values.reason.trim() || "Doctor unavailable";
    setPending(null);
    setExceptionError("");
    setExceptionNotice(
      cancelled.length
        ? `Exception saved. ${cancelled.length} appointment${
            cancelled.length === 1 ? " was" : "s were"
          } cancelled with the reason "${reason}": ${cancelled
            .map((a) => `${a.patient_name} (${fmtSlot(a.slot_start)})`)
            .join(", ")}.`
        : "Exception saved. No booked appointments were affected.",
    );
    exceptionForm.reset({
      date: "",
      kind: "unavailable",
      start_time: "",
      end_time: "",
      reason: "",
    });
    void queryClient.invalidateQueries({ queryKey: ["availability-exceptions"] });
  };

  const handleExceptionError = (e: unknown) => {
    if (e instanceof ApiError && e.status === 409) {
      const body = e.body as {
        code?: string;
        affected_appointments?: AffectedAppointment[];
      } | null;
      if (body?.code === "confirmation_required") {
        setPending(body.affected_appointments ?? []);
        setExceptionError("");
        setExceptionNotice("");
        return;
      }
    }
    if (e instanceof ApiError && e.status === 422) {
      const fields = serverFieldErrors(e.body);
      for (const f of fields) {
        exceptionForm.setError(f.name as keyof ExceptionForm, { message: f.message });
      }
      setExceptionError(
        fields.length
          ? "This exception was not saved. Fix the fields marked below."
          : "This exception was not saved. Nothing was changed.",
      );
      return;
    }
    setExceptionError("Could not save this exception. Nothing was changed.");
  };

  const onSaveException = exceptionForm.handleSubmit(async (values) => {
    exceptionForm.clearErrors();
    setExceptionError("");
    setExceptionNotice("");
    setPending(null);

    const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    let invalid = false;
    if (!values.date) {
      exceptionForm.setError("date", { message: "Choose the date this applies to" });
      invalid = true;
    } else if (values.date < today) {
      exceptionForm.setError("date", { message: PAST_DATE_MESSAGE });
      invalid = true;
    }
    if (values.kind === "extra_hours" && (!values.start_time || !values.end_time)) {
      exceptionForm.setError("end_time", {
        message: "Extra hours need both a start time and an end time",
      });
      invalid = true;
    } else if (
      values.start_time &&
      values.end_time &&
      toMinutes(values.end_time) <= toMinutes(values.start_time)
    ) {
      exceptionForm.setError("end_time", { message: END_AFTER_START_MESSAGE });
      invalid = true;
    }
    if (invalid) {
      setExceptionError("This exception was not saved. Fix the fields marked below.");
      return;
    }

    try {
      afterException(await postException(values, false), values);
    } catch (e) {
      handleExceptionError(e);
    }
  });

  const confirmException = async () => {
    const values = exceptionForm.getValues();
    try {
      afterException(await postException(values, true), values);
    } catch (e) {
      handleExceptionError(e);
    }
  };

  const savedDays = weekly.data?.days ?? [];
  const exceptionErrors = exceptionForm.formState.errors;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">My availability</h1>
        <p className="mt-1 text-sm text-slate-600">
          {`All times are in the clinic timezone, ${timezone}.`}
        </p>
      </header>

      <section aria-labelledby="week-h" className="flex flex-col gap-4">
        <h2 id="week-h" className="text-xl font-semibold">
          Weekly pattern
        </h2>

        {weekly.isPending ? <p className="text-sm">Loading your weekly availability…</p> : null}
        {weekly.isError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            Could not load your weekly availability.
          </p>
        ) : null}

        {weekly.data ? (
          <form onSubmit={onSave} noValidate className="flex flex-col gap-6">
            {DAY_NAMES.map((name, i) => {
              const dayErrors = errors.days?.[i];
              return (
                <fieldset key={name} className="min-w-0 border-0 p-0">
                  <legend className="text-base font-semibold">{name}</legend>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" {...register(`days.${i}.is_working`)} />
                      {`${name} working`}
                    </label>
                    <div>
                      <Label htmlFor={`start-${i}`}>{`${name} start time`}</Label>
                      <Input
                        id={`start-${i}`}
                        type="time"
                        aria-invalid={dayErrors?.start_time ? true : undefined}
                        {...register(`days.${i}.start_time`)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`end-${i}`}>{`${name} end time`}</Label>
                      <Input
                        id={`end-${i}`}
                        type="time"
                        aria-invalid={dayErrors?.end_time ? true : undefined}
                        {...register(`days.${i}.end_time`)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`slot-${i}`}>{`${name} slot length (minutes)`}</Label>
                      <Input
                        id={`slot-${i}`}
                        type="number"
                        aria-invalid={dayErrors?.slot_minutes ? true : undefined}
                        {...register(`days.${i}.slot_minutes`)}
                      />
                    </div>
                  </div>
                  {dayErrors?.start_time ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                      {`${name}: ${dayErrors.start_time.message}`}
                    </p>
                  ) : null}
                  {dayErrors?.end_time ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                      {`${name}: ${dayErrors.end_time.message}`}
                    </p>
                  ) : null}
                  {dayErrors?.slot_minutes ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                      {`${name}: ${dayErrors.slot_minutes.message}`}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <DayBreaks
                      index={i}
                      dayName={name}
                      control={control}
                      register={register}
                      errors={errors}
                    />
                  </div>
                </fieldset>
              );
            })}

            {weeklyError ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                {weeklyError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              Save weekly availability
            </Button>
          </form>
        ) : null}

        {weeklyNotice ? (
          <p role="status" className="text-sm font-semibold">
            {weeklyNotice}
          </p>
        ) : null}

        {savedDays.length ? (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold">Saved pattern in force</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {savedDays.map((d) => (
                  <li key={d.weekday}>{savedDayLine(d)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {affected.length ? (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold">
                {`${affected.length} booked appointment${
                  affected.length === 1 ? "" : "s"
                } fall outside the new pattern. They are preserved, not cancelled.`}
              </h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {affected.map((a) => (
                  <li key={a.id}>{`${a.patient_name} · ${fmtSlot(a.slot_start)} · ${a.status}`}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section aria-labelledby="exc-h" className="flex flex-col gap-4">
        <h2 id="exc-h" className="text-xl font-semibold">
          Exceptions
        </h2>

        <form onSubmit={onSaveException} noValidate className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="exc-date">Date</Label>
            <Input
              id="exc-date"
              type="date"
              aria-invalid={exceptionErrors.date ? true : undefined}
              {...exceptionForm.register("date")}
            />
          </div>
          <div>
            <Label htmlFor="exc-kind">Kind</Label>
            <Select id="exc-kind" {...exceptionForm.register("kind")}>
              <option value="unavailable">Unavailable</option>
              <option value="extra_hours">Extra hours</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="exc-start">Exception start time</Label>
            <Input id="exc-start" type="time" {...exceptionForm.register("start_time")} />
          </div>
          <div>
            <Label htmlFor="exc-end">Exception end time</Label>
            <Input
              id="exc-end"
              type="time"
              aria-invalid={exceptionErrors.end_time ? true : undefined}
              {...exceptionForm.register("end_time")}
            />
          </div>
          <div>
            <Label htmlFor="exc-reason">Reason</Label>
            <Input id="exc-reason" {...exceptionForm.register("reason")} />
          </div>
          <Button type="submit" disabled={exceptionForm.formState.isSubmitting}>
            Save exception
          </Button>
          {exceptionErrors.date ? (
            <p role="alert" className="w-full text-xs font-medium text-red-700">
              {exceptionErrors.date.message}
            </p>
          ) : null}
          {exceptionErrors.end_time ? (
            <p role="alert" className="w-full text-xs font-medium text-red-700">
              {exceptionErrors.end_time.message}
            </p>
          ) : null}
          {exceptionError ? (
            <p role="alert" className="w-full text-sm font-medium text-red-700">
              {exceptionError}
            </p>
          ) : null}
        </form>

        {pending ? (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold">
                {`${pending.length} booked appointment${
                  pending.length === 1 ? "" : "s"
                } fall inside this unavailable period. Confirm to cancel them and save the exception.`}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {pending.map((a) => (
                  <li key={a.id}>{`${a.patient_name} · ${fmtSlot(a.slot_start)} · ${a.status}`}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={() => void confirmException()}>
                  Confirm and cancel these appointments
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPending(null)}>
                  Keep them
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {exceptionNotice ? (
          <p role="status" className="text-sm font-semibold">
            {exceptionNotice}
          </p>
        ) : null}

        <div>
          <h3 className="text-sm font-semibold">Saved exceptions</h3>
          {exceptions.isPending ? <p className="text-sm">Loading your exceptions…</p> : null}
          {exceptions.data && exceptions.data.items.length === 0 ? (
            <p className="text-sm">No exceptions recorded.</p>
          ) : null}
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {(exceptions.data?.items ?? []).map((x) => (
              <li key={x.id}>
                {`${x.date} · ${x.kind === "extra_hours" ? "Extra hours" : "Unavailable"}${
                  x.start_time && x.end_time ? ` ${x.start_time}–${x.end_time}` : " (whole day)"
                }${x.reason ? ` · ${x.reason}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
