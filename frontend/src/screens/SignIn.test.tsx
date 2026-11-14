import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/lib/auth";
import SignIn from "./SignIn";

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/sign-in"]}>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/search" element={<p>search landing</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

async function openRegisterAndFill(
  user: ReturnType<typeof userEvent.setup>,
  password = "correct-horse",
) {
  await user.click(screen.getByRole("tab", { name: /register as patient/i }));
  await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
  await user.type(
    screen.getByLabelText(/^email/i, { selector: "#at-reg-email" }),
    "jane@example.com",
  );
  await user.type(screen.getByLabelText(/phone/i), "+15551234567");
  await user.type(screen.getByLabelText(/^password/i, { selector: "#at-reg-password" }), password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("SignIn register tab", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("[AC-001] register tab calls the API, stores the token and navigates to the landing", async () => {
    const token = crypto.randomUUID();
    fetchMock.mockImplementation(() => reply(201, { token, landing: "/search", user: {} }));
    const user = userEvent.setup();
    renderScreen();
    await openRegisterAndFill(user);
    expect(await screen.findByText("search landing")).toBeInTheDocument();
    expect(localStorage.getItem("session_token")).toBe(token);
    const registerCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/auth/register"),
    );
    expect(registerCall).toBeTruthy();
    expect(registerCall![1].credentials).toBeUndefined();
  });

  it("[AC-002] register tab shows email already registered on 409 and does not navigate", async () => {
    fetchMock.mockReturnValue(reply(409, { code: "email_in_use" }));
    const user = userEvent.setup();
    renderScreen();
    await openRegisterAndFill(user);
    expect(await screen.findByText(/email is already registered/i)).toBeInTheDocument();
    expect(screen.queryByText("search landing")).toBeNull();
    expect(localStorage.getItem("session_token")).toBeNull();
  });

  it("[AC-003] register tab shows server 422 field errors inline and preserves values", async () => {
    fetchMock.mockReturnValue(
      reply(422, { detail: [{ field: "password", msg: "weak_password" }] }),
    );
    const user = userEvent.setup();
    renderScreen();
    await openRegisterAndFill(user);
    expect(await screen.findByText("weak_password")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
  });

  it("[AC-003] register tab flags invalid fields client-side without calling the API", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("tab", { name: /register as patient/i }));
    await user.type(
      screen.getByLabelText(/^email/i, { selector: "#at-reg-email" }),
      "not-an-email",
    );
    await user.type(screen.getByLabelText(/^password/i, { selector: "#at-reg-password" }), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    const registerCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/auth/register"),
    );
    expect(registerCall).toBeUndefined();
  });
});
