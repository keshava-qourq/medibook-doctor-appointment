import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, apiFetch } from "@/lib/api";

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: "doctor" | "admin";
  is_active: boolean;
}
interface UserList {
  items: AdminUser[];
  total: number;
}
interface FormValues {
  full_name: string;
  email: string;
  role: "doctor" | "admin";
  password: string;
}

const LIMIT = 20;
const FIELDS = ["full_name", "email", "role", "password"] as const;

// Reads 422 bodies: {field: msg}, {errors|detail: {field: msg}} or FastAPI [{loc, msg}].
function fieldErrors(body: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const root = (body ?? {}) as Record<string, unknown>;
  const src = root.errors ?? root.detail ?? root;
  if (Array.isArray(src)) {
    for (const e of src as Array<{ loc?: unknown[]; msg?: string }>) {
      const field = String(e.loc?.[e.loc.length - 1] ?? "");
      if (field && e.msg) out[field] = e.msg;
    }
  } else if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
      else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
    }
  }
  return out;
}

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const inputCls = "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const btnCls =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-50";

export default function AdminUsers() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { full_name: "", email: "", role: "doctor", password: "" },
  });
  const [users, setUsers] = useState<UserList>({ items: [], total: 0 });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [secret, setSecret] = useState<{ title: string; password: string } | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      setUsers(await apiFetch<UserList>(`/api/admin/users?limit=${LIMIT}&offset=${offset}`));
    } catch (e) {
      setListError(
        e instanceof ApiError && (e.status === 401 || e.status === 403)
          ? "You do not have access to user management."
          : "Could not load users.",
      );
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    setNotice("");
    try {
      const created = await apiFetch<AdminUser & { initial_password: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setSecret({
        title: `Initial password for ${created.full_name}`,
        password: created.initial_password,
      });
      reset();
      void load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("email", { message: "This email is already in use by another account." });
      } else if (e instanceof ApiError && e.status === 422) {
        const fe = fieldErrors(e.body);
        let any = false;
        for (const f of FIELDS) {
          if (fe[f]) {
            setError(f, { message: fe[f] });
            any = true;
          }
        }
        if (!any) setFormError("Some fields are invalid. Nothing was saved.");
      } else {
        setFormError("Could not create the account. Nothing was saved.");
      }
    }
  });

  const toggleActive = async (u: AdminUser) => {
    setNotice("");
    try {
      await apiFetch<AdminUser>(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      setNotice(
        u.is_active
          ? `${u.full_name} is deactivated and their sessions are now invalid.`
          : `${u.full_name} is active again.`,
      );
      await load();
    } catch {
      setNotice(`Could not update ${u.full_name}.`);
    }
  };

  const resetPassword = async (u: AdminUser) => {
    setNotice("");
    const password = generatePassword();
    try {
      await apiFetch<void>(`/api/admin/users/${u.id}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setSecret({ title: `New password for ${u.full_name}`, password });
      setNotice(`Password reset. All of ${u.full_name}'s existing sessions are now invalid.`);
    } catch {
      setNotice(`Could not reset the password for ${u.full_name}.`);
    }
  };

  const err = (f: keyof FormValues) =>
    errors[f] ? (
      <p id={`au-${f}-err`} role="alert" className="mt-1 text-xs font-medium text-red-700">
        {errors[f]?.message}
      </p>
    ) : null;
  const inv = (f: keyof FormValues) => ({
    "aria-invalid": errors[f] ? (true as const) : undefined,
    "aria-describedby": errors[f] ? `au-${f}-err` : undefined,
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <section aria-labelledby="au-list-h" className="min-w-0 lg:col-span-8">
        <h2 id="au-list-h" className="text-2xl font-semibold">
          Doctor and admin accounts
        </h2>
        {secret ? (
          <div role="status" className="mt-4 rounded-2xl border border-slate-300 bg-white p-4">
            <p className="text-sm font-semibold">{secret.title}</p>
            <p className="mt-1 font-mono text-lg" data-testid="one-time-password">
              {secret.password}
            </p>
            <p className="mt-1 text-xs">
              Shown once. Hand it over now: it cannot be retrieved again.
            </p>
            <button
              type="button"
              className={`${btnCls} mt-2 border`}
              onClick={() => setSecret(null)}
            >
              Done
            </button>
          </div>
        ) : null}
        <div aria-live="polite" className="mt-2 text-sm">
          {notice}
        </div>
        {loading ? <p className="mt-4 text-sm">Loading users…</p> : null}
        {listError ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-700">
            {listError}
          </p>
        ) : null}
        {!loading && !listError && users.items.length === 0 ? (
          <p className="mt-4 text-sm">No accounts yet.</p>
        ) : null}
        {users.items.length > 0 ? (
          <div className="mt-4 w-full overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase">
                  <th scope="col" className="p-2">
                    ID
                  </th>
                  <th scope="col" className="p-2">
                    Name
                  </th>
                  <th scope="col" className="p-2">
                    Email
                  </th>
                  <th scope="col" className="p-2">
                    Role
                  </th>
                  <th scope="col" className="p-2">
                    Active
                  </th>
                  <th scope="col" className="p-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{u.id}</td>
                    <td className="p-2 font-semibold">{u.full_name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role === "doctor" ? "Doctor" : "Administrator"}</td>
                    <td className="p-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          onChange={() => void toggleActive(u)}
                          aria-label={`Active: ${u.full_name}`}
                        />
                        {u.is_active ? "Active" : "Inactive"}
                      </label>
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className={`${btnCls} border`}
                        onClick={() => void resetPassword(u)}
                        aria-label={`Reset password for ${u.full_name}`}
                      >
                        Reset password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            className={`${btnCls} border`}
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          >
            Previous
          </button>
          <span>
            {users.total === 0 ? 0 : offset + 1}–{Math.min(offset + LIMIT, users.total)} of{" "}
            {users.total}
          </span>
          <button
            type="button"
            className={`${btnCls} border`}
            disabled={offset + LIMIT >= users.total}
            onClick={() => setOffset(offset + LIMIT)}
          >
            Next
          </button>
        </div>
      </section>

      <section aria-labelledby="au-create-h" className="min-w-0 lg:col-span-4">
        <h2 id="au-create-h" className="text-2xl font-semibold">
          Create account
        </h2>
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="au-full_name" className="text-sm font-semibold">
              Name
            </label>
            <input
              id="au-full_name"
              className={inputCls}
              autoComplete="off"
              {...register("full_name", { required: "Enter their full name." })}
              {...inv("full_name")}
            />
            {err("full_name")}
          </div>
          <div>
            <label htmlFor="au-email" className="text-sm font-semibold">
              Email
            </label>
            <input
              id="au-email"
              type="email"
              className={inputCls}
              autoComplete="off"
              {...register("email", { required: "Enter an email address." })}
              {...inv("email")}
            />
            {err("email")}
          </div>
          <div>
            <label htmlFor="au-role" className="text-sm font-semibold">
              Role
            </label>
            <select id="au-role" className={inputCls} {...register("role")}>
              <option value="doctor">Doctor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label htmlFor="au-password" className="text-sm font-semibold">
              Initial password
            </label>
            <input
              id="au-password"
              className={inputCls}
              autoComplete="off"
              {...register("password", {
                required: "Enter an initial password.",
                minLength: { value: 8, message: "Use at least 8 characters." },
              })}
              {...inv("password")}
            />
            {err("password")}
          </div>
          {formError ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {formError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${btnCls} bg-slate-800 text-white`}
          >
            Create account
          </button>
        </form>
      </section>
    </div>
  );
}
