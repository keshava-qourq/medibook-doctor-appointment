import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const patient = { id: "1", full_name: "P", email: "p@example.test", role: "patient" };
const profile = {
  id: "1",
  full_name: "P",
  email: "p@example.test",
  phone: null,
  date_of_birth: null,
  gender: null,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("session_token", crypto.randomUUID());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/patients/me")
        ? jsonResponse(200, profile)
        : jsonResponse(200, patient),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("My Profile routing", () => {
  it("[AC-018] /my-profile renders My Profile for a signed-in patient", async () => {
    render(
      <MemoryRouter initialEntries={["/my-profile"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /my profile/i })).toBeInTheDocument();
  });

  it("[AC-018] /profile renders My Profile for a signed-in patient", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /my profile/i })).toBeInTheDocument();
  });
});
