// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { formatClinicDate, useClinicTimezone } from "@/lib/clinicTime";

const { Label, Table, THead, TBody, TR, TH, TD, Empty } = UI;

const { Home, Filter, ArrowLeft, ArrowRight } = Icons;

const TODAY = "2026-11-13";
const DOCTOR = {
  name: "Dr. Ananya Sharma",
  spec: "General Medicine",
  room: "Room 4, ground floor",
};
const STATUS_FILTERS = ["All", "Booked", "Confirmed", "Completed", "No-show", "Cancelled"];
const STATUS_TABS = [
  { key: "Confirmed", label: "Confirmed" },
  { key: "Completed", label: "Completed" },
  { key: "No-show", label: "No-show" },
  { key: "Cancelled", label: "Cancelled (reason required)" },
];
const TAB_WF = {
  Confirmed: "i-3-1-0",
  Completed: "i-3-1-1",
  "No-show": "i-3-1-2",
  Cancelled: "i-3-1-3",
};

const SEED_APPTS = [
  {
    id: "a-1101",
    date: "2026-11-12",
    time: "09:30",
    patient: "Lakshmi Pillai",
    reason: "Knee pain when climbing stairs",
    status: "Completed",
    note: "",
  },
  {
    id: "a-1102",
    date: "2026-11-12",
    time: "10:00",
    patient: "Vikram Singh",
    reason: "Acid reflux after meals",
    status: "Completed",
    note: "",
  },
  {
    id: "a-1103",
    date: "2026-11-12",
    time: "11:30",
    patient: "Hannah Dsouza",
    reason: "Trouble sleeping for three weeks",
    status: "No-show",
    note: "Did not arrive",
  },
  {
    id: "a-1001",
    date: TODAY,
    time: "09:00",
    patient: "Meera Iyer",
    reason: "Itchy eyes and sneezing for ten days",
    status: "Completed",
    note: "Completed by you at 09:41",
  },
  {
    id: "a-1002",
    date: TODAY,
    time: "09:30",
    patient: "Faisal Khan",
    reason: "Follow-up on blood pressure readings",
    status: "No-show",
    note: "Marked by you at 10:02",
  },
  {
    id: "a-1003",
    date: TODAY,
    time: "10:00",
    patient: "Rahul Mehta",
    reason: "Recurring headaches, mostly in the evening",
    status: "Confirmed",
    note: "Confirmed by you yesterday, 17:15",
  },
  {
    id: "a-1004",
    date: TODAY,
    time: "10:30",
    patient: "Sunita Rao",
    reason: "Persistent cough since last week",
    status: "Booked",
    note: "",
  },
  {
    id: "a-1005",
    date: TODAY,
    time: "11:00",
    patient: "Daniel Okafor",
    reason: "Back pain after lifting at work",
    status: "Booked",
    note: "",
  },
  {
    id: "a-1006",
    date: TODAY,
    time: "11:30",
    patient: "Kavya Menon",
    reason: "Annual check-up and cholesterol review",
    status: "Confirmed",
    note: "Confirmed by you at 08:20",
  },
  {
    id: "a-1007",
    date: TODAY,
    time: "14:00",
    patient: "Priya Nair",
    reason: "Daughter has had a fever for two days",
    status: "Booked",
    note: "",
  },
  {
    id: "a-1008",
    date: TODAY,
    time: "14:30",
    patient: "Arjun Bhatt",
    reason: "Skin rash on both forearms",
    status: "Cancelled",
    note: "Cancelled by patient at 08:41",
  },
  {
    id: "a-1201",
    date: "2026-11-16",
    time: "09:00",
    patient: "Omar Sheikh",
    reason: "Diabetes review and HbA1c results",
    status: "Booked",
    note: "",
  },
  {
    id: "a-1202",
    date: "2026-11-16",
    time: "09:30",
    patient: "Neha Kulkarni",
    reason: "Persistent tiredness, low appetite",
    status: "Confirmed",
    note: "Confirmed by you at 12:05",
  },
  {
    id: "a-1203",
    date: "2026-11-16",
    time: "10:30",
    patient: "Rohan Joshi",
    reason: "Ear ache since the weekend",
    status: "Booked",
    note: "",
  },
  {
    id: "a-1301",
    date: "2026-11-17",
    time: "10:00",
    patient: "Aditi Verma",
    reason: "Recurring migraine, wants a plan",
    status: "Booked",
    note: "",
  },
];

const BLANK_REC = { diagnosis: "", notes: "", advice: "", lines: [], savedAt: null };
const SEED_RECORDS = {
  "a-1001": {
    diagnosis: "Seasonal allergic rhinitis",
    notes:
      "Itchy eyes and sneezing for about ten days, worse in the mornings. No fever. Throat mildly congested, lungs clear.",
    advice:
      "Avoid dust exposure, rinse nose with saline twice daily, and return in two weeks if symptoms persist.",
    lines: [
      {
        id: "l-1",
        medicine: "Cetirizine 10 mg",
        dosage: "One tablet at night",
        duration: "10 days",
      },
      {
        id: "l-2",
        medicine: "Fluticasone nasal spray",
        dosage: "2 sprays each nostril, once daily",
        duration: "14 days",
      },
    ],
    savedAt: 588,
  },
};
const SEED_AUDIT = { "a-1001": [{ t: "09:48", a: "created" }] };

// Every date on this screen goes through the one shared clinic-timezone formatter.
const fmtDate = (iso) => formatClinicDate(iso);
function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmtTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
function joinList(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

const CSS = `
.atr-root{--ink:var(--atr-ink);--cream:var(--atr-cream);--gold:var(--atr-gold);--muted:var(--atr-muted);
  --tint:color-mix(in srgb,var(--ink) 7%,var(--cream));--soft:0 10px 28px color-mix(in srgb,var(--ink) 11%,transparent);
  --quiet:color-mix(in srgb,var(--ink) 74%,var(--cream));
  color:var(--ink);background:var(--cream);min-height:100%;font-size:15px;line-height:1.55}
.atr-root *{box-sizing:border-box}
.atr-root :focus-visible{outline:3px solid var(--ink);outline-offset:2px}
.atr-serif{font-style:italic;font-weight:500;letter-spacing:-0.01em}
.atr-cap{font-size:13px;line-height:1.5;color:var(--quiet)}
.atr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 24px;border:0;border-radius:999px;
  font:inherit;font-weight:600;cursor:pointer;transition:background .2s ease,transform .15s ease,box-shadow .2s ease;text-align:center}
.atr-btn:active:not(:disabled){transform:scale(.98)}
.atr-btn:disabled{opacity:.5;cursor:not-allowed}
.atr-primary{background:var(--ink);color:var(--cream);box-shadow:var(--soft)}
.atr-primary:hover:not(:disabled){background:color-mix(in srgb,var(--ink) 84%,var(--gold))}
.atr-secondary{background:color-mix(in srgb,var(--ink) 10%,var(--cream));color:var(--ink)}
.atr-secondary:hover:not(:disabled){background:color-mix(in srgb,var(--gold) 34%,var(--cream))}
.atr-sm{min-height:44px;padding:0 16px;font-size:14px}
.atr-dot{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:var(--gold);color:var(--ink)}
.atr-field{width:100%;min-height:44px;padding:8px 16px;border:0;border-radius:999px;background:var(--cream);color:var(--ink);font:inherit;
  box-shadow:inset 0 0 0 1px var(--muted);transition:box-shadow .2s ease,background .2s ease}
textarea.atr-field{border-radius:var(--atr-radius);padding:12px 16px;resize:vertical;min-height:96px}
.atr-field::placeholder{color:var(--quiet);opacity:.85}
.atr-field:hover:not(:disabled){box-shadow:inset 0 0 0 1px var(--ink)}
.atr-field[aria-invalid="true"]{box-shadow:inset 0 0 0 2px var(--ink);background:color-mix(in srgb,var(--gold) 16%,var(--cream))}
.atr-field:disabled{background:var(--tint);cursor:not-allowed;color:var(--quiet)}
.atr-label{display:block;font-size:13px;font-weight:600;margin:0 0 4px 16px;color:var(--ink)}
.atr-err{display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:600;margin:8px 0 0 16px}
.atr-panel{background:var(--tint);border-radius:var(--atr-radius);box-shadow:var(--soft)}
.atr-arch{border-radius:50% 50% var(--atr-radius) var(--atr-radius) / 96px 96px var(--atr-radius) var(--atr-radius)}
.atr-arch-sm{border-radius:50% 50% var(--atr-radius) var(--atr-radius) / 72px 72px var(--atr-radius) var(--atr-radius)}
.atr-bar{background:var(--tint);border-radius:var(--atr-radius);padding:24px;display:flex;flex-direction:column;gap:16px}
.atr-bar-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;align-items:end}
.atr-pill{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px;border-radius:999px;font-size:13px;font-weight:700;white-space:nowrap}
.atr-tab{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 16px;border:0;border-radius:999px;font:inherit;font-size:14px;font-weight:600;
  background:var(--cream);color:var(--ink);cursor:pointer;transition:background .2s ease,box-shadow .2s ease;box-shadow:inset 0 0 0 1px var(--muted)}
.atr-tab:hover{background:color-mix(in srgb,var(--gold) 22%,var(--cream))}
.atr-tab[aria-selected="true"]{background:var(--ink);color:var(--cream);box-shadow:none}
.atr-table table{width:100%;border-collapse:separate;border-spacing:0;border:0;background:transparent}
.atr-table th{text-align:left;font-size:13px;font-weight:700;padding:12px 16px;color:var(--ink);border:0;background:transparent;font-style:italic;font-family:var(--atr-heading)}
.atr-table td{padding:16px;vertical-align:top;border:0;border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent);font-variant-numeric:tabular-nums}
.atr-table tr{background:transparent;transition:background .2s ease}
.atr-table .atr-row-sel td{background:color-mix(in srgb,var(--gold) 20%,var(--cream))}
.atr-table .atr-row-sel td:first-child{box-shadow:inset 4px 0 0 var(--gold)}
.atr-rise{animation:atr-rise .35s ease both}
.atr-skel{height:20px;border-radius:999px;background:color-mix(in srgb,var(--ink) 12%,var(--cream));animation:atr-pulse 1.2s ease-in-out infinite}
@keyframes atr-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes atr-pulse{0%,100%{opacity:.5}50%{opacity:1}}
@media (max-width:720px){
  .atr-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .atr-table table,.atr-table tbody,.atr-table tr,.atr-table td{display:block;width:100%}
  .atr-table tr{padding:8px 0;border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}
  .atr-table td{border:0;padding:8px 16px;display:flex;justify-content:space-between;gap:16px;text-align:right}
  .atr-table td::before{content:attr(data-label);font-size:13px;font-weight:700;text-align:left;color:var(--quiet);flex:0 0 38%}
  .atr-table td>*{min-width:0}
  .atr-table .atr-row-sel td:first-child{box-shadow:none}
  .atr-table .atr-row-sel{background:color-mix(in srgb,var(--gold) 20%,var(--cream));border-radius:var(--atr-radius)}
  .atr-table .atr-row-sel td{background:transparent}
  .atr-table td .atr-field{text-align:left}
  .atr-arch,.atr-arch-sm{border-radius:50% 50% var(--atr-radius) var(--atr-radius) / 56px 56px var(--atr-radius) var(--atr-radius)}
}
@media (prefers-reduced-motion:reduce){.atr-root *{animation:none !important;transition:none !important}}
`;

function StatusPill({ status }) {
  const map = {
    Booked: {
      Icon: Icons.Clock,
      bg: "color-mix(in srgb, var(--ink) 9%, var(--cream))",
      fg: "var(--ink)",
      ring: "none",
      deco: "none",
    },
    Confirmed: {
      Icon: Icons.CheckCircle,
      bg: "color-mix(in srgb, var(--gold) 40%, var(--cream))",
      fg: "var(--ink)",
      ring: "none",
      deco: "none",
    },
    Completed: {
      Icon: Icons.Check,
      bg: "var(--ink)",
      fg: "var(--cream)",
      ring: "none",
      deco: "none",
    },
    "No-show": {
      Icon: Icons.AlertCircle,
      bg: "transparent",
      fg: "var(--ink)",
      ring: "inset 0 0 0 1px var(--ink)",
      deco: "none",
    },
    Cancelled: {
      Icon: Icons.X,
      bg: "color-mix(in srgb, var(--ink) 9%, var(--cream))",
      fg: "var(--ink)",
      ring: "none",
      deco: "line-through",
    },
  };
  const s = map[status];
  const I = s.Icon;
  return (
    <span
      className="atr-pill"
      style={{ background: s.bg, color: s.fg, boxShadow: s.ring, textDecoration: s.deco }}
    >
      <I aria-hidden="true" className="w-4 h-4" />
      {status}
    </span>
  );
}

export default function Screen() {
  const navigate = useNavigate();
  const clinicTz = useClinicTimezone();
  const [appts, setAppts] = React.useState(SEED_APPTS);
  const [records, setRecords] = React.useState(SEED_RECORDS);
  const [audit, setAudit] = React.useState(SEED_AUDIT);
  const [clock, setClock] = React.useState(620);
  const [from, setFrom] = React.useState(TODAY);
  const [to, setTo] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState("a-1003");
  const [tab, setTab] = React.useState("Confirmed");
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelErr, setCancelErr] = React.useState("");
  const [cancelConfirming, setCancelConfirming] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState(null);
  const [errors, setErrors] = React.useState({ diagnosis: "", lines: {} });
  const [saveMsg, setSaveMsg] = React.useState(null);
  const [focusLineId, setFocusLineId] = React.useState(null);
  const nextLine = React.useRef(100);
  const firstRun = React.useRef(true);

  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return undefined;
    }
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(id);
  }, [from, to, statusFilter]);

  const rangeInvalid = Boolean(to && from && to < from);
  const end = to && !rangeInvalid ? to : from;
  const multiDay = from !== end;
  const visible = appts
    .filter(
      (a) =>
        a.date >= from && a.date <= end && (statusFilter === "All" || a.status === statusFilter),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const selected = visible.find((a) => a.id === selectedId) || null;
  const filterLabel =
    (multiDay
      ? fmtDate(from) + " – " + fmtDate(end)
      : (from === TODAY ? "Today · " : "") + fmtDate(from)) + " (clinic timezone)";
  const filtersActive = from !== TODAY || to !== "" || statusFilter !== "All";

  const passed = (a) => a.date < TODAY || (a.date === TODAY && toMin(a.time) <= clock);
  const first = (a) => a.patient.split(" ")[0];

  function blockReason(a, target) {
    if (!a) return "Open an appointment from the table first.";
    if (["Completed", "Cancelled", "No-show"].includes(a.status))
      return (
        "This appointment has reached a final status (" +
        a.status +
        "), so it can’t be changed again."
      );
    if (target === "Confirmed" && a.status === "Confirmed")
      return "Already confirmed. You can still complete it, mark a no-show, or cancel.";
    if ((target === "Completed" || target === "No-show") && !passed(a))
      return "Available once the slot time has passed (" + a.time + ", " + fmtDate(a.date) + ").";
    return null;
  }

  function resetStatusUi() {
    setCancelReason("");
    setCancelErr("");
    setCancelConfirming(false);
    setStatusMsg(null);
  }

  function openRow(a) {
    setSelectedId(a.id);
    resetStatusUi();
    setErrors({ diagnosis: "", lines: {} });
    setSaveMsg(null);
    if (records[a.id] && records[a.id].savedAt != null) {
      setAudit((p) => ({ ...p, [a.id]: [...(p[a.id] || []), { t: fmtTime(clock), a: "viewed" }] }));
    }
  }

  function applyStatus(target, reason) {
    if (!selected || blockReason(selected, target)) return;
    const t = clock + 1;
    setClock(t);
    const verb = {
      Confirmed: "Confirmed",
      Completed: "Completed",
      "No-show": "Marked no-show",
      Cancelled: "Cancelled",
    }[target];
    const note =
      target === "Cancelled"
        ? "Cancelled by you at " + fmtTime(t) + " · “" + reason.trim() + "”"
        : verb + " by you at " + fmtTime(t);
    setAppts((p) => p.map((a) => (a.id === selected.id ? { ...a, status: target, note } : a)));
    setStatusMsg(
      target === "Cancelled"
        ? first(selected) +
            "’s " +
            selected.time +
            " visit is cancelled. The slot is open again and they can see your reason."
        : first(selected) + "’s visit is now " + target + " (saved " + fmtTime(t) + ").",
    );
    setCancelReason("");
    setCancelErr("");
    setCancelConfirming(false);
  }

  function askCancel() {
    if (!cancelReason.trim()) {
      setCancelErr("Add a reason — the patient will see it in their appointment list.");
      return;
    }
    setCancelErr("");
    setCancelConfirming(true);
  }

  function onTabKey(e, idx) {
    let n = null;
    if (e.key === "ArrowRight") n = (idx + 1) % STATUS_TABS.length;
    if (e.key === "ArrowLeft") n = (idx - 1 + STATUS_TABS.length) % STATUS_TABS.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = STATUS_TABS.length - 1;
    if (n !== null) {
      e.preventDefault();
      setTab(STATUS_TABS[n].key);
      resetStatusUi();
      const el = document.getElementById("st-tab-" + STATUS_TABS[n].key);
      if (el) el.focus();
    }
  }

  // consultation form
  let lockReason = null;
  if (!selected) lockReason = "Open an appointment from the table above to write up its visit.";
  else if (selected.status === "Cancelled")
    lockReason = "This visit was cancelled, so there is no consultation to record.";
  else if (selected.status === "No-show")
    lockReason = "The patient did not attend, so there is no consultation to record.";
  else if (!passed(selected))
    lockReason =
      "This visit starts at " + selected.time + ". The record opens once the slot time has passed.";
  const locked = Boolean(lockReason);
  const rec = selected ? records[selected.id] || BLANK_REC : BLANK_REC;
  const recAudit = selected ? audit[selected.id] || [] : [];

  function patchRec(patch) {
    if (!selected) return;
    setRecords((p) => ({ ...p, [selected.id]: { ...(p[selected.id] || BLANK_REC), ...patch } }));
  }
  function patchLine(id, field, value) {
    patchRec({ lines: rec.lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)) });
    if (errors.lines[id])
      setErrors((p) => {
        const n = { ...p.lines };
        delete n[id];
        return { ...p, lines: n };
      });
  }
  function addLine() {
    const id = "l-" + nextLine.current++;
    patchRec({ lines: [...rec.lines, { id, medicine: "", dosage: "", duration: "" }] });
    setFocusLineId(id);
  }
  function removeLine(id) {
    patchRec({ lines: rec.lines.filter((l) => l.id !== id) });
    setErrors((p) => {
      const n = { ...p.lines };
      delete n[id];
      return { ...p, lines: n };
    });
  }
  function saveConsultation(e) {
    e.preventDefault();
    if (!selected || locked) return;
    const lineErrs = {};
    rec.lines.forEach((l, i) => {
      const miss = [];
      if (!l.medicine.trim()) miss.push("a medicine");
      if (!l.dosage.trim()) miss.push("a dosage");
      if (!l.duration.trim()) miss.push("a duration");
      if (miss.length) lineErrs[l.id] = "Line " + (i + 1) + " needs " + joinList(miss) + ".";
    });
    const dErr = rec.diagnosis.trim() ? "" : "A diagnosis is required before this can be saved.";
    if (dErr || Object.keys(lineErrs).length) {
      setErrors({ diagnosis: dErr, lines: lineErrs });
      setSaveMsg(null);
      return;
    }
    const t = clock + 1;
    setClock(t);
    const action = rec.savedAt != null ? "updated" : "created";
    patchRec({ savedAt: t });
    setAudit((p) => ({
      ...p,
      [selected.id]: [...(p[selected.id] || []), { t: fmtTime(t), a: action }],
    }));
    setErrors({ diagnosis: "", lines: {} });
    setSaveMsg({
      id: selected.id,
      text:
        "Consultation saved at " +
        fmtTime(t) +
        " for " +
        selected.patient +
        ". " +
        (rec.lines.length === 0
          ? "No medication prescribed."
          : rec.lines.length +
            (rec.lines.length === 1 ? " prescription line" : " prescription lines") +
            " stored.") +
        (selected.status !== "Completed"
          ? " The visit is still " +
            selected.status +
            " — set it to Completed from the status tabs."
          : ""),
    });
  }

  const lineErrorCount = Object.keys(errors.lines).length;
  const hasErrors = Boolean(errors.diagnosis) || lineErrorCount > 0;
  const activeTabBlock = selected
    ? blockReason(selected, tab)
    : "Open an appointment from the table to set its status.";

  const style = {
    "--atr-ink": brand.primaryColor,
    "--atr-cream": brand.backgroundColor,
    "--atr-gold": brand.accentColor,
    "--atr-muted": brand.neutralColor,
    "--atr-radius": brand.radius,
    "--atr-heading": brand.fontHeading,
    fontFamily: brand.fontBody,
  };
  const heading = { fontFamily: brand.fontHeading };

  return (
    <div className="atr-root" style={style}>
      <style>{CSS}</style>
      <div className="mx-auto w-full" style={{ maxWidth: 1120, padding: "32px 16px 64px" }}>
        <div className="flex flex-col" style={{ gap: 48 }}>
          {/* Row 1 */}
          <div className="grid grid-cols-12 items-end" style={{ gap: 24 }}>
            <div className="col-span-12 md:col-span-9">
              <h1
                className="atr-serif"
                style={{ ...heading, fontSize: 40, lineHeight: 1.15, margin: 0 }}
                data-wf="b-0-0"
              >
                My schedule
              </h1>
              <p className="atr-cap" style={{ margin: "8px 0 0" }}>
                {DOCTOR.name} · {DOCTOR.spec} · {DOCTOR.room} · all times shown in the clinic
                timezone, {clinicTz}
              </p>
            </div>
            <div className="col-span-12 md:col-span-3">
              <button
                type="button"
                className="atr-btn atr-secondary w-full"
                data-wf="b-0-1"
                onClick={() => navigate("doctor-availability")}
              >
                <Icons.Settings aria-hidden="true" className="w-4 h-4" />
                Manage availability
              </button>
            </div>
          </div>

          {/* Row 2 */}
          <div className="atr-bar" data-wf="b-1-0" role="group" aria-label="Filter appointments">
            <p
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              <span className="atr-dot">
                <Icons.Filter aria-hidden="true" className="w-4 h-4" />
              </span>
              <span>{filterLabel}</span>
            </p>
            <div className="atr-bar-fields">
              <div>
                <Label htmlFor="f-from" className="atr-label">
                  Date or range
                </Label>
                <input
                  id="f-from"
                  type="date"
                  className="atr-field"
                  data-wf="i-1-0-0"
                  value={from}
                  onChange={(e) => e.target.value && setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="f-to" className="atr-label">
                  Through (optional)
                </Label>
                <input
                  id="f-to"
                  type="date"
                  className="atr-field"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  aria-describedby={rangeInvalid ? "f-range-err" : undefined}
                  aria-invalid={rangeInvalid ? "true" : undefined}
                />
              </div>
              <div>
                <Label htmlFor="f-status" className="atr-label">
                  Status
                </Label>
                <select
                  id="f-status"
                  className="atr-field"
                  data-wf="i-1-0-1"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {filtersActive && (
                <div>
                  <button
                    type="button"
                    className="atr-btn atr-secondary w-full"
                    onClick={() => {
                      setFrom(TODAY);
                      setTo("");
                      setStatusFilter("All");
                    }}
                  >
                    <Icons.X aria-hidden="true" className="w-4 h-4" />
                    Back to today
                  </button>
                </div>
              )}
            </div>
            {rangeInvalid && (
              <p id="f-range-err" className="atr-err" style={{ margin: 0 }}>
                <Icons.AlertCircle
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  style={{ marginTop: 3 }}
                />
                the end date is before the start, so only the start date is shown for now.
              </p>
            )}
          </div>

          {/* Row 3 */}
          <section
            data-wf="b-2-0"
            aria-labelledby="appt-h"
            className="flex flex-col"
            style={{ gap: 16 }}
          >
            <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 8 }}>
              <h2 id="appt-h" className="atr-serif" style={{ ...heading, fontSize: 28, margin: 0 }}>
                Appointments
              </h2>
              <p
                className="atr-cap"
                style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}
                aria-live="polite"
              >
                {loading
                  ? "refreshing your list…"
                  : visible.length +
                    (visible.length === 1 ? " visit" : " visits") +
                    " · only yours appear here"}
              </p>
            </div>
            <div
              className="atr-panel atr-table"
              style={{ padding: "16px 8px" }}
              aria-busy={loading}
            >
              <Table>
                <THead>
                  <TR>
                    <TH data-wf="i-2-0-0">Time</TH>
                    <TH data-wf="i-2-0-1">Patient</TH>
                    <TH data-wf="i-2-0-2">Reason for visit</TH>
                    <TH data-wf="i-2-0-3">Status</TH>
                    <TH data-wf="i-2-0-4">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading &&
                    [0, 1, 2].map((i) => (
                      <TR key={"sk" + i}>
                        <TD colSpan={5}>
                          <div className="atr-skel" style={{ width: i === 1 ? "70%" : "90%" }} />
                          <span className="sr-only">Loading appointments</span>
                        </TD>
                      </TR>
                    ))}
                  {!loading && visible.length === 0 && (
                    <TR>
                      <TD colSpan={5}>
                        <span className="atr-cap">
                          nothing matches this date and status — see below.
                        </span>
                      </TD>
                    </TR>
                  )}
                  {!loading &&
                    visible.map((a) => (
                      <TR
                        key={a.id}
                        className={
                          a.id === (selected && selected.id) ? "atr-row-sel atr-rise" : "atr-rise"
                        }
                      >
                        <TD data-label="Time">
                          <div>
                            <strong style={{ fontSize: 16 }}>
                              {a.time} {clinicTz}
                            </strong>
                            {multiDay && <div className="atr-cap">{fmtDate(a.date)}</div>}
                          </div>
                        </TD>
                        <TD data-label="Patient">
                          <span style={{ fontWeight: 600 }}>{a.patient}</span>
                        </TD>
                        <TD data-label="Reason for visit">
                          <span>{a.reason}</span>
                        </TD>
                        <TD data-label="Status">
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              alignItems: "flex-start",
                            }}
                          >
                            <StatusPill status={a.status} />
                            {a.note && <span className="atr-cap">{a.note}</span>}
                          </div>
                        </TD>
                        <TD data-label="Actions">
                          <button
                            type="button"
                            className="atr-btn atr-secondary atr-sm"
                            aria-label={"Open record for " + a.patient + ", " + a.time}
                            aria-current={selected && selected.id === a.id ? "true" : undefined}
                            onClick={() => openRow(a)}
                          >
                            {selected && selected.id === a.id ? "Viewing" : "Open record"}
                            <Icons.ChevronRight aria-hidden="true" className="w-4 h-4" />
                          </button>
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </div>
          </section>

          {/* Row 4 */}
          <div className="grid grid-cols-12" style={{ gap: 24 }}>
            <div className="col-span-12 md:col-span-6" data-wf="b-3-0">
              {visible.length === 0 && !loading ? (
                <div className="atr-panel atr-rise" style={{ padding: 24 }}>
                  <Empty
                    title="No appointments on this date."
                    description={
                      "Nothing is booked for " +
                      (multiDay ? "these dates" : fmtDate(from)) +
                      (statusFilter !== "All" ? " with the status " + statusFilter : "") +
                      ". Pick another day, or head back to today."
                    }
                    action={
                      <button
                        type="button"
                        className="atr-btn atr-secondary"
                        onClick={() => {
                          setFrom(TODAY);
                          setTo("");
                          setStatusFilter("All");
                        }}
                      >
                        Back to today
                      </button>
                    }
                  />
                </div>
              ) : selected ? (
                <div
                  className="atr-panel atr-rise"
                  style={{ padding: 24, height: "100%" }}
                  aria-live="polite"
                >
                  <p className="atr-cap" style={{ margin: 0 }}>
                    now viewing
                  </p>
                  <p
                    className="atr-serif"
                    style={{ ...heading, fontSize: 28, margin: "4px 0 12px", lineHeight: 1.2 }}
                  >
                    {selected.patient}
                  </p>
                  <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      {fmtDate(selected.date)} {selected.time} {clinicTz}
                    </span>
                    <StatusPill status={selected.status} />
                  </div>
                  <p style={{ margin: "16px 0 8px" }}>“{selected.reason}”</p>
                  <p className="atr-cap" style={{ margin: 0 }}>
                    {passed(selected)
                      ? "the slot time has passed"
                      : "this slot is still ahead of you"}
                    {selected.note
                      ? " · " + selected.note.toLowerCase().slice(0, 1) + selected.note.slice(1)
                      : ""}
                  </p>
                </div>
              ) : (
                <div className="atr-panel" style={{ padding: 24, height: "100%" }}>
                  <p className="atr-serif" style={{ ...heading, fontSize: 24, margin: "0 0 8px" }}>
                    no appointment open
                  </p>
                  <p className="atr-cap" style={{ margin: 0 }}>
                    choose “Open record” on a row to set its status and write up the visit.
                  </p>
                </div>
              )}
            </div>

            <div className="col-span-12 md:col-span-6">
              <div
                className="atr-panel atr-arch-sm"
                data-wf="b-3-1"
                style={{ padding: "64px 24px 24px" }}
              >
                <h2
                  className="atr-serif"
                  style={{ ...heading, fontSize: 24, margin: 0, textAlign: "center" }}
                >
                  Set status
                </h2>
                <p className="atr-cap" style={{ textAlign: "center", margin: "4px 0 16px" }}>
                  {selected
                    ? "for " + selected.patient + ", " + selected.time
                    : "choose an appointment first"}
                </p>
                <div
                  role="tablist"
                  aria-label="Set status"
                  className="flex flex-wrap justify-center"
                  style={{ gap: 8 }}
                >
                  {STATUS_TABS.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      id={"st-tab-" + t.key}
                      className="atr-tab"
                      data-wf={TAB_WF[t.key]}
                      aria-selected={tab === t.key}
                      aria-controls="st-panel"
                      tabIndex={tab === t.key ? 0 : -1}
                      onClick={() => {
                        setTab(t.key);
                        resetStatusUi();
                      }}
                      onKeyDown={(e) => onTabKey(e, i)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div
                  role="tabpanel"
                  id="st-panel"
                  aria-labelledby={"st-tab-" + tab}
                  style={{ marginTop: 24 }}
                >
                  {tab !== "Cancelled" ? (
                    <div
                      className="flex flex-col"
                      style={{ gap: 12, alignItems: "center", textAlign: "center" }}
                    >
                      <p style={{ margin: 0 }}>
                        {tab === "Confirmed" && "let the patient know you’re expecting them."}
                        {tab === "Completed" && "the visit took place and you’re done with it."}
                        {tab === "No-show" && "the patient never arrived for their slot."}
                      </p>
                      <button
                        type="button"
                        className="atr-btn atr-primary"
                        disabled={Boolean(activeTabBlock)}
                        aria-describedby="st-why"
                        onClick={() => applyStatus(tab, "")}
                      >
                        <span className="atr-dot" aria-hidden="true">
                          <Icons.Check className="w-4 h-4" />
                        </span>
                        {tab === "Confirmed"
                          ? "Confirm appointment"
                          : tab === "Completed"
                            ? "Mark as completed"
                            : "Mark as no-show"}
                      </button>
                      <p id="st-why" className="atr-cap" style={{ margin: 0 }}>
                        {activeTabBlock || "this change is recorded with the time and your name."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      <div>
                        <Label htmlFor="cancel-reason" className="atr-label">
                          Reason for cancelling
                        </Label>
                        <textarea
                          id="cancel-reason"
                          className="atr-field"
                          value={cancelReason}
                          disabled={Boolean(activeTabBlock)}
                          aria-invalid={cancelErr ? "true" : undefined}
                          aria-describedby="cancel-help"
                          placeholder="e.g. I’m called to an emergency ward round"
                          onChange={(e) => {
                            setCancelReason(e.target.value);
                            setCancelErr("");
                            setCancelConfirming(false);
                          }}
                        />
                        <p id="cancel-help" className="atr-cap" style={{ margin: "4px 0 0 16px" }}>
                          the patient sees this reason in their appointment list.
                        </p>
                        {cancelErr && (
                          <p className="atr-err" role="alert">
                            <Icons.AlertCircle
                              aria-hidden="true"
                              className="w-4 h-4 shrink-0"
                              style={{ marginTop: 3 }}
                            />
                            {cancelErr}
                          </p>
                        )}
                      </div>
                      {!cancelConfirming ? (
                        <div className="flex flex-col items-center" style={{ gap: 8 }}>
                          <button
                            type="button"
                            className="atr-btn atr-primary"
                            disabled={Boolean(activeTabBlock)}
                            onClick={askCancel}
                          >
                            <span className="atr-dot" aria-hidden="true">
                              <Icons.X className="w-4 h-4" />
                            </span>
                            Cancel appointment
                          </button>
                          {activeTabBlock && (
                            <p className="atr-cap" style={{ margin: 0, textAlign: "center" }}>
                              {activeTabBlock}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          className="atr-rise"
                          role="alertdialog"
                          aria-label="Confirm cancellation"
                          style={{
                            background: "var(--cream)",
                            borderRadius: brand.radius,
                            padding: 16,
                          }}
                        >
                          <p style={{ margin: "0 0 12px", fontWeight: 600 }}>
                            cancel {selected && first(selected)}’s {selected && selected.time}{" "}
                            visit? the slot opens up again straight away.
                          </p>
                          <div className="flex flex-wrap" style={{ gap: 8 }}>
                            <button
                              type="button"
                              className="atr-btn atr-primary atr-sm"
                              autoFocus
                              onClick={() => applyStatus("Cancelled", cancelReason)}
                            >
                              Yes, cancel appointment
                            </button>
                            <button
                              type="button"
                              className="atr-btn atr-secondary atr-sm"
                              onClick={() => setCancelConfirming(false)}
                            >
                              Keep appointment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div role="status" aria-live="polite">
                    {statusMsg && (
                      <p
                        className="atr-rise"
                        style={{
                          margin: "16px 0 0",
                          display: "flex",
                          gap: 8,
                          fontWeight: 600,
                          background: "color-mix(in srgb, var(--gold) 30%, var(--cream))",
                          borderRadius: brand.radius,
                          padding: "12px 16px",
                        }}
                      >
                        <Icons.CheckCircle aria-hidden="true" className="w-5 h-5 shrink-0" />
                        {statusMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rows 5-7: one form */}
          <form
            onSubmit={saveConsultation}
            noValidate
            className="flex flex-col"
            style={{ gap: 32 }}
            aria-label="Consultation record"
          >
            {/* Row 5 */}
            <div
              data-wf="b-4-0"
              className="atr-panel atr-arch"
              style={{ padding: "96px 32px 32px" }}
            >
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <h2
                  className="atr-serif"
                  style={{ ...heading, fontSize: 28, margin: 0, textAlign: "center" }}
                >
                  {selected
                    ? "Consultation record – " + selected.patient + ", " + selected.time
                    : "Consultation record"}
                </h2>
                <p
                  className="atr-cap"
                  style={{ textAlign: "center", margin: "8px auto 24px", maxWidth: 520 }}
                >
                  only you and {selected ? first(selected) : "the patient"} can read this.
                  administrators see who, when and status — never what’s written here.
                  {rec.savedAt != null && " last saved " + fmtTime(rec.savedAt) + " by you."}
                </p>
                {lockReason && (
                  <p
                    className="atr-rise"
                    role="note"
                    style={{
                      display: "flex",
                      gap: 8,
                      margin: "0 0 24px",
                      padding: "12px 16px",
                      borderRadius: brand.radius,
                      background: "var(--cream)",
                      fontWeight: 600,
                    }}
                  >
                    <Icons.Clock aria-hidden="true" className="w-5 h-5 shrink-0" />
                    {lockReason}
                  </p>
                )}
                {hasErrors && (
                  <p
                    role="alert"
                    className="atr-rise"
                    style={{
                      display: "flex",
                      gap: 8,
                      margin: "0 0 24px",
                      padding: "12px 16px",
                      borderRadius: brand.radius,
                      background: "color-mix(in srgb, var(--gold) 30%, var(--cream))",
                      fontWeight: 600,
                    }}
                  >
                    <Icons.AlertCircle aria-hidden="true" className="w-5 h-5 shrink-0" />
                    Not saved yet. {errors.diagnosis ? "Add a diagnosis. " : ""}
                    {lineErrorCount > 0 ? "Complete the prescription lines marked below. " : ""}
                    Everything you typed is still here.
                  </p>
                )}
                <div className="flex flex-col" style={{ gap: 24 }}>
                  <div>
                    <Label htmlFor="c-diagnosis" className="atr-label">
                      Diagnosis (required)
                    </Label>
                    <input
                      id="c-diagnosis"
                      type="text"
                      className="atr-field"
                      data-wf="i-4-0-0"
                      value={rec.diagnosis}
                      disabled={locked}
                      aria-required="true"
                      aria-invalid={errors.diagnosis ? "true" : undefined}
                      aria-describedby={errors.diagnosis ? "c-diagnosis-err" : undefined}
                      placeholder="e.g. Tension-type headache"
                      onChange={(e) => {
                        patchRec({ diagnosis: e.target.value });
                        if (errors.diagnosis) setErrors((p) => ({ ...p, diagnosis: "" }));
                      }}
                    />
                    {errors.diagnosis && (
                      <p id="c-diagnosis-err" className="atr-err">
                        <Icons.AlertCircle
                          aria-hidden="true"
                          className="w-4 h-4 shrink-0"
                          style={{ marginTop: 3 }}
                        />
                        {errors.diagnosis}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="c-notes" className="atr-label">
                      Notes
                    </Label>
                    <textarea
                      id="c-notes"
                      className="atr-field"
                      data-wf="i-4-0-1"
                      value={rec.notes}
                      disabled={locked}
                      placeholder="what the patient described and what you found"
                      onChange={(e) => patchRec({ notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="c-advice" className="atr-label">
                      Advice
                    </Label>
                    <textarea
                      id="c-advice"
                      className="atr-field"
                      data-wf="i-4-0-2"
                      value={rec.advice}
                      disabled={locked}
                      placeholder="what the patient should do next, and when to come back"
                      onChange={(e) => patchRec({ advice: e.target.value })}
                    />
                  </div>
                </div>
                {recAudit.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <p className="atr-cap" style={{ margin: "0 0 4px", fontWeight: 700 }}>
                      record activity
                    </p>
                    <ul
                      className="atr-cap"
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {recAudit.slice(-4).map((e, i) => (
                        <li key={i}>
                          {e.t} · {e.a} by you
                        </li>
                      ))}
                    </ul>
                    <p className="atr-cap" style={{ margin: "4px 0 0" }}>
                      the audit log keeps who, which record and what action — never the content —
                      and can’t be edited.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-12" style={{ gap: 24 }}>
              <section
                data-wf="b-5-0"
                aria-labelledby="rx-h"
                className="col-span-12 md:col-span-9 atr-panel atr-table"
                style={{ padding: "24px 8px 16px" }}
              >
                <h2
                  id="rx-h"
                  className="atr-serif"
                  style={{ ...heading, fontSize: 24, margin: "0 0 8px 16px" }}
                >
                  Prescription
                </h2>
                <Table>
                  <THead>
                    <TR>
                      <TH data-wf="i-5-0-0">Medicine</TH>
                      <TH data-wf="i-5-0-1">Dosage</TH>
                      <TH data-wf="i-5-0-2">Duration</TH>
                      <TH data-wf="i-5-0-3">Remove</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rec.lines.length === 0 && (
                      <TR>
                        <TD colSpan={4}>
                          <span style={{ fontWeight: 600 }}>No medication prescribed.</span>{" "}
                          <span className="atr-cap">
                            add a line if the patient needs a medicine, or save as it is — the
                            patient will see “no medication prescribed”.
                          </span>
                        </TD>
                      </TR>
                    )}
                    {rec.lines.map((l, i) => {
                      const bad = Boolean(errors.lines[l.id]);
                      return (
                        <TR key={l.id} className="atr-rise">
                          <TD data-label="Medicine">
                            <div style={{ width: "100%" }}>
                              <input
                                type="text"
                                className="atr-field"
                                value={l.medicine}
                                disabled={locked}
                                autoFocus={l.id === focusLineId}
                                aria-label={"Medicine, line " + (i + 1)}
                                aria-invalid={bad && !l.medicine.trim() ? "true" : undefined}
                                aria-describedby={bad ? "rx-err-" + l.id : undefined}
                                onChange={(e) => patchLine(l.id, "medicine", e.target.value)}
                              />
                              {bad && (
                                <p
                                  id={"rx-err-" + l.id}
                                  className="atr-err"
                                  style={{ textAlign: "left" }}
                                >
                                  <Icons.AlertCircle
                                    aria-hidden="true"
                                    className="w-4 h-4 shrink-0"
                                    style={{ marginTop: 3 }}
                                  />
                                  {errors.lines[l.id]}
                                </p>
                              )}
                            </div>
                          </TD>
                          <TD data-label="Dosage">
                            <input
                              type="text"
                              className="atr-field"
                              value={l.dosage}
                              disabled={locked}
                              aria-label={"Dosage, line " + (i + 1)}
                              aria-invalid={bad && !l.dosage.trim() ? "true" : undefined}
                              onChange={(e) => patchLine(l.id, "dosage", e.target.value)}
                            />
                          </TD>
                          <TD data-label="Duration">
                            <input
                              type="text"
                              className="atr-field"
                              value={l.duration}
                              disabled={locked}
                              aria-label={"Duration, line " + (i + 1)}
                              aria-invalid={bad && !l.duration.trim() ? "true" : undefined}
                              onChange={(e) => patchLine(l.id, "duration", e.target.value)}
                            />
                          </TD>
                          <TD data-label="Remove">
                            <button
                              type="button"
                              className="atr-btn atr-secondary atr-sm"
                              disabled={locked}
                              aria-label={
                                "Remove line " + (i + 1) + (l.medicine ? ", " + l.medicine : "")
                              }
                              onClick={() => removeLine(l.id)}
                            >
                              <Icons.Trash aria-hidden="true" className="w-4 h-4" />
                              Remove
                            </button>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </section>
              <div className="col-span-12 md:col-span-3">
                <button
                  type="button"
                  className="atr-btn atr-secondary w-full"
                  data-wf="b-5-1"
                  disabled={locked}
                  onClick={addLine}
                >
                  <Icons.Plus aria-hidden="true" className="w-4 h-4" />
                  Add line
                </button>
              </div>
            </div>

            {/* Row 7 */}
            <div className="grid grid-cols-12 items-center" style={{ gap: 24 }}>
              <div className="col-span-12 md:col-span-4">
                <button
                  type="submit"
                  className="atr-btn atr-primary w-full"
                  data-wf="b-6-0"
                  disabled={locked}
                  style={{ minHeight: 52 }}
                >
                  <span className="atr-dot" aria-hidden="true">
                    <Icons.Check className="w-4 h-4" />
                  </span>
                  Save consultation
                </button>
              </div>
              <div className="col-span-12 md:col-span-8" role="status" aria-live="polite">
                {saveMsg && selected && saveMsg.id === selected.id && (
                  <p
                    className="atr-rise"
                    style={{
                      margin: 0,
                      display: "flex",
                      gap: 8,
                      fontWeight: 600,
                      background: "color-mix(in srgb, var(--gold) 30%, var(--cream))",
                      borderRadius: brand.radius,
                      padding: "12px 16px",
                    }}
                  >
                    <Icons.CheckCircle aria-hidden="true" className="w-5 h-5 shrink-0" />
                    {saveMsg.text}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
