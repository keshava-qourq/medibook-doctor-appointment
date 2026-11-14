// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RegisterForm } from "@/screens/Register";

const { ArrowLeft, ArrowRight } = Icons;

const PRODUCT = "MediBook – Doctor Appointment & Consultation Management System";
const SCREEN = "Sign In / Register";
const tint = (pct) => `color-mix(in srgb, ${brand.primaryColor} ${pct}%, ${brand.backgroundColor})`;

const TABS = [
  { key: "signin", label: "Sign in", wf: "i-1-0-0" },
  { key: "register", label: "Register as patient", wf: "i-1-0-1" },
];

export default function Screen() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [signInError, setSignInError] = React.useState("");
  const [tab, setTab] = React.useState("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const pill = {
    borderRadius: 999,
    border: 0,
    backgroundColor: tint(8),
    color: brand.primaryColor,
  };
  const ring = { "--tw-ring-color": brand.accentColor };
  const focusCls = "outline-none focus-visible:ring-2";

  const onTabKey = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tab === "signin" ? "register" : "signin";
    setTab(next);
    const el = document.getElementById("at-tab-" + next);
    if (el) el.focus();
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ color: brand.primaryColor, fontFamily: brand.fontBody }}
    >
      <header className="px-10 py-5" style={{ backgroundColor: tint(10) }}>
        <p className="text-lg italic" style={{ fontFamily: brand.fontHeading }}>
          {PRODUCT}
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <main
          className="w-full max-w-md px-9 pb-9 pt-16 text-center"
          style={{ backgroundColor: tint(6), borderRadius: "170px 170px 24px 24px" }}
        >
          <h1 data-wf="b-0-0" className="text-3xl italic" style={{ fontFamily: brand.fontHeading }}>
            Welcome to MediBook
          </h1>
          <p className="mt-2 text-sm lowercase" style={{ color: brand.neutralColor }}>
            welcome back — it is good to see you
          </p>

          <div
            data-wf="b-1-0"
            role="tablist"
            aria-label="Sign in or register"
            className="mt-8 flex gap-1 p-1"
            style={{ borderRadius: 999, backgroundColor: tint(8) }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  id={"at-tab-" + t.key}
                  data-wf={t.wf}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={"at-panel-" + t.key}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  onKeyDown={onTabKey}
                  className={"h-11 flex-1 px-3 text-sm font-semibold transition-colors " + focusCls}
                  style={{
                    ...ring,
                    borderRadius: 999,
                    backgroundColor: active ? brand.primaryColor : "transparent",
                    color: active ? brand.backgroundColor : brand.primaryColor,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <form
            data-wf="b-2-0"
            id="at-panel-signin"
            role="tabpanel"
            aria-labelledby="at-tab-signin"
            hidden={tab !== "signin"}
            className="mt-8 space-y-4 text-left"
            onSubmit={async (e) => {
              e.preventDefault();
              setSignInError("");
              try {
                const res = await apiFetch("/api/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                });
                auth.signIn(res.token, res.user);
                navigate(res.landing);
              } catch (err) {
                const detail =
                  err instanceof ApiError &&
                  err.body &&
                  typeof err.body === "object" &&
                  typeof (err.body as { detail?: unknown }).detail === "string"
                    ? (err.body as { detail: string }).detail
                    : null;
                setSignInError(detail || "Sign in failed. Please try again.");
              }
            }}
          >
            <h2 className="sr-only">Sign in</h2>
            {signInError ? (
              <p role="alert" className="text-sm" style={{ color: brand.primaryColor }}>
                {signInError}
              </p>
            ) : null}
            <div className="space-y-1">
              <label
                htmlFor="at-email"
                className="block pl-4 text-xs lowercase"
                style={{ color: brand.neutralColor }}
              >
                email
              </label>
              <input
                id="at-email"
                data-wf="i-2-0-0"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full px-5 text-sm outline-none"
                style={pill}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="at-password"
                className="block pl-4 text-xs lowercase"
                style={{ color: brand.neutralColor }}
              >
                password
              </label>
              <input
                id="at-password"
                data-wf="i-2-0-1"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full px-5 text-sm outline-none"
                style={pill}
              />
            </div>
            <button
              data-wf="b-3-0"
              type="submit"
              className="h-12 w-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                borderRadius: 999,
                backgroundColor: brand.accentColor,
                color: brand.backgroundColor,
              }}
            >
              Sign in
            </button>
          </form>

          <div
            data-wf="b-2-1"
            id="at-panel-register"
            role="tabpanel"
            aria-labelledby="at-tab-register"
            hidden={tab !== "register"}
            className="mt-8"
          >
            <RegisterForm />
          </div>

          <p className="mt-7 text-xs lowercase" style={{ color: brand.neutralColor }}>
            new here?{" "}
            <button
              type="button"
              className="italic underline underline-offset-4"
              style={{ color: brand.primaryColor, fontFamily: brand.fontHeading }}
            >
              plant an account
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}
