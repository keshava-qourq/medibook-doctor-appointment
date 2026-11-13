import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

function jsonResponse(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const patient = { id: "1", full_name: "P", email: "p@example.test", role: "patient" };

describe("auth wiring", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("[AC-017] an unauthenticated visitor to a protected route is sent to sign-in", async () => {
    renderAt("/my-appointments");
    expect(await screen.findByText("Welcome to MediBook")).toBeInTheDocument();
  });

  it("[AC-014] a patient is redirected away from the admin console", async () => {
    localStorage.setItem("session_token", "t");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, patient)),
    );
    renderAt("/admin");
    expect(await screen.findByText("Welcome to MediBook")).toBeInTheDocument();
  });

  it("[AC-005] sign-in stores the token and goes to the landing from the API", async () => {
    const token = crypto.randomUUID();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).endsWith("/api/auth/login")
          ? jsonResponse(200, { token, landing: "/search", user: patient })
          : jsonResponse(200, patient),
      ),
    );
    renderAt("/sign-in");
    await userEvent.type(document.getElementById("at-email")!, "p@example.test");
    await userEvent.type(document.getElementById("at-password")!, "x");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(localStorage.getItem("session_token")).toBe(token));
    expect((await screen.findAllByText("Find a Doctor")).length).toBeGreaterThan(0);
  });

  it("[AC-006] a failed sign-in shows the API message and stores no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { detail: "Invalid credentials" })),
    );
    renderAt("/sign-in");
    await userEvent.type(document.getElementById("at-email")!, "p@example.test");
    await userEvent.type(document.getElementById("at-password")!, "x");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
    expect(localStorage.getItem("session_token")).toBeNull();
  });

  it("[AC-007] sign out calls logout, clears the token and returns to sign-in", async () => {
    localStorage.setItem("session_token", "t");
    const fetchMock = vi.fn(async (url: string) =>
      String(url).endsWith("/api/auth/logout")
        ? jsonResponse(204, null)
        : jsonResponse(200, patient),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/find-a-doctor");
    await userEvent.click(await screen.findByRole("button", { name: /sign out/i }));
    expect(await screen.findByText("Welcome to MediBook")).toBeInTheDocument();
    expect(localStorage.getItem("session_token")).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/api/auth/logout"))).toBe(true);
  });

  it("[AC-008] a 401 from the API clears the token and routes to sign-in", async () => {
    localStorage.setItem("session_token", "t");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { detail: "expired" })),
    );
    renderAt("/find-a-doctor");
    expect(await screen.findByText("Welcome to MediBook")).toBeInTheDocument();
    expect(localStorage.getItem("session_token")).toBeNull();
  });
});
