import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminUsers from "./AdminUsers";

const user = {
  id: "u1",
  full_name: "Dana Doc",
  email: "dana@x.test",
  role: "doctor",
  is_active: true,
};
const pw = crypto.randomUUID();

function res(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function fill(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText("Name"), "New Person");
  await u.type(screen.getByLabelText("Email"), "new@x.test");
  await u.type(screen.getByLabelText("Initial password"), pw);
}

describe("AdminUsers", () => {
  it("[AC-010] lists users and shows the initial password once after create", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, { items: [user], total: 1 }))
      .mockResolvedValueOnce(
        res(201, { ...user, id: "u2", full_name: "New Person", initial_password: pw }),
      )
      .mockResolvedValueOnce(res(200, { items: [user], total: 1 }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    expect(await screen.findByText("dana@x.test")).toBeInTheDocument();
    await fill(u);
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByTestId("one-time-password")).toHaveTextContent(pw);
    const post = fetchMock.mock.calls[1];
    expect(post[0]).toContain("/api/admin/users");
    expect(JSON.parse(post[1].body)).toMatchObject({ full_name: "New Person", role: "doctor" });
    await u.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByTestId("one-time-password")).toBeNull();
  });

  it("[AC-012] 409 shows inline message and keeps typed values", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, { items: [], total: 0 }))
      .mockResolvedValueOnce(res(409, { code: "email_in_use" }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText("No accounts yet.");
    await fill(u);
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/already in use/)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("new@x.test");
    expect(screen.getByLabelText("Name")).toHaveValue("New Person");
  });

  it("[AC-012] 422 field errors render inline", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, { items: [], total: 0 }))
      .mockResolvedValueOnce(res(422, { password: "weak_password" }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText("No accounts yet.");
    await fill(u);
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("weak_password")).toBeInTheDocument();
  });

  it("[AC-011] reset password confirms sessions are invalid", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, { items: [user], total: 1 }))
      .mockResolvedValueOnce(res(204));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Reset password for Dana Doc" }));
    expect(await screen.findByText(/sessions are now invalid/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toContain("/api/admin/users/u1/password");
  });

  it("[AC-010] deactivate toggle sends PATCH", async () => {
    fetchMock
      .mockResolvedValueOnce(res(200, { items: [user], total: 1 }))
      .mockResolvedValueOnce(res(200, { ...user, is_active: false }))
      .mockResolvedValueOnce(res(200, { items: [{ ...user, is_active: false }], total: 1 }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByLabelText("Active: Dana Doc"));
    await waitFor(() => expect(fetchMock.mock.calls[1][1].method).toBe("PATCH"));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ is_active: false });
  });

  it("[AC-010] a 403 shows an access message", async () => {
    fetchMock.mockResolvedValueOnce(res(403));
    render(<AdminUsers />);
    expect(await screen.findByText(/do not have access/)).toBeInTheDocument();
  });
});
