import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, apiFetch } from "@/lib/api";
import { Button, Card, CardContent, Input, Label, Select, Textarea } from "@/lib/ui";

export const SPEC_REQUIRED = "At least one specialization is required.";
export const FEE_NOTE =
  "The consultation fee is informational only and is payable at the clinic. There is no online payment.";

export interface SpecRef {
  id: string;
  name: string;
}
interface DoctorListItem {
  id: string;
  full_name: string;
}
interface SavedProfile {
  id: string;
  full_name: string;
  specializations: SpecRef[];
  specialization_ids: string[];
  qualifications: string | null;
  bio: string | null;
  location: string | null;
  consultation_fee: number | null;
  is_active: boolean;
  affected_future_appointments: number;
}
interface FormValues {
  full_name: string;
  specialization_ids: string[];
  qualifications: string;
  bio: string;
  location: string;
  consultation_fee: string;
  is_active: boolean;
}

const EMPTY: FormValues = {
  full_name: "",
  specialization_ids: [],
  qualifications: "",
  bio: "",
  location: "",
  consultation_fee: "",
  is_active: true,
};

// 422 bodies are {"detail":[{"field":"specialization_ids","msg":"..."}]}.
function specMessage(body: unknown): string | null {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return null;
  for (const entry of detail as Array<{ field?: string; msg?: string; loc?: unknown[] }>) {
    const field = entry.field ?? String(entry.loc?.[entry.loc.length - 1] ?? "");
    if (field === "specialization_ids") return entry.msg ?? SPEC_REQUIRED;
  }
  return null;
}

export default function AdminDoctorProfile({ specializations }: { specializations: SpecRef[] }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY });

  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [saved, setSaved] = useState<SavedProfile | null>(null);
  const [formError, setFormError] = useState("");

  const loadDoctors = useCallback(async () => {
    try {
      const list = await apiFetch<{ items?: DoctorListItem[] }>("/api/doctors?limit=100&offset=0");
      setDoctors(list.items ?? []);
    } catch {
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const pick = async (id: string) => {
    setDoctorId(id);
    setSaved(null);
    setFormError("");
    reset(EMPTY);
    if (!id) return;
    try {
      const d = await apiFetch<SavedProfile>(`/api/doctors/${id}`);
      reset({
        full_name: d.full_name ?? "",
        specialization_ids: d.specialization_ids ?? [],
        qualifications: d.qualifications ?? "",
        bio: d.bio ?? "",
        location: d.location ?? "",
        consultation_fee: d.consultation_fee === null ? "" : String(d.consultation_fee ?? ""),
        is_active: d.is_active ?? true,
      });
    } catch {
      setFormError("Could not load that doctor's profile.");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    setSaved(null);
    if (!doctorId) {
      setFormError("Choose a doctor to edit first.");
      return;
    }
    const fee = values.consultation_fee.trim();
    try {
      const result = await apiFetch<SavedProfile>(`/api/admin/doctors/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: values.full_name,
          specialization_ids: values.specialization_ids,
          qualifications: values.qualifications || null,
          bio: values.bio || null,
          location: values.location || null,
          consultation_fee: fee === "" ? null : Number(fee),
          is_active: values.is_active,
        }),
      });
      setSaved(result);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 422 ? specMessage(e.body) : null;
      if (msg) {
        // Nothing was written: the previously saved values stay in force and the
        // administrator keeps everything already typed.
        setError("specialization_ids", { message: msg });
      } else {
        setFormError("Could not save this profile. Nothing was changed.");
      }
    }
  });

  return (
    <section aria-labelledby="adp-h" className="flex flex-col gap-4">
      <h3 id="adp-h" className="text-xl font-semibold">
        Edit a doctor profile
      </h3>

      <div>
        <Label htmlFor="adp-doctor">Doctor</Label>
        <Select id="adp-doctor" value={doctorId} onChange={(e) => void pick(e.target.value)}>
          <option value="">Choose a doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </Select>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <Label htmlFor="adp-name">Display name</Label>
          <Input id="adp-name" autoComplete="off" {...register("full_name")} />
        </div>

        <fieldset
          className="min-w-0 border-0 p-0"
          aria-describedby={errors.specialization_ids ? "adp-specs-err" : undefined}
        >
          <legend className="text-sm font-medium text-slate-700">Specializations</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {specializations.map((s) => (
              <label key={s.id} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={s.id}
                  {...register("specialization_ids", {
                    validate: (v) => (v && v.length > 0) || SPEC_REQUIRED,
                  })}
                />
                {s.name}
              </label>
            ))}
          </div>
          {errors.specialization_ids ? (
            <p id="adp-specs-err" role="alert" className="mt-1 text-xs font-medium text-red-700">
              {errors.specialization_ids.message}
            </p>
          ) : null}
        </fieldset>

        <div>
          <Label htmlFor="adp-quals">Qualifications</Label>
          <Input id="adp-quals" autoComplete="off" {...register("qualifications")} />
        </div>

        <div>
          <Label htmlFor="adp-bio">Biography</Label>
          <Textarea id="adp-bio" rows={4} {...register("bio")} />
        </div>

        <div>
          <Label htmlFor="adp-location">Clinic room or location</Label>
          <Input id="adp-location" autoComplete="off" {...register("location")} />
        </div>

        <div>
          <Label htmlFor="adp-fee">Consultation fee</Label>
          <Input
            id="adp-fee"
            type="number"
            step="0.01"
            aria-describedby="adp-fee-note"
            {...register("consultation_fee")}
          />
          <p id="adp-fee-note" className="mt-1 text-xs text-slate-500">
            {FEE_NOTE}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register("is_active")} />
          Active
        </label>

        {formError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          Save profile
        </Button>
      </form>

      {saved ? (
        <Card>
          <CardContent className="p-5">
            <p role="status" className="text-sm font-semibold">
              Saved {saved.full_name}.
            </p>
            <p className="mt-1 text-sm">{saved.specializations.map((s) => s.name).join(", ")}</p>
            <p className="text-sm">{saved.qualifications ?? "Qualifications not recorded"}</p>
            <p className="text-sm">{saved.bio ?? "No biography recorded"}</p>
            <p className="text-sm">{saved.location ?? "No clinic room recorded"}</p>
            <p className="text-sm">
              {saved.consultation_fee === null
                ? "Consultation fee not recorded"
                : `Consultation fee: ${saved.consultation_fee}`}
            </p>
            <p className="text-xs text-slate-500">{FEE_NOTE}</p>
            {saved.is_active ? null : (
              <p className="mt-2 text-sm font-medium">
                {`${saved.full_name} is deactivated. ${saved.affected_future_appointments} future appointment${
                  saved.affected_future_appointments === 1 ? "" : "s"
                } remain visible to the patient and the doctor and are not cancelled.`}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
