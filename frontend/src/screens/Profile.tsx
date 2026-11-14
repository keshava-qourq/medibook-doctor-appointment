import * as React from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";

import { ApiError, apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand";

type PatientProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
};

type ProfileValues = {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
};

type PasswordValues = {
  current_password: string;
  new_password: string;
};

const PROFILE_FIELDS: Array<keyof ProfileValues> = [
  "full_name",
  "phone",
  "date_of_birth",
  "gender",
];
const PASSWORD_FIELDS: Array<keyof PasswordValues> = ["current_password", "new_password"];

// 422 bodies are {"detail": [{"field": ..., "msg": ...}]} per the contract.
// Puts each known field's message on its input; returns false when none matched.
function applyFieldErrors<T extends FieldValues>(
  body: unknown,
  known: Array<Path<T>>,
  setError: UseFormSetError<T>,
): boolean {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return false;
  let matched = false;
  for (const raw of detail) {
    const item = raw as { field?: unknown; msg?: unknown; loc?: unknown[] };
    const field = String(
      item.field ?? (Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : ""),
    ) as Path<T>;
    const msg = String(item.msg ?? "");
    if (!msg || !known.includes(field)) continue;
    matched = true;
    setError(field, { type: "server", message: msg });
  }
  return matched;
}

const inputCls = "h-11 w-full rounded-[var(--brand-radius)] border border-slate-300 px-4 text-sm";

export default function Profile() {
  const [profile, setProfile] = React.useState<PatientProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [savedNotice, setSavedNotice] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [passwordNotice, setPasswordNotice] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");

  const profileForm = useForm<ProfileValues>({
    defaultValues: { full_name: "", phone: "", date_of_birth: "", gender: "" },
  });
  const passwordForm = useForm<PasswordValues>({
    defaultValues: { current_password: "", new_password: "" },
  });

  const show = (p: PatientProfile) => {
    setProfile(p);
    profileForm.reset({
      full_name: p.full_name,
      phone: p.phone ?? "",
      date_of_birth: p.date_of_birth ?? "",
      gender: p.gender ?? "",
    });
  };

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<PatientProfile>("/api/patients/me")
      .then((p) => {
        if (cancelled) return;
        show(p);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("We could not load your profile. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    setSavedNotice("");
    setSaveError("");
    try {
      const updated = await apiFetch<PatientProfile>("/api/patients/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: values.full_name,
          phone: values.phone,
          date_of_birth: values.date_of_birth || null,
          gender: values.gender || null,
        }),
      });
      setProfile(updated);
      setSavedNotice("Your profile has been saved.");
    } catch (e) {
      // The values the user typed stay in the form, and `profile` keeps the last
      // saved values on screen (NFR-022).
      if (e instanceof ApiError && e.status === 422) {
        if (!applyFieldErrors(e.body, PROFILE_FIELDS, profileForm.setError))
          setSaveError("Please check the details you entered and try again.");
      } else {
        setSaveError("We could not save your profile. Nothing was changed.");
      }
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    setPasswordNotice("");
    setPasswordError("");
    try {
      await apiFetch<{ status: string }>("/api/patients/me/password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setPasswordNotice("Your password has been changed.");
      passwordForm.reset({ current_password: "", new_password: "" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        if (!applyFieldErrors(e.body, PASSWORD_FIELDS, passwordForm.setError))
          setPasswordError("Please check the details you entered and try again.");
      } else {
        setPasswordError("We could not change your password. Please try again.");
      }
    }
  });

  const fieldError = (id: string, message?: string) =>
    message ? (
      <p id={`${id}-error`} role="alert" className="pl-1 text-xs" style={{ color: "#b91c1c" }}>
        {message}
      </p>
    ) : null;

  return (
    <div
      className="mx-auto w-full max-w-2xl px-4 py-8"
      style={{ color: brand.primaryColor, fontFamily: brand.fontBody }}
    >
      <h1 className="text-2xl" style={{ fontFamily: brand.fontHeading }}>
        My profile
      </h1>

      {loading ? <p className="mt-6 text-sm">Loading your profile…</p> : null}
      {loadError ? (
        <p role="alert" className="mt-6 text-sm" style={{ color: "#b91c1c" }}>
          {loadError}
        </p>
      ) : null}

      {profile ? (
        <>
          <section aria-labelledby="profile-h" className="mt-6">
            <h2 id="profile-h" className="text-lg">
              Your details
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div>
                <dt className="inline font-semibold">Email: </dt>
                <dd className="inline" data-testid="profile-email">
                  {profile.email}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Saved name: </dt>
                <dd className="inline" data-testid="saved-full_name">
                  {profile.full_name}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Saved phone: </dt>
                <dd className="inline" data-testid="saved-phone">
                  {profile.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Saved date of birth: </dt>
                <dd className="inline" data-testid="saved-date_of_birth">
                  {profile.date_of_birth ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Saved gender: </dt>
                <dd className="inline" data-testid="saved-gender">
                  {profile.gender ?? "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-xs" style={{ color: brand.neutralColor }}>
              Your email address cannot be changed.
            </p>
            <form noValidate onSubmit={onSaveProfile} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="pf-full_name" className="block text-xs">
                  Full name
                </label>
                <input
                  id="pf-full_name"
                  className={inputCls}
                  aria-invalid={profileForm.formState.errors.full_name ? "true" : undefined}
                  {...profileForm.register("full_name", { required: "Full name is required" })}
                />
                {fieldError("pf-full_name", profileForm.formState.errors.full_name?.message)}
              </div>
              <div className="space-y-1">
                <label htmlFor="pf-phone" className="block text-xs">
                  Phone
                </label>
                <input
                  id="pf-phone"
                  type="tel"
                  className={inputCls}
                  aria-invalid={profileForm.formState.errors.phone ? "true" : undefined}
                  {...profileForm.register("phone")}
                />
                {fieldError("pf-phone", profileForm.formState.errors.phone?.message)}
              </div>
              <div className="space-y-1">
                <label htmlFor="pf-date_of_birth" className="block text-xs">
                  Date of birth
                </label>
                <input
                  id="pf-date_of_birth"
                  type="date"
                  className={inputCls}
                  aria-invalid={profileForm.formState.errors.date_of_birth ? "true" : undefined}
                  {...profileForm.register("date_of_birth")}
                />
                {fieldError(
                  "pf-date_of_birth",
                  profileForm.formState.errors.date_of_birth?.message,
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="pf-gender" className="block text-xs">
                  Gender
                </label>
                <select
                  id="pf-gender"
                  className={inputCls}
                  aria-invalid={profileForm.formState.errors.gender ? "true" : undefined}
                  {...profileForm.register("gender")}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
                {fieldError("pf-gender", profileForm.formState.errors.gender?.message)}
              </div>
              {saveError ? (
                <p role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
                  {saveError}
                </p>
              ) : null}
              <div aria-live="polite" className="text-sm">
                {savedNotice}
              </div>
              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="h-11 rounded-[var(--brand-radius)] px-6 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: brand.accentColor, color: brand.backgroundColor }}
              >
                Save changes
              </button>
            </form>
          </section>

          <section aria-labelledby="password-h" className="mt-10">
            <h2 id="password-h" className="text-lg">
              Change password
            </h2>
            <form noValidate onSubmit={onChangePassword} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="pf-current_password" className="block text-xs">
                  Current password
                </label>
                <input
                  id="pf-current_password"
                  type="password"
                  autoComplete="current-password"
                  className={inputCls}
                  aria-invalid={passwordForm.formState.errors.current_password ? "true" : undefined}
                  {...passwordForm.register("current_password", {
                    required: "Enter your current password",
                  })}
                />
                {fieldError(
                  "pf-current_password",
                  passwordForm.formState.errors.current_password?.message,
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="pf-new_password" className="block text-xs">
                  New password
                </label>
                <input
                  id="pf-new_password"
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  aria-invalid={passwordForm.formState.errors.new_password ? "true" : undefined}
                  {...passwordForm.register("new_password", {
                    required: "Enter a new password",
                    minLength: { value: 8, message: "Use at least 8 characters" },
                  })}
                />
                {fieldError(
                  "pf-new_password",
                  passwordForm.formState.errors.new_password?.message,
                ) ?? (
                  <p className="pl-1 text-xs" style={{ color: brand.neutralColor }}>
                    min. 8 characters
                  </p>
                )}
              </div>
              {passwordError ? (
                <p role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
                  {passwordError}
                </p>
              ) : null}
              <div aria-live="polite" className="text-sm">
                {passwordNotice}
              </div>
              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="h-11 rounded-[var(--brand-radius)] px-6 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: brand.accentColor, color: brand.backgroundColor }}
              >
                Change password
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
