import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Profile from "./Profile";

const stored = {
  id: "p1",
  full_name: "Jane Doe",
  email: "jane@example.com",
  phone: "+15551110001",
  date_of_birth: "1988-03-21",
  gender: "female",
};

function res(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("Profile", () => {
  it("[AC-018] shows the loading state then the stored profile with a read-only email", async () => {
    fetchMock.mockResolvedValue(res(200, stored));
    render(<Profile />);
    expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
    expect(await screen.findByTestId("profile-email")).toHaveTextContent("jane@example.com");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("+15551110001");
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue("1988-03-21");
    expect(screen.getByLabelText(/gender/i)).toHaveValue("female");
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/patients/me");
  });

  it("[AC-018] shows an error state when the profile cannot be loaded", async () => {
    fetchMock.mockResolvedValue(res(500, { detail: "boom" }));
    render(<Profile />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your profile/i);
  });

  it("[AC-019] saving PATCHes the profile and confirms on screen", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, stored))
      .mockResolvedValueOnce(res(200, { ...stored, full_name: "Jane Roe", gender: "other" }));
    const u = userEvent.setup();
    render(<Profile />);
    const name = await screen.findByLabelText(/full name/i);
    await u.clear(name);
    await u.type(name, "Jane Roe");
    await u.selectOptions(screen.getByLabelText(/gender/i), "other");
    await u.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/your profile has been saved/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/patients/me");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      full_name: "Jane Roe",
      phone: "+15551110001",
      date_of_birth: "1988-03-21",
      gender: "other",
    });
    expect(screen.getByTestId("saved-full_name")).toHaveTextContent("Jane Roe");
  });

  it("[AC-020] a successful password change posts both fields and confirms on screen", async () => {
    const current = crypto.randomUUID();
    const next = crypto.randomUUID();
    fetchMock
      .mockResolvedValueOnce(res(200, stored))
      .mockResolvedValueOnce(res(200, { status: "ok" }));
    const u = userEvent.setup();
    render(<Profile />);
    await u.type(await screen.findByLabelText(/current password/i), current);
    await u.type(screen.getByLabelText(/new password/i), next);
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText(/your password has been changed/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain("/api/patients/me/password");
    expect(JSON.parse(init.body)).toEqual({
      current_password: current,
      new_password: next,
    });
  });

  it("[AC-021] a 422 shows the message against current_password and keeps what was typed", async () => {
    const current = crypto.randomUUID();
    const next = crypto.randomUUID();
    fetchMock
      .mockResolvedValueOnce(res(200, stored))
      .mockResolvedValueOnce(
        res(422, { detail: [{ field: "current_password", msg: "incorrect" }] }),
      );
    const u = userEvent.setup();
    render(<Profile />);
    await u.type(await screen.findByLabelText(/current password/i), current);
    await u.type(screen.getByLabelText(/new password/i), next);
    await u.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("incorrect")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/current password/i)).toHaveAttribute("aria-invalid", "true"),
    );
    expect(screen.getByLabelText(/current password/i)).toHaveValue(current);
    expect(screen.getByLabelText(/new password/i)).toHaveValue(next);
    // The previously displayed saved values remain shown (NFR-022).
    expect(screen.getByTestId("saved-full_name")).toHaveTextContent("Jane Doe");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("jane@example.com");
  });
});
