import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";

import type { ReactNode } from "react";

import type { Role } from "@/lib/api";
import { Icons } from "@/lib/icons";
import { AuthProvider, RequireRole, useAuth } from "@/lib/auth";
import SignIn from "@/screens/SignIn";
import Register from "@/screens/Register";
import FindADoctor from "@/screens/FindADoctor";
import MyAppointments from "@/screens/MyAppointments";
import DoctorSchedule from "@/screens/DoctorSchedule";
import DoctorAvailability from "@/screens/DoctorAvailability";
import Admin from "@/screens/Admin";
import Profile from "@/screens/Profile";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-2 rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-[var(--brand-hover)] text-[var(--brand-fg)]" : "text-[var(--brand-fg-muted)]",
  ].join(" ");

// The app's menu, drawn around every screen except the ones routed outside it below.
function AppShellLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="border-b"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <div className="flex items-center gap-6 px-6 py-2">
          <p
            className="shrink-0 text-sm font-semibold"
            style={{ fontFamily: "var(--brand-font-heading)" }}
          >
            {"MediBook"}
          </p>
          <nav aria-label="App menu" className="flex flex-1 flex-wrap items-center gap-1">
            {role === "patient" && (
              <>
                <NavLink to="/find-a-doctor" className={navLinkClass}>
                  <Icons.Search size={16} />
                  {"Find a Doctor"}
                </NavLink>
                <NavLink to="/my-appointments" className={navLinkClass}>
                  {"My Appointments"}
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  <Icons.User size={16} />
                  {"My Profile"}
                </NavLink>
              </>
            )}
            {role === "doctor" && (
              <>
                <NavLink to="/doctor-schedule" className={navLinkClass}>
                  <Icons.Home size={16} />
                  {"My Schedule"}
                </NavLink>
                <NavLink to="/doctor-availability" className={navLinkClass}>
                  <Icons.Settings size={16} />
                  {"My Availability"}
                </NavLink>
              </>
            )}
            {role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                <Icons.User size={16} />
                {"Admin Console"}
              </NavLink>
            )}
          </nav>
          <button
            type="button"
            className={navLinkClass({ isActive: false })}
            onClick={async () => {
              await signOut();
              navigate("/sign-in", { replace: true });
            }}
          >
            {"Sign out"}
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function guarded(roles: Role[], element: ReactNode) {
  return <RequireRole roles={roles}>{element}</RequireRole>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShellLayout />}>
          <Route path="/search" element={guarded(["patient"], <FindADoctor />)} />
          <Route path="/find-a-doctor" element={guarded(["patient"], <FindADoctor />)} />
          <Route path="/my-appointments" element={guarded(["patient"], <MyAppointments />)} />
          <Route path="/profile" element={guarded(["patient"], <Profile />)} />
          <Route path="/my-profile" element={guarded(["patient"], <Profile />)} />
          <Route path="/doctor-schedule" element={guarded(["doctor"], <DoctorSchedule />)} />
          <Route
            path="/doctor-availability"
            element={guarded(["doctor"], <DoctorAvailability />)}
          />
          <Route path="/admin" element={guarded(["admin"], <Admin />)} />
        </Route>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </AuthProvider>
  );
}
