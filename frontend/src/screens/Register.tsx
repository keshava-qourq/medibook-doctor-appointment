import * as React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { brand } from "@/lib/brand";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type RegisterValues = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

type RegisterSuccess = {
  token: string;
  landing: string;
  user: { id: string; full_name: string; email: string; phone: string; role: "patient" };
};

type FieldError = { field: string; msg: string };

const FIELD_NAMES: Array<keyof RegisterValues> = ["full_name", "email", "phone", "password"];

const tint = (pct: number) =>
  `color-mix(in srgb, ${brand.primaryColor} ${pct}%, ${brand.backgroundColor})`;

const pill = {
  borderRadius: 999,
  border: 0,
  backgroundColor: tint(8),
  color: brand.primaryColor,
};

/**
 * The patient self-registration form. Rendered on its own at `/register` and inside the
 * sign-in screen's "Register as patient" tab, so the field ids are shared.
 */
export function RegisterForm({ className }: { className?: string }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues: { full_name: "", email: "", phone: "", password: "" },
    mode: "onSubmit",
  });
  const [formError, setFormError] = React.useState<string | null>(null);

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    let response: Response;
    try {
      response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
    } catch {
      setFormError("We could not reach the clinic right now. Please try again.");
      return;
    }

    if (response.status === 201) {
      const body = (await response.json()) as RegisterSuccess;
      // Through the auth context, not only storage: the guarded landing reads the
      // context, which would still say "anonymous" and bounce back to /sign-in.
      auth.signIn(body.token, body.user);
      navigate(body.landing || "/search");
      return;
    }

    if (response.status === 409) {
      setFormError("That email is already registered. Sign in instead, or use another address.");
      return;
    }

    if (response.status === 422) {
      const body = (await response.json().catch(() => null)) as { detail?: FieldError[] } | null;
      const details = Array.isArray(body?.detail) ? body!.detail : [];
      let matched = false;
      details.forEach((item) => {
        const name = item.field as keyof RegisterValues;
        if (FIELD_NAMES.includes(name)) {
          matched = true;
          setError(name, { type: "server", message: item.msg });
        }
      });
      if (!matched) setFormError("Please check the details you entered and try again.");
      return;
    }

    setFormError("Registration failed. Please try again.");
  };

  const errorText = (field: keyof RegisterValues) => errors[field]?.message;

  // A plain function, not a nested component: a nested component would be a new type on
  // every render, remounting the inputs and discarding what the user typed (NFR-022).
  const field = (
    id: string,
    name: keyof RegisterValues,
    label: string,
    type: string,
    autoComplete: string,
    registration: ReturnType<typeof register>,
    hint?: string,
  ) => (
    <div key={id} className="space-y-1">
      <label
        htmlFor={id}
        className="block pl-4 text-xs lowercase"
        style={{ color: brand.neutralColor }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={errors[name] ? "true" : undefined}
        aria-describedby={errors[name] ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="h-12 w-full max-w-full px-5 text-sm outline-none"
        style={pill}
        {...registration}
      />
      {errors[name] ? (
        <p id={`${id}-error`} role="alert" className="pl-4 text-xs" style={{ color: "#b91c1c" }}>
          {errorText(name)}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-4 text-xs" style={{ color: brand.neutralColor }}>
          {hint}
        </p>
      ) : null}
    </div>
  );

  return (
    <form
      noValidate
      aria-label="Create a patient account"
      className={"w-full max-w-full space-y-4 text-left " + (className ?? "")}
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="sr-only">Create a patient account</h2>
      {formError ? (
        <p role="alert" className="rounded-2xl px-4 py-3 text-sm" style={{ color: "#b91c1c" }}>
          {formError}
        </p>
      ) : null}
      {field(
        "at-reg-name",
        "full_name",
        "full name",
        "text",
        "name",
        register("full_name", { required: "Full name is required" }),
      )}
      {field(
        "at-reg-email",
        "email",
        "email",
        "email",
        "email",
        register("email", {
          required: "Email is required",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
        }),
      )}
      {field(
        "at-reg-phone",
        "phone",
        "phone number",
        "tel",
        "tel",
        register("phone", { required: "Phone number is required" }),
      )}
      {field(
        "at-reg-password",
        "password",
        "password",
        "password",
        "new-password",
        register("password", {
          required: "Password is required",
          minLength: { value: 8, message: "Password must be at least 8 characters" },
        }),
        "min. 8 characters",
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          borderRadius: 999,
          backgroundColor: brand.accentColor,
          color: brand.backgroundColor,
        }}
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export default function Screen() {
  return (
    <div
      className="flex min-h-screen w-full flex-col overflow-x-hidden"
      style={{ color: brand.primaryColor, fontFamily: brand.fontBody }}
    >
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 md:px-8">
        <main
          className="w-full max-w-md px-5 pb-8 pt-10 text-center sm:px-9"
          style={{ backgroundColor: tint(6), borderRadius: 24 }}
        >
          <h1 className="text-2xl italic sm:text-3xl" style={{ fontFamily: brand.fontHeading }}>
            Create your patient account
          </h1>
          <p className="mt-2 text-sm lowercase" style={{ color: brand.neutralColor }}>
            register once, then book with any doctor at the clinic
          </p>
          <div className="mt-8">
            <RegisterForm />
          </div>
          <p className="mt-7 text-xs lowercase" style={{ color: brand.neutralColor }}>
            already registered?{" "}
            <Link to="/sign-in" className="underline underline-offset-4">
              sign in
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
