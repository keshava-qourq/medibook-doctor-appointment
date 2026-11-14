import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { Button, Card, CardContent } from "@/lib/ui";
import { FEE_NOTE, type DoctorCard } from "@/screens/FindADoctor";

const UNAVAILABLE = "This doctor is no longer available.";

export default function DoctorProfile() {
  const { doctorId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/find-a-doctor";

  const doctor = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => apiFetch<DoctorCard>(`/api/doctors/${doctorId}`),
    retry: false,
  });

  const gone = doctor.error instanceof ApiError && doctor.error.status === 404;

  useEffect(() => {
    if (!gone) return undefined;
    const id = setTimeout(
      () => navigate(from, { replace: true, state: { notice: UNAVAILABLE } }),
      600,
    );
    return () => clearTimeout(id);
  }, [gone, from, navigate]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Button type="button" variant="secondary" onClick={() => navigate(from)}>
        Back to results
      </Button>

      {doctor.isPending ? <p className="mt-6 text-sm">Loading the doctor…</p> : null}

      {gone ? (
        <p role="alert" className="mt-6 text-sm font-semibold">
          {UNAVAILABLE} Returning you to the result list.
        </p>
      ) : null}

      {doctor.isError && !gone ? (
        <p role="alert" className="mt-6 text-sm font-medium text-red-700">
          We could not load this doctor. Please try again.
        </p>
      ) : null}

      {doctor.data ? (
        <Card className="mt-6">
          <CardContent className="p-5">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--brand-font-heading)" }}
            >
              {doctor.data.full_name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {doctor.data.specializations.map((s) => s.name).join(", ")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {doctor.data.qualifications ?? "Qualifications not recorded"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {doctor.data.consultation_fee === null
                ? "Consultation fee not recorded"
                : `Consultation fee: ${doctor.data.consultation_fee}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">{FEE_NOTE}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
