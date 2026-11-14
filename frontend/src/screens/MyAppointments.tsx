// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import {
  clinicTimezone,
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  useClinicTimezone,
} from "@/lib/clinicTime";

const { Button, Input, Label, Select, Table, THead, TBody, TR, TH, TD, Empty } = UI;

const { Check, X, Home, Calendar, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } = Icons;

const CLINIC = { name: "Greenhaven Family Clinic", cutoff: 24 };
const NOW = "2026-11-13T10:00";
const TODAY = "2026-11-13";
const DAY_SLOTS = ["09:00", "09:30", "10:00", "11:00", "11:30", "12:00", "12:30"];

const DOCTORS = {
  d1: {
    name: "Dr. Priya Nair",
    spec: "General Medicine",
    quals: "MBBS, MD (General Medicine)",
    room: "Room 4, ground floor",
  },
  d2: {
    name: "Dr. Anita Rao",
    spec: "Neurology",
    quals: "MBBS, MD, DM (Neurology)",
    room: "Room 12, first floor",
  },
  d3: {
    name: "Dr. Vikram Shah",
    spec: "Cardiology",
    quals: "MBBS, DM (Cardiology)",
    room: "Room 7, first floor",
  },
  d4: {
    name: "Dr. Meera Iyer",
    spec: "Dermatology",
    quals: "MBBS, MD (Dermatology)",
    room: "Room 9, ground floor",
  },
};

const INITIAL_APPTS = [
  {
    id: "a1",
    doc: "d1",
    slot: "2026-11-13T16:30",
    status: "Confirmed",
    reason: "Persistent dry cough",
  },
  {
    id: "a2",
    doc: "d2",
    slot: "2026-11-18T11:00",
    status: "Booked",
    reason: "Follow-up after migraine treatment",
  },
  {
    id: "a3",
    doc: "d3",
    slot: "2026-11-24T09:30",
    status: "Confirmed",
    reason: "Routine blood pressure review",
  },
  {
    id: "p0",
    doc: "d2",
    slot: "2026-11-20T09:00",
    status: "Cancelled",
    reason: "Headache review",
    cancel: {
      by: "Dr. Anita Rao",
      role: "doctor",
      at: "2026-11-11T17:40",
      why: "Dr. Rao is attending a neurology conference that day.",
    },
  },
  {
    id: "p1",
    doc: "d2",
    slot: "2026-11-02T10:00",
    status: "Completed",
    reason: "Recurring headaches",
    consult: "c1",
  },
  {
    id: "p3",
    doc: "d4",
    slot: "2026-10-29T12:00",
    status: "Cancelled",
    reason: "Rash on forearm",
    cancel: { by: "you", role: "patient", at: "2026-10-27T18:12", why: "" },
  },
  { id: "p4", doc: "d3", slot: "2026-10-06T11:30", status: "No-show", reason: "Palpitations" },
  {
    id: "p2",
    doc: "d1",
    slot: "2026-09-14T09:30",
    status: "Completed",
    reason: "Fever and body ache",
    consult: "c2",
  },
];

const CONSULTS = [
  {
    id: "c1",
    apptId: "p1",
    doc: "d2",
    date: "2026-11-02",
    diagnosis: "Migraine",
    notes:
      "Throbbing right-sided headache for three weeks, worse in the evenings after screen time. Light sensitivity and nausea during attacks. Neurological examination normal; no warning signs.",
    advice:
      "Keep a headache diary for four weeks. Sleep and eat at regular times, limit caffeine, and take screen breaks every hour. Return in four weeks, or sooner if the pattern changes or a headache comes with weakness or vision loss.",
    rx: [
      {
        medicine: "Sumatriptan",
        dosage: "50 mg, one tablet at onset; may repeat once after 2 hours",
        duration: "As needed, up to 2 doses in 24 hours",
      },
      {
        medicine: "Propranolol",
        dosage: "20 mg, one tablet twice daily after food",
        duration: "4 weeks",
      },
    ],
  },
  {
    id: "c2",
    apptId: "p2",
    doc: "d1",
    date: "2026-09-14",
    diagnosis: "Viral fever",
    notes:
      "Fever for two days with body ache and a mild sore throat. Throat slightly red, chest clear. No rash, no breathlessness.",
    advice:
      "Rest, drink plenty of fluids and eat light meals. Come back if the fever lasts beyond three days or you become breathless.",
    rx: [],
  },
];

const STATUS_STYLE = {
  Booked: { icon: "Calendar", mix: 9 },
  Confirmed: { icon: "CheckCircle", mix: 0, accent: true },
  Completed: { icon: "Check", mix: 16 },
  Cancelled: { icon: "X", mix: 5, strike: true },
  "No-show": { icon: "AlertCircle", mix: 12 },
};

const P = (s) => new Date(s.length === 10 ? s + "T00:00:00Z" : s + ":00Z");
// Every date and time on this screen goes through the one shared clinic-timezone
// formatter: date "d MMM yyyy", time "HH:mm", combined "d MMM yyyy HH:mm".
const fmtDate = (s) => formatClinicDate(s);
const fmtShort = (s) => formatClinicDate(s);
const fmtTime = (s) => formatClinicTime(s);
const fmtDT = (s) => formatClinicDateTime(s) + " " + clinicTimezone();
const hoursUntil = (s) => (P(s) - P(NOW)) / 36e5;
const dur = (h) => {
  const m = Math.round(h * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return hh + (hh === 1 ? " hour " : " hours ") + (mm ? mm + " minutes" : "").trim();
};
const hash = (str) => str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

function slotsFor(docId, date, raced, currentSlot) {
  if (!date || date < TODAY) return null;
  const dow = P(date).getUTCDay();
  if (dow === 0) return [];
  return DAY_SLOTS.map((t) => {
    const start = date + "T" + t;
    const key = docId + "|" + start;
    let state = "open";
    if (start === currentSlot) state = "yours";
    else if (hash(key) % 3 === 0 || raced[key]) state = "taken";
    return { time: t, start, key, state };
  }).filter((s) => P(s.start) > P(NOW));
}

function Modal({ labelId, onClose, children, wf, maxWidth }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) el.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && el) {
        const f = el.querySelectorAll(
          "button:not([disabled]),input:not([disabled]),select,textarea,[href]",
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, []);
  return (
    <div
      data-wf={wf}
      className="mb-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className="mb-dialog"
        style={{ maxWidth: maxWidth || 560 }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status];
  const Ico = Icons[s.icon];
  return (
    <span
      className="mb-status"
      style={{
        background: s.accent
          ? "color-mix(in srgb, var(--accent) 30%, transparent)"
          : "color-mix(in srgb, var(--ink) " + s.mix + "%, transparent)",
        textDecoration: s.strike ? "line-through" : "none",
      }}
    >
      <Ico className="w-4 h-4" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

function RescheduleModal({ appt, onClose, onConfirm }) {
  const doc = DOCTORS[appt.doc];
  const [date, setDate] = React.useState(appt.slot.slice(0, 10));
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);
  const [sel, setSel] = React.useState(null);
  const [msg, setMsg] = React.useState(null);
  const [raced, setRaced] = React.useState({});

  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [date, tick]);

  const slots = loading ? null : slotsFor(appt.doc, date, raced, appt.slot);
  const openCount = slots ? slots.filter((s) => s.state === "open").length : 0;

  const changeDate = (v) => {
    setDate(v);
    setSel(null);
    setMsg(null);
  };
  const confirm = () => {
    if (!sel) {
      setMsg({ kind: "hint", text: "pick one of the open times first, then confirm." });
      return;
    }
    const chosen = slots.find((s) => s.start === sel);
    if (chosen && chosen.time === "11:30" && !raced[chosen.key]) {
      setRaced({ ...raced, [chosen.key]: true });
      setSel(null);
      setTick(tick + 1);
      setMsg({
        kind: "race",
        text:
          "That time was just taken by someone else. Your appointment has not changed — it is still " +
          fmtDT(appt.slot) +
          ". We have refreshed the list, so please pick another time.",
      });
      return;
    }
    onConfirm(sel);
  };

  return (
    <Modal labelId="resched-title" onClose={onClose} wf="b-6-0" maxWidth={600}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="resched-title" className="mb-h2" style={{ margin: 0 }}>
            Choose a new time for {doc.name}
          </h2>
          <p className="mb-muted" style={{ margin: "8px 0 0" }}>
            currently {fmtDT(appt.slot)} · {doc.room}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Label htmlFor="resched-date" className="mb-label">
          Date
        </Label>
        <Input
          id="resched-date"
          data-wf="i-6-0-0"
          className="mb-field"
          type="date"
          min={TODAY}
          value={date}
          onChange={(e) => changeDate(e.target.value)}
          aria-describedby="resched-date-help"
        />
        <p id="resched-date-help" className="mb-muted mb-small" style={{ margin: "8px 0 0" }}>
          dates are in the clinic timezone ({clinicTimezone()}). the clinic is closed on sundays.
        </p>
      </div>

      <fieldset
        data-wf="i-6-0-1"
        style={{ border: "none", padding: 0, margin: "24px 0 0", minWidth: 0 }}
        aria-busy={loading}
      >
        <legend className="mb-label" style={{ padding: 0 }}>
          Open slots
        </legend>
        <div aria-live="polite">
          {loading && (
            <div>
              <p className="mb-muted mb-small" style={{ margin: "0 0 12px" }}>
                checking {doc.name}&apos;s calendar for {fmtDate(date || TODAY)}…
              </p>
              <div className="mb-slot-grid" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="mb-skel" />
                ))}
              </div>
            </div>
          )}
          {!loading && !date && (
            <p className="mb-muted" style={{ margin: 0 }}>
              choose a date to see which times are open.
            </p>
          )}
          {!loading && date && slots === null && (
            <p className="mb-muted" style={{ margin: 0 }}>
              choose today or a later date — past days can&apos;t be booked.
            </p>
          )}
          {!loading && slots && slots.length === 0 && (
            <p className="mb-muted" style={{ margin: 0 }}>
              {doc.name} doesn&apos;t consult on {fmtDate(date)}. try another day.
            </p>
          )}
          {!loading && slots && slots.length > 0 && (
            <div>
              <p className="mb-muted mb-small" style={{ margin: "0 0 12px" }}>
                {openCount === 0
                  ? "every time on this day is taken — try another date."
                  : openCount +
                    (openCount === 1 ? " time is" : " times are") +
                    " open, refreshed just now."}
              </p>
              <div className="mb-slot-grid">
                {slots.map((s) => (
                  <label key={s.key} className={"mb-slot" + (s.state !== "open" ? " is-off" : "")}>
                    <input
                      type="radio"
                      name="new-slot"
                      value={s.start}
                      disabled={s.state !== "open"}
                      checked={sel === s.start}
                      onChange={() => {
                        setSel(s.start);
                        setMsg(null);
                      }}
                    />
                    <span>
                      {s.time}
                      {s.state === "taken" && <em> taken</em>}
                      {s.state === "yours" && <em> your time</em>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      <div role="alert" style={{ minHeight: 0 }}>
        {msg && (
          <p className="mb-msg" data-kind={msg.kind} style={{ margin: "16px 0 0" }}>
            <Icons.AlertCircle
              className="w-5 h-5"
              aria-hidden="true"
              style={{ flex: "0 0 auto" }}
            />
            <span>{msg.text}</span>
          </p>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <Button
          type="button"
          data-wf="i-6-0-2"
          className="mb-btn mb-btn-primary"
          onClick={confirm}
          disabled={loading}
        >
          <Icons.Check className="w-4 h-4" aria-hidden="true" /> Confirm new time
        </Button>
      </div>
    </Modal>
  );
}

export default function Screen() {
  const navigate = useNavigate();
  const clinicTz = useClinicTimezone();
  const ink = brand.primaryColor;
  const accent = brand.accentColor;
  const bg = brand.backgroundColor;

  const [tab, setTab] = React.useState("upcoming");
  const [appts, setAppts] = React.useState(INITIAL_APPTS);
  const [selectedId, setSelectedId] = React.useState("a2");
  const [resched, setResched] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [consultId, setConsultId] = React.useState("c1");

  const [profile, setProfile] = React.useState({
    name: "Kavya Menon",
    phone: "+91 98450 21763",
    dob: "1991-03-18",
    gender: "Female",
  });
  const [savedProfile, setSavedProfile] = React.useState({
    name: "Kavya Menon",
    phone: "+91 98450 21763",
    dob: "1991-03-18",
    gender: "Female",
  });
  const [pErr, setPErr] = React.useState({});
  const [pMsg, setPMsg] = React.useState(null);

  const [password, setPassword] = React.useState("marigold42");
  const [pw, setPw] = React.useState({ cur: "", nw: "" });
  const [pwErr, setPwErr] = React.useState({});
  const [pwMsg, setPwMsg] = React.useState(null);

  const upcoming = appts
    .filter((a) => a.status === "Booked" || a.status === "Confirmed")
    .sort((a, b) => P(a.slot) - P(b.slot));
  const past = appts
    .filter((a) => a.status !== "Booked" && a.status !== "Confirmed")
    .sort((a, b) => P(b.slot) - P(a.slot));
  const selected = upcoming.find((a) => a.id === selectedId) || null;
  const canChange = (a) => hoursUntil(a.slot) > CLINIC.cutoff;

  const consults = CONSULTS.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const consult = consults.find((c) => c.id === consultId) || null;

  const TABS = [
    { key: "upcoming", label: "Upcoming", wf: "i-1-0-0", n: upcoming.length },
    { key: "past", label: "Past & cancelled", wf: "i-1-0-1", n: past.length },
    { key: "history", label: "Consultation history", wf: "i-1-0-2", n: consults.length },
    { key: "profile", label: "My profile", wf: "i-1-0-3" },
  ];
  const onTabKey = (e, idx) => {
    let next = null;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      setTab(TABS[next].key);
      const el = document.getElementById("tab-" + TABS[next].key);
      if (el) el.focus();
    }
  };

  const doReschedule = (newStart) => {
    const a = resched;
    setAppts(appts.map((x) => (x.id === a.id ? { ...x, slot: newStart, movedFrom: x.slot } : x)));
    setNotice({
      text:
        "Done — your visit with " +
        DOCTORS[a.doc].name +
        " is now " +
        fmtDT(newStart) +
        ". The old time has gone back to the open pool.",
    });
    setResched(null);
  };
  const doCancel = (a) => {
    setAppts(
      appts.map((x) =>
        x.id === a.id
          ? { ...x, status: "Cancelled", cancel: { by: "you", role: "patient", at: NOW, why: "" } }
          : x,
      ),
    );
    setNotice({
      text:
        "Your appointment with " +
        DOCTORS[a.doc].name +
        " on " +
        fmtDT(a.slot) +
        " is cancelled. You can find it under past & cancelled.",
    });
    setSelectedId(null);
  };

  const saveProfile = (e) => {
    e.preventDefault();
    const errs = {};
    if (!profile.name.trim()) errs.name = "Please enter your full name.";
    const digits = profile.phone.replace(/[^0-9]/g, "");
    if (!profile.phone.trim())
      errs.phone = "Please enter a phone number the clinic can reach you on.";
    else if (digits.length < 10 || digits.length > 13 || /[^0-9+\-\s()]/.test(profile.phone))
      errs.phone = "That phone number looks incomplete — use 10 to 13 digits.";
    if (profile.dob && profile.dob > TODAY) errs.dob = "Date of birth can’t be in the future.";
    setPErr(errs);
    if (Object.keys(errs).length) {
      setPMsg(null);
      return;
    }
    if (JSON.stringify(profile) === JSON.stringify(savedProfile)) {
      setPMsg({ ok: false, text: "nothing has changed yet — edit a detail, then save." });
      return;
    }
    setSavedProfile(profile);
    setPMsg({ ok: true, text: "saved. your details will be here next time you visit." });
  };

  const updatePassword = (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.cur) errs.cur = "Enter your current password.";
    else if (pw.cur !== password)
      errs.cur = "That isn’t your current password. Your existing password is still in force.";
    if (!pw.nw) errs.nw = "Enter a new password.";
    else if (pw.nw.length < 8 || !/[A-Za-z]/.test(pw.nw) || !/[0-9]/.test(pw.nw))
      errs.nw = "Use at least 8 characters, with at least one letter and one number.";
    else if (pw.nw === pw.cur)
      errs.nw = "Choose a password that is different from your current one.";
    setPwErr(errs);
    if (Object.keys(errs).length) {
      setPwMsg(null);
      return;
    }
    setPassword(pw.nw);
    setPw({ cur: "", nw: "" });
    setPwMsg("your password is updated. the old one no longer works.");
  };

  const printRecord = () => {
    try {
      window.print();
    } catch (err) {
      /* printing unavailable in this preview */
    }
  };

  const viewRecord = (id) => {
    setConsultId(id);
    setTab("history");
  };

  const css = `
.mb-root{--ink:${ink};--accent:${accent};--bg:${bg};font-family:${brand.fontBody};color:var(--ink);background:var(--bg);font-size:16px;line-height:1.55;font-variant-numeric:tabular-nums}
.mb-root *{box-sizing:border-box}
.mb-h1{font-family:${brand.fontHeading};font-style:italic;font-weight:600;font-size:40px;line-height:1.15;margin:0;letter-spacing:-0.01em}
.mb-h2{font-family:${brand.fontHeading};font-style:italic;font-weight:600;font-size:28px;line-height:1.2;margin:0}
.mb-h3{font-family:${brand.fontHeading};font-style:italic;font-weight:600;font-size:20px;line-height:1.3;margin:0}
.mb-muted{color:color-mix(in srgb,var(--ink) 80%,var(--bg))}
.mb-small{font-size:14px}
.mb-label{display:block;font-size:14px;font-weight:600;margin:0 0 8px 16px;color:var(--ink)}
.mb-field{display:block;width:100%;min-height:48px;padding:12px 20px;border:none;border-radius:9999px;background:color-mix(in srgb,var(--ink) 8%,var(--bg));color:var(--ink);font:inherit;font-size:16px;box-shadow:inset 0 1px 2px color-mix(in srgb,var(--ink) 14%,transparent);transition:background .2s,box-shadow .2s}
.mb-field:hover{background:color-mix(in srgb,var(--ink) 11%,var(--bg))}
.mb-field[readonly]{background:color-mix(in srgb,var(--ink) 4%,var(--bg));box-shadow:none;cursor:default}
.mb-field[aria-invalid="true"]{box-shadow:inset 0 0 0 2px var(--clay)}
.mb-root{--clay:color-mix(in srgb,var(--accent) 35%,firebrick)}
.mb-root button:focus-visible,.mb-root input:focus-visible,.mb-root select:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
.mb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 24px;border:none;border-radius:9999px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s,transform .1s,opacity .2s;width:auto}
.mb-btn:active:not([aria-disabled="true"]):not(:disabled){transform:scale(.98)}
.mb-btn-primary{background:var(--ink);color:var(--bg)}
.mb-btn-primary:hover:not([aria-disabled="true"]):not(:disabled){background:color-mix(in srgb,var(--ink) 84%,var(--bg))}
.mb-btn-soft{background:color-mix(in srgb,var(--ink) 10%,var(--bg));color:var(--ink)}
.mb-btn-soft:hover:not([aria-disabled="true"]):not(:disabled){background:color-mix(in srgb,var(--ink) 17%,var(--bg))}
.mb-btn-clay{background:var(--clay);color:var(--bg)}
.mb-btn-clay:hover{background:color-mix(in srgb,var(--clay) 85%,var(--ink))}
.mb-btn[aria-disabled="true"],.mb-btn:disabled{opacity:.55;cursor:not-allowed}
.mb-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 auto;border:none;border-radius:9999px;background:color-mix(in srgb,var(--ink) 8%,transparent);color:var(--ink);cursor:pointer;transition:background .2s}
.mb-icon-btn:hover{background:color-mix(in srgb,var(--ink) 16%,transparent)}
.mb-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:8px;border-radius:9999px;background:color-mix(in srgb,var(--ink) 7%,transparent);width:fit-content;max-width:100%}
.mb-tab{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 20px;border:none;border-radius:9999px;background:transparent;color:var(--ink);font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s,color .2s}
.mb-tab:hover{background:color-mix(in srgb,var(--ink) 10%,transparent)}
.mb-tab[aria-selected="true"]{background:var(--ink);color:var(--bg)}
.mb-tab .mb-count{font-size:12px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;background:var(--accent);color:var(--ink);padding:0 6px}
.mb-panel{animation:mbRise .25s ease both}
.mb-status{display:inline-flex;align-items:center;gap:8px;padding:4px 12px 4px 8px;border-radius:9999px;font-size:14px;font-weight:600;white-space:nowrap}
.mb-wrap table{width:100%;border-collapse:separate;border-spacing:0 8px}
.mb-wrap th{text-align:left;font-size:13px;font-weight:600;padding:8px 16px;color:color-mix(in srgb,var(--ink) 80%,var(--bg))}
.mb-wrap td{padding:16px;vertical-align:top;background:color-mix(in srgb,var(--ink) 7%,transparent);font-size:15px}
.mb-wrap td:first-child{border-radius:24px 0 0 24px}
.mb-wrap td:last-child{border-radius:0 24px 24px 0}
.mb-wrap tr[data-selected="true"] td{background:color-mix(in srgb,var(--accent) 24%,transparent)}
.mb-wrap tr[data-selected="true"] td:first-child{box-shadow:inset 6px 0 0 var(--accent)}
.mb-wrap tr{animation:mbRise .25s ease both}
.mb-wrap .mb-cell{display:block}
.mb-wrap .mb-sub{display:block;font-size:13px;margin-top:4px}
.mb-past{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.mb-past-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 24px;align-items:start;padding:16px 24px;border-radius:24px;background:color-mix(in srgb,var(--ink) 7%,transparent);font-size:15px;animation:mbRise .25s ease both}
.mb-past-row .mb-sub{display:block;font-size:13px;margin-top:4px}
.mb-select-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 16px;border:none;border-radius:9999px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;background:color-mix(in srgb,var(--ink) 10%,var(--bg));color:var(--ink);transition:background .2s}
.mb-select-btn:hover{background:color-mix(in srgb,var(--ink) 18%,var(--bg))}
.mb-select-btn[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
.mb-bar{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;align-items:center;margin-top:16px}
.mb-notice{display:flex;align-items:flex-start;gap:12px;padding:16px 24px;border-radius:9999px;background:color-mix(in srgb,var(--accent) 24%,transparent);margin-top:24px;animation:mbRise .25s ease both}
.mb-msg{display:flex;align-items:flex-start;gap:12px;padding:16px 20px;border-radius:24px;font-size:15px;background:color-mix(in srgb,var(--clay) 12%,var(--bg));color:var(--ink)}
.mb-msg[data-kind="hint"]{background:color-mix(in srgb,var(--ink) 8%,var(--bg))}
.mb-msg svg{color:var(--clay)}
.mb-ok{display:flex;align-items:flex-start;gap:12px;padding:16px 20px;border-radius:24px;font-size:15px;background:color-mix(in srgb,var(--accent) 24%,transparent);animation:mbRise .25s ease both}
.mb-err{display:flex;align-items:flex-start;gap:8px;margin:8px 0 0 16px;font-size:14px;color:var(--clay);font-weight:600}
.mb-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--ink) 45%,transparent);animation:mbFade .2s ease both}
.mb-dialog{width:100%;max-height:calc(100vh - 32px);overflow:auto;background:var(--bg);border-radius:32px;padding:32px;box-shadow:0 24px 64px color-mix(in srgb,var(--ink) 35%,transparent);animation:mbRise .25s ease both;outline:none}
.mb-slot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
.mb-slot{position:relative;display:block}
.mb-slot input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}
.mb-slot span{display:flex;align-items:center;justify-content:center;gap:4px;min-height:48px;padding:8px 12px;border-radius:9999px;background:color-mix(in srgb,var(--ink) 9%,var(--bg));font-weight:600;font-size:15px;transition:background .2s,color .2s}
.mb-slot span em{font-style:normal;font-weight:500;font-size:12px}
.mb-slot:hover input:not(:disabled)+span{background:color-mix(in srgb,var(--ink) 18%,var(--bg))}
.mb-slot input:checked+span{background:var(--ink);color:var(--bg)}
.mb-slot input:focus-visible+span{outline:3px solid var(--ink);outline-offset:3px}
.mb-slot.is-off input{cursor:not-allowed}
.mb-slot.is-off span{background:transparent;color:color-mix(in srgb,var(--ink) 75%,var(--bg));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 22%,transparent);text-decoration:line-through}
.mb-slot.is-off span em{text-decoration:none}
.mb-skel{display:block;height:48px;border-radius:9999px;background:color-mix(in srgb,var(--ink) 9%,var(--bg));animation:mbPulse 1.2s ease-in-out infinite}
.mb-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.mb-hist button{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;text-align:left;min-height:64px;padding:16px 24px;border:none;border-radius:9999px;background:color-mix(in srgb,var(--ink) 7%,transparent);color:var(--ink);font:inherit;font-size:15px;cursor:pointer;transition:background .2s}
.mb-hist button:hover{background:color-mix(in srgb,var(--ink) 13%,transparent)}
.mb-hist button[aria-current="true"]{background:color-mix(in srgb,var(--accent) 28%,transparent);box-shadow:inset 6px 0 0 var(--accent)}
.mb-arch{border-radius:50% 50% 24px 24px / 140px 140px 24px 24px;background:color-mix(in srgb,var(--ink) 7%,transparent);padding:96px 32px 32px}
.mb-rx{width:100%;border-collapse:collapse;font-size:15px}
.mb-rx th{text-align:left;font-size:13px;padding:8px 12px 8px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
.mb-rx td{padding:12px 12px 12px 0;vertical-align:top;border-bottom:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.mb-panel-soft{background:color-mix(in srgb,var(--ink) 7%,transparent);border-radius:24px;padding:32px}
.mb-grid2{display:grid;grid-template-columns:1fr;gap:24px}
.mb-grid12{display:grid;grid-template-columns:1fr;gap:32px}
.mb-stack{display:flex;flex-direction:column;gap:24px}
.mb-print-only{display:none}
@keyframes mbRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mbFade{from{opacity:0}to{opacity:1}}
@keyframes mbPulse{0%,100%{opacity:1}50%{opacity:.45}}
@media (min-width:1024px){
  .mb-grid2{grid-template-columns:1fr 1fr;gap:32px;align-items:start}
  .mb-grid12{grid-template-columns:repeat(12,minmax(0,1fr));align-items:start}
  .mb-c7{grid-column:span 7}.mb-c5{grid-column:span 5}
  .mb-b3{grid-column:span 3}.mb-b6{grid-column:span 6}
}
@media (max-width:1023px){
  .mb-bar{grid-template-columns:1fr}
  .mb-bar>*{grid-column:auto!important}
  .mb-bar .mb-btn{width:100%}
}
@media (max-width:760px){
  .mb-h1{font-size:32px}.mb-h2{font-size:24px}
  .mb-wrap table,.mb-wrap tbody,.mb-wrap tr,.mb-wrap td{display:block;width:100%}
  .mb-wrap thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .mb-wrap tr{background:color-mix(in srgb,var(--ink) 7%,transparent);border-radius:24px;margin-bottom:12px;padding:8px 0}
  .mb-wrap tr[data-selected="true"]{background:color-mix(in srgb,var(--accent) 24%,transparent);box-shadow:inset 6px 0 0 var(--accent)}
  .mb-wrap td,.mb-wrap tr[data-selected="true"] td{background:transparent!important;box-shadow:none!important;border-radius:0!important;display:flex;gap:16px;justify-content:space-between;padding:8px 20px}
  .mb-wrap td::before{content:attr(data-label);flex:0 0 96px;font-size:13px;font-weight:600;color:color-mix(in srgb,var(--ink) 80%,var(--bg))}
  .mb-wrap td .mb-cell{flex:1;text-align:right}
  .mb-tabs{border-radius:24px;width:100%}
  .mb-tab{flex:1 1 40%;justify-content:center;padding:8px 12px}
  .mb-notice{border-radius:24px}
  .mb-dialog{padding:24px;border-radius:24px}
  .mb-arch{padding:80px 20px 24px;border-radius:50% 50% 24px 24px / 100px 100px 24px 24px}
  .mb-hist button{border-radius:24px;flex-wrap:wrap}
  .mb-panel-soft{padding:24px}
  .mb-btn{width:100%}
}
@media print{
  body *{visibility:hidden!important}
  .mb-print-sheet,.mb-print-sheet *{visibility:visible!important}
  .mb-print-sheet{position:absolute!important;left:0;top:0;width:100%;background:#fff!important;padding:24px!important;border-radius:0!important;color:#000}
  .mb-print-only{display:block!important}
}
@media (prefers-reduced-motion:reduce){
  .mb-root *,.mb-overlay,.mb-dialog{animation:none!important;transition:none!important}
}`;

  const actionsText = selected
    ? canChange(selected)
      ? "This visit is " +
        dur(hoursUntil(selected.slot)) +
        " away. You can change it until " +
        fmtDT(
          new Date(P(selected.slot).getTime() - CLINIC.cutoff * 36e5).toISOString().slice(0, 16),
        ) +
        "."
      : "This visit starts in " +
        dur(hoursUntil(selected.slot)) +
        ", so it is inside the " +
        CLINIC.cutoff +
        "-hour window."
    : "Select an appointment above to change it.";

  const renderRows = (list) =>
    list.map((a) => {
      const d = DOCTORS[a.doc];
      return (
        <TR key={a.id} data-selected={selectedId === a.id ? "true" : "false"}>
          <TD data-label="Date & time">
            <span className="mb-cell">
              <strong>{fmtDate(a.slot)}</strong>
              <span className="mb-sub">
                {fmtTime(a.slot)} {clinicTz}
              </span>
              {a.movedFrom && (
                <span className="mb-sub mb-muted">rescheduled from {fmtDT(a.movedFrom)}</span>
              )}
            </span>
          </TD>
          <TD data-label="Doctor">
            <span className="mb-cell">
              <strong>{d.name}</strong>
              <span className="mb-sub mb-muted">{a.reason}</span>
            </span>
          </TD>
          <TD data-label="Specialization">
            <span className="mb-cell">{d.spec}</span>
          </TD>
          <TD data-label="Location">
            <span className="mb-cell">{d.room}</span>
          </TD>
          <TD data-label="Status">
            <span className="mb-cell">
              <StatusBadge status={a.status} />
            </span>
          </TD>
          <TD data-label="Actions">
            <span className="mb-cell">
              <button
                type="button"
                className="mb-select-btn"
                aria-pressed={selectedId === a.id}
                aria-label={"Select appointment with " + d.name + " on " + fmtDate(a.slot)}
                onClick={() => setSelectedId(a.id)}
              >
                {selectedId === a.id && <Icons.Check className="w-4 h-4" aria-hidden="true" />}
                {selectedId === a.id ? "Selected" : "Select"}
              </button>
            </span>
          </TD>
        </TR>
      );
    });

  const renderPast = (list) =>
    list.map((a) => {
      const d = DOCTORS[a.doc];
      return (
        <li key={a.id} className="mb-past-row">
          <div>
            <strong>{fmtDate(a.slot)}</strong>
            <span className="mb-sub">
              {fmtTime(a.slot)} {clinicTz}
            </span>
          </div>
          <div>
            <strong>{d.name}</strong>
            <span className="mb-sub mb-muted">
              {d.spec} · {d.room}
            </span>
            <span className="mb-sub mb-muted">{a.reason}</span>
          </div>
          <div>
            <StatusBadge status={a.status} />
            {a.cancel && (
              <span className="mb-sub mb-muted">
                {a.cancel.role === "patient" ? "cancelled by you" : "cancelled by " + a.cancel.by}{" "}
                on {fmtShort(a.cancel.at)}
                {a.cancel.why ? " — “" + a.cancel.why + "”" : ""}
              </span>
            )}
          </div>
          <div>
            {a.consult ? (
              <button
                type="button"
                className="mb-select-btn"
                onClick={() => viewRecord(a.consult)}
                aria-label={"View consultation record from " + fmtShort(a.slot) + " with " + d.name}
              >
                <Icons.FileText className="w-4 h-4" aria-hidden="true" /> View record
              </button>
            ) : (
              <span className="mb-muted mb-small">closed</span>
            )}
          </div>
        </li>
      );
    });

  const tableHead = () => (
    <THead>
      <TR>
        <TH scope="col" data-wf="i-2-0-0">
          Date &amp; time
        </TH>
        <TH scope="col" data-wf="i-2-0-1">
          Doctor
        </TH>
        <TH scope="col" data-wf="i-2-0-2">
          Specialization
        </TH>
        <TH scope="col" data-wf="i-2-0-3">
          Location
        </TH>
        <TH scope="col" data-wf="i-2-0-4">
          Status
        </TH>
        <TH scope="col" data-wf="i-2-0-5">
          Actions
        </TH>
      </TR>
    </THead>
  );

  const blocked = selected ? !canChange(selected) : true;
  const dis = (e, fn) => {
    if (blocked) {
      e.preventDefault();
      return;
    }
    fn();
  };

  return (
    <div className="mb-root">
      <style>{css}</style>
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <header>
          <p className="mb-muted mb-small" style={{ margin: "0 0 8px" }}>
            today is {fmtDate(TODAY)} · all times in the clinic timezone ({clinicTz})
          </p>
          <h1 data-wf="b-0-0" className="mb-h1">
            My appointments &amp; records
          </h1>
        </header>

        <div style={{ marginTop: 32 }} data-wf="b-1-0">
          <div role="tablist" aria-label="My appointments and records" className="mb-tabs">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={"tab-" + t.key}
                data-wf={t.wf}
                aria-selected={tab === t.key}
                aria-controls={"panel-" + t.key}
                tabIndex={tab === t.key ? 0 : -1}
                className="mb-tab"
                onClick={() => setTab(t.key)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
                {t.n !== undefined && (
                  <span className="mb-count" aria-label={t.n + " items"}>
                    {t.n}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div role="status" aria-live="polite">
          {notice && (
            <div className="mb-notice">
              <Icons.CheckCircle
                className="w-5 h-5"
                aria-hidden="true"
                style={{ flex: "0 0 auto", marginTop: 2 }}
              />
              <p style={{ margin: 0, flex: 1 }}>{notice.text}</p>
            </div>
          )}
        </div>

        {/* UPCOMING */}
        {tab === "upcoming" && (
          <section
            role="tabpanel"
            id="panel-upcoming"
            aria-labelledby="tab-upcoming"
            className="mb-panel"
            style={{ marginTop: 40 }}
          >
            {upcoming.length > 0 ? (
              <>
                <div data-wf="b-2-0" className="mb-wrap">
                  <h2 className="mb-h2" style={{ marginBottom: 16 }}>
                    Upcoming appointments{" "}
                    <span
                      className="mb-muted"
                      style={{
                        fontSize: 16,
                        fontStyle: "normal",
                        fontFamily: brand.fontBody,
                        fontWeight: 400,
                      }}
                    >
                      (times in the clinic timezone, {clinicTz})
                    </span>
                  </h2>
                  <Table>
                    {tableHead()}
                    <TBody>{renderRows(upcoming)}</TBody>
                  </Table>
                </div>

                <div className="mb-bar">
                  <Button
                    type="button"
                    data-wf="b-3-0"
                    className="mb-btn mb-btn-primary mb-b3"
                    style={{ gridColumn: "span 3" }}
                    aria-disabled={blocked}
                    aria-describedby="change-help"
                    onClick={(e) =>
                      dis(e, () => {
                        setNotice(null);
                        setResched(selected);
                      })
                    }
                  >
                    <Icons.Calendar className="w-4 h-4" aria-hidden="true" /> Reschedule
                  </Button>
                  <Button
                    type="button"
                    data-wf="b-3-1"
                    className="mb-btn mb-btn-soft mb-b3"
                    style={{ gridColumn: "span 3" }}
                    aria-disabled={blocked}
                    aria-describedby="change-help"
                    onClick={(e) =>
                      dis(e, () => {
                        doCancel(selected);
                      })
                    }
                  >
                    <Icons.X className="w-4 h-4" aria-hidden="true" /> Cancel appointment
                  </Button>
                  <div id="change-help" style={{ gridColumn: "span 6" }}>
                    <p data-wf="b-3-2" className="mb-small" style={{ margin: 0 }}>
                      Reschedule and cancel are unavailable within {CLINIC.cutoff} hours of the
                      appointment. Please contact the clinic directly.
                    </p>
                    <p className="mb-muted mb-small" style={{ margin: "4px 0 0" }}>
                      {actionsText}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div
                  data-wf="b-4-0"
                  style={{
                    background: "color-mix(in srgb, var(--ink) 7%, transparent)",
                    borderRadius: "50% 50% 24px 24px / 120px 120px 24px 24px",
                    padding: "80px 24px 48px",
                    textAlign: "center",
                  }}
                >
                  <Empty
                    title="Nothing booked just now"
                    description="You have no appointments yet. Find a doctor to book your first visit."
                    action={
                      <Button
                        type="button"
                        data-wf="b-5-0"
                        className="mb-btn mb-btn-primary"
                        onClick={() => navigate("find-a-doctor")}
                      >
                        <Icons.Search className="w-4 h-4" aria-hidden="true" /> Find a doctor
                      </Button>
                    }
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* PAST */}
        {tab === "past" && (
          <section
            role="tabpanel"
            id="panel-past"
            aria-labelledby="tab-past"
            className="mb-panel"
            style={{ marginTop: 40 }}
          >
            <h2 className="mb-h2" style={{ marginBottom: 16 }}>
              Past &amp; cancelled{" "}
              <span
                className="mb-muted"
                style={{
                  fontSize: 16,
                  fontStyle: "normal",
                  fontFamily: brand.fontBody,
                  fontWeight: 400,
                }}
              >
                {"(most recent first, clinic timezone " + clinicTz + ")"}
              </span>
            </h2>
            {past.length > 0 ? (
              <ul className="mb-past">{renderPast(past)}</ul>
            ) : (
              <div
                style={{
                  background: "color-mix(in srgb, var(--ink) 7%, transparent)",
                  borderRadius: 24,
                  padding: 48,
                  textAlign: "center",
                }}
              >
                <Empty
                  title="No past visits yet"
                  description="Completed, cancelled and missed appointments will be kept here."
                />
              </div>
            )}
          </section>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <section
            role="tabpanel"
            id="panel-history"
            aria-labelledby="tab-history"
            className="mb-panel"
            style={{ marginTop: 40 }}
          >
            {consults.length === 0 ? (
              <div
                style={{
                  background: "color-mix(in srgb, var(--ink) 7%, transparent)",
                  borderRadius: 24,
                  padding: 48,
                  textAlign: "center",
                }}
              >
                <Empty
                  title="No consultation records yet"
                  description="Records appear here after a completed visit."
                />
              </div>
            ) : (
              <>
                <div className="mb-grid12">
                  <div className="mb-c7" data-wf="b-7-0">
                    <h2 className="mb-h2" style={{ marginBottom: 8 }}>
                      Consultation history
                    </h2>
                    <p className="mb-muted mb-small" style={{ margin: "0 0 24px" }}>
                      only you and the doctor who treated you can open these notes.
                    </p>
                    <ul className="mb-hist">
                      {consults.map((c, i) => {
                        const d = DOCTORS[c.doc];
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              data-wf={"i-7-0-" + i}
                              aria-current={consultId === c.id ? "true" : "false"}
                              onClick={() => setConsultId(c.id)}
                            >
                              <span>
                                {fmtShort(c.date)} · {d.name} · {d.spec} ·{" "}
                                <strong>{c.diagnosis}</strong>
                              </span>
                              <Icons.ChevronRight
                                className="w-5 h-5"
                                aria-hidden="true"
                                style={{ flex: "0 0 auto" }}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mb-c5">
                    {consult && (
                      <article
                        data-wf="b-7-1"
                        className="mb-arch mb-print-sheet"
                        aria-labelledby="record-title"
                        key={consult.id}
                        style={{ animation: "mbRise .25s ease both" }}
                      >
                        <svg
                          aria-hidden="true"
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          fill="none"
                          style={{ display: "block", margin: "-56px auto 16px" }}
                          className="no-print"
                        >
                          <path
                            d="M20 36V14"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path d="M20 22C12 22 8 16 8 8c8 0 12 5 12 14Z" fill="var(--accent)" />
                          <path
                            d="M20 28c7 0 11-5 11-12-7 0-11 4-11 12Z"
                            fill="currentColor"
                            opacity=".35"
                          />
                        </svg>
                        <p className="mb-small mb-muted" style={{ margin: 0, textAlign: "center" }}>
                          {CLINIC.name} · consultation record
                        </p>
                        <h3
                          id="record-title"
                          className="mb-h2"
                          style={{ textAlign: "center", margin: "8px 0 24px" }}
                        >
                          {consult.diagnosis}
                        </h3>

                        <dl
                          style={{
                            margin: 0,
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: "8px 16px",
                            fontSize: 15,
                          }}
                        >
                          <dt className="mb-muted">Patient</dt>
                          <dd style={{ margin: 0 }}>{savedProfile.name}</dd>
                          <dt className="mb-muted">Date</dt>
                          <dd style={{ margin: 0 }}>{fmtShort(consult.date)}</dd>
                          <dt className="mb-muted">Doctor</dt>
                          <dd style={{ margin: 0 }}>
                            {DOCTORS[consult.doc].name}
                            <br />
                            <span className="mb-muted mb-small">
                              {DOCTORS[consult.doc].quals} · {DOCTORS[consult.doc].spec}
                            </span>
                          </dd>
                        </dl>

                        <h4 className="mb-h3" style={{ margin: "24px 0 8px" }}>
                          Notes
                        </h4>
                        <p style={{ margin: 0 }}>{consult.notes}</p>
                        <h4 className="mb-h3" style={{ margin: "24px 0 8px" }}>
                          Advice
                        </h4>
                        <p style={{ margin: 0 }}>{consult.advice}</p>
                        <h4 className="mb-h3" style={{ margin: "24px 0 8px" }}>
                          Prescription
                        </h4>
                        {consult.rx.length === 0 ? (
                          <p style={{ margin: 0 }}>No medication prescribed.</p>
                        ) : (
                          <table className="mb-rx">
                            <thead>
                              <tr>
                                <th scope="col">Medicine</th>
                                <th scope="col">Dosage</th>
                                <th scope="col">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {consult.rx.map((r, i) => (
                                <tr key={i}>
                                  <td>
                                    <strong>{r.medicine}</strong>
                                  </td>
                                  <td>{r.dosage}</td>
                                  <td>{r.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </article>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 32 }} className="mb-bar">
                  <Button
                    type="button"
                    data-wf="b-8-0"
                    className="mb-btn mb-btn-primary mb-b3"
                    style={{ gridColumn: "span 3" }}
                    onClick={printRecord}
                    disabled={!consult}
                  >
                    <Icons.Download className="w-4 h-4" aria-hidden="true" /> Print
                  </Button>
                  <p className="mb-muted mb-small" style={{ gridColumn: "span 9", margin: 0 }}>
                    prints the open record only — clinic name, your name, doctor, diagnosis, advice
                    and prescription, with no menus or buttons.
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <section
            role="tabpanel"
            id="panel-profile"
            aria-labelledby="tab-profile"
            className="mb-panel mb-grid2"
            style={{ marginTop: 40 }}
          >
            <form
              data-wf="b-9-0"
              className="mb-panel-soft"
              onSubmit={saveProfile}
              noValidate
              aria-labelledby="profile-title"
            >
              <h2 id="profile-title" className="mb-h2" style={{ marginBottom: 8 }}>
                My profile
              </h2>
              <p className="mb-muted mb-small" style={{ margin: "0 0 24px" }}>
                the clinic uses these details to reach you about a visit.
              </p>
              <div className="mb-stack" style={{ gap: 20 }}>
                <div>
                  <Label htmlFor="pf-name" className="mb-label">
                    Full name
                  </Label>
                  <Input
                    id="pf-name"
                    data-wf="i-9-0-0"
                    className="mb-field"
                    autoComplete="name"
                    value={profile.name}
                    aria-invalid={!!pErr.name}
                    aria-describedby={pErr.name ? "pf-name-err" : undefined}
                    onChange={(e) => {
                      setProfile({ ...profile, name: e.target.value });
                      setPMsg(null);
                    }}
                  />
                  {pErr.name && (
                    <p id="pf-name-err" className="mb-err">
                      <Icons.AlertCircle
                        className="w-4 h-4"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto", marginTop: 3 }}
                      />
                      {pErr.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pf-email" className="mb-label">
                    Email (read-only)
                  </Label>
                  <Input
                    id="pf-email"
                    data-wf="i-9-0-1"
                    className="mb-field"
                    type="email"
                    value="kavya.menon@mailbox.in"
                    readOnly
                    aria-describedby="pf-email-help"
                  />
                  <p
                    id="pf-email-help"
                    className="mb-muted mb-small"
                    style={{ margin: "8px 0 0 16px" }}
                  >
                    this is your sign-in email, so it can’t be changed here.
                  </p>
                </div>
                <div>
                  <Label htmlFor="pf-phone" className="mb-label">
                    Phone number
                  </Label>
                  <Input
                    id="pf-phone"
                    data-wf="i-9-0-2"
                    className="mb-field"
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone}
                    aria-invalid={!!pErr.phone}
                    aria-describedby={pErr.phone ? "pf-phone-err" : undefined}
                    onChange={(e) => {
                      setProfile({ ...profile, phone: e.target.value });
                      setPMsg(null);
                    }}
                  />
                  {pErr.phone && (
                    <p id="pf-phone-err" className="mb-err">
                      <Icons.AlertCircle
                        className="w-4 h-4"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto", marginTop: 3 }}
                      />
                      {pErr.phone}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pf-dob" className="mb-label">
                    Date of birth
                  </Label>
                  <Input
                    id="pf-dob"
                    data-wf="i-9-0-3"
                    className="mb-field"
                    type="date"
                    max={TODAY}
                    autoComplete="bday"
                    value={profile.dob}
                    aria-invalid={!!pErr.dob}
                    aria-describedby={pErr.dob ? "pf-dob-err" : undefined}
                    onChange={(e) => {
                      setProfile({ ...profile, dob: e.target.value });
                      setPMsg(null);
                    }}
                  />
                  {pErr.dob && (
                    <p id="pf-dob-err" className="mb-err">
                      <Icons.AlertCircle
                        className="w-4 h-4"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto", marginTop: 3 }}
                      />
                      {pErr.dob}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pf-gender" className="mb-label">
                    Gender
                  </Label>
                  <Select
                    id="pf-gender"
                    data-wf="i-9-0-4"
                    className="mb-field"
                    value={profile.gender}
                    onChange={(e) => {
                      setProfile({ ...profile, gender: e.target.value });
                      setPMsg(null);
                    }}
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </Select>
                </div>
                <div role="status" aria-live="polite">
                  {pMsg && (
                    <p
                      className={pMsg.ok ? "mb-ok" : "mb-msg"}
                      data-kind="hint"
                      style={{ margin: 0 }}
                    >
                      {pMsg.ok ? (
                        <Icons.CheckCircle
                          className="w-5 h-5"
                          aria-hidden="true"
                          style={{ flex: "0 0 auto" }}
                        />
                      ) : (
                        <Icons.AlertCircle
                          className="w-5 h-5"
                          aria-hidden="true"
                          style={{ flex: "0 0 auto" }}
                        />
                      )}
                      <span>{pMsg.text}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Button type="submit" data-wf="i-9-0-5" className="mb-btn mb-btn-primary">
                    Save changes
                  </Button>
                </div>
              </div>
            </form>

            <form
              data-wf="b-9-1"
              className="mb-panel-soft"
              onSubmit={updatePassword}
              noValidate
              aria-labelledby="pw-title"
            >
              <h2 id="pw-title" className="mb-h2" style={{ marginBottom: 8 }}>
                Change password
              </h2>
              <p className="mb-muted mb-small" style={{ margin: "0 0 24px" }}>
                in this prototype your current password is <strong>marigold42</strong>.
              </p>
              <div className="mb-stack" style={{ gap: 20 }}>
                <div>
                  <Label htmlFor="pw-cur" className="mb-label">
                    Current password
                  </Label>
                  <Input
                    id="pw-cur"
                    data-wf="i-9-1-0"
                    className="mb-field"
                    type="password"
                    autoComplete="current-password"
                    value={pw.cur}
                    aria-invalid={!!pwErr.cur}
                    aria-describedby={pwErr.cur ? "pw-cur-err" : undefined}
                    onChange={(e) => {
                      setPw({ ...pw, cur: e.target.value });
                      setPwMsg(null);
                    }}
                  />
                  {pwErr.cur && (
                    <p id="pw-cur-err" className="mb-err">
                      <Icons.AlertCircle
                        className="w-4 h-4"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto", marginTop: 3 }}
                      />
                      {pwErr.cur}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pw-new" className="mb-label">
                    New password
                  </Label>
                  <Input
                    id="pw-new"
                    data-wf="i-9-1-1"
                    className="mb-field"
                    type="password"
                    autoComplete="new-password"
                    value={pw.nw}
                    aria-invalid={!!pwErr.nw}
                    aria-describedby={"pw-new-help" + (pwErr.nw ? " pw-new-err" : "")}
                    onChange={(e) => {
                      setPw({ ...pw, nw: e.target.value });
                      setPwMsg(null);
                    }}
                  />
                  <p
                    id="pw-new-help"
                    className="mb-muted mb-small"
                    style={{ margin: "8px 0 0 16px" }}
                  >
                    at least 8 characters, with a letter and a number.
                  </p>
                  {pwErr.nw && (
                    <p id="pw-new-err" className="mb-err">
                      <Icons.AlertCircle
                        className="w-4 h-4"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto", marginTop: 3 }}
                      />
                      {pwErr.nw}
                    </p>
                  )}
                </div>
                <div role="status" aria-live="polite">
                  {pwMsg && (
                    <p className="mb-ok" style={{ margin: 0 }}>
                      <Icons.CheckCircle
                        className="w-5 h-5"
                        aria-hidden="true"
                        style={{ flex: "0 0 auto" }}
                      />
                      <span>{pwMsg}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Button type="submit" data-wf="i-9-1-2" className="mb-btn mb-btn-primary">
                    Update password
                  </Button>
                </div>
              </div>
            </form>
          </section>
        )}
      </div>

      {resched && (
        <RescheduleModal appt={resched} onClose={() => setResched(null)} onConfirm={doReschedule} />
      )}
    </div>
  );
}
