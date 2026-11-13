import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Icons } from "@/lib/icons";
import SignIn from "@/screens/SignIn";
import FindADoctor from "@/screens/FindADoctor";
import MyAppointments from "@/screens/MyAppointments";
import DoctorSchedule from "@/screens/DoctorSchedule";
import DoctorAvailability from "@/screens/DoctorAvailability";
import Admin from "@/screens/Admin";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-2 rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-[var(--brand-hover)] text-[var(--brand-fg)]" : "text-[var(--brand-fg-muted)]",
  ].join(" ");

// The app's menu, drawn around every screen except the ones routed outside it below.
function AppShellLayout() {
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
          <nav aria-label="App menu" className="flex flex-wrap items-center gap-1">
            <NavLink to="/find-a-doctor" className={navLinkClass}>
              <Icons.Search size={16} />
              {"Find a Doctor"}
            </NavLink>
            <NavLink to="/my-appointments" className={navLinkClass}>
              {"My Appointments"}
            </NavLink>
            <NavLink to="/doctor-schedule" className={navLinkClass}>
              <Icons.Home size={16} />
              {"My Schedule"}
            </NavLink>
            <NavLink to="/doctor-availability" className={navLinkClass}>
              <Icons.Settings size={16} />
              {"My Availability"}
            </NavLink>
            <NavLink to="/admin" className={navLinkClass}>
              <Icons.User size={16} />
              {"Admin Console"}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShellLayout />}>
        <Route path="/find-a-doctor" element={<FindADoctor />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/doctor-schedule" element={<DoctorSchedule />} />
        <Route path="/doctor-availability" element={<DoctorAvailability />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
