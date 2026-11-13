import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Register from "./Register";

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<p>search landing</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

async function fill(password = "longenough1") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/full name/i), "Jane Doe");
  await user.type(screen.getByLabelText(/^email/i), "jane@example.com");
  await user.type(screen.getByLabelText(/phone/i), "+15551234567");
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("Register", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("[AC-001] stores the token and navigates to the landing path", async () => {
    const token = crypto.randomUUID();
    fetchMock.mockReturnValue(reply(201, { token, landing: "/search", user: {} }));
    renderScreen();
    await fill();
    expect(await screen.findByText("search landing")).toBeInTheDocument();
    expect(localStorage.getItem("session_token")).toBe(token);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/auth/register");
    expect(init.credentials).toBeUndefined();
  });

  it("[AC-002] shows email already registered on 409 and keeps the form", async () => {
    fetchMock.mockReturnValue(reply(409, { code: "email_in_use" }));
    renderScreen();
    await fill();
    expect(await screen.findByRole("alert")).toHaveTextContent(/email is already registered/i);
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("jane@example.com");
    expect(localStorage.getItem("session_token")).toBeNull();
  });

  it("[AC-003] shows server 422 field errors inline and preserves values", async () => {
    fetchMock.mockReturnValue(
      reply(422, { detail: [{ field: "password", msg: "weak_password" }] }),
    );
    renderScreen();
    await fill();
    expect(await screen.findByText("weak_password")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("+15551234567");
  });

  it("[AC-003] flags empty, malformed and short fields client-side without calling the API", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText(/^email/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toHaveValue("not-an-email");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
