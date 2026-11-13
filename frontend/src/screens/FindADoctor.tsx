// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Input, Textarea, Label, Select, Avatar } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Search } = Icons;

const CLINIC_TZ = "Asia/Kolkata (IST)";
const TODAY_ISO = "2026-11-13";
const NOW_MIN = 10 * 60 + 42; // clinic time "now" is 10:42 on 13 Nov

const SPECS = ["Neurology", "Cardiology", "Dermatology", "General Medicine", "Orthopaedics", "Pulmonology"];

const CATALOG = [
  { term: "Migraine", type: "disease", specs: ["Neurology"] },
  { term: "Migraine headache", type: "symptom", specs: ["Neurology"] },
  { term: "Headache", type: "symptom", specs: ["Neurology", "General Medicine"] },
  { term: "Dizziness", type: "symptom", specs: ["Neurology", "General Medicine"] },
  { term: "Chest pain", type: "symptom", specs: ["Cardiology", "General Medicine"] },
  { term: "Palpitations", type: "symptom", specs: ["Cardiology"] },
  { term: "Hypertension", type: "disease", specs: ["Cardiology", "General Medicine"] },
  { term: "Acne", type: "disease", specs: ["Dermatology"] },
  { term: "Skin rash", type: "symptom", specs: ["Dermatology", "General Medicine"] },
  { term: "Knee pain", type: "symptom", specs: ["Orthopaedics"] },
  { term: "Back pain", type: "symptom", specs: ["Orthopaedics", "General Medicine"] },
  { term: "Fever", type: "symptom", specs: ["General Medicine"] },
  { term: "Persistent cough", type: "symptom", specs: ["Pulmonology", "General Medicine"] },
  { term: "Asthma", type: "disease", specs: ["Pulmonology"] },
];

const sess = (days, start, end, len, breaks) =>
  Object.fromEntries(days.map((d) => [d, { start, end, len, breaks }]));

const DOCTORS = [
  {
    id: "rao", name: "Dr. Anita Rao", short: "Anita Rao", specs: ["Neurology"], qual: "MBBS, MD", fee: 800,
    room: "Room 204, Main Clinic",
    weekly: { ...sess([1, 3, 5], "09:00", "12:00", 30, [["10:30", "11:00"]]), ...sess([2, 4], "14:00", "17:00", 30, [["15:30", "16:00"]]) },
  },
  {
    id: "okoye", name: "Dr. Samuel Okoye", short: "Samuel Okoye", specs: ["Neurology", "General Medicine"], qual: "MBBS, DM", fee: 900,
    room: "Room 108, Main Clinic", flaky: true,
    weekly: { ...sess([1, 2, 3, 4, 5], "10:00", "13:00", 30, [["11:30", "12:00"]]), ...sess([6], "09:00", "11:00", 30, []) },
  },
  {
    id: "iyer", name: "Dr. Meera Iyer", short: "Meera Iyer", specs: ["Cardiology"], qual: "MBBS, DM Cardiology", fee: 1200,
    room: "Room 112, Heart Wing",
    weekly: sess([2, 4, 6], "09:00", "13:00", 30, [["11:00", "11:30"]]),
  },
  {
    id: "alvarez", name: "Dr. Tomás Alvarez", short: "Tomás Alvarez", specs: ["Cardiology", "General Medicine"], qual: "MBBS, MD", fee: 1000,
    room: "Room 115, Heart Wing", gone: true,
    weekly: sess([1, 3, 5], "15:00", "18:00", 30, []),
  },
  {
    id: "nambiar", name: "Dr. Priya Nambiar", short: "Priya Nambiar", specs: ["Dermatology"], qual: "MBBS, MD Dermatology", fee: 700,
    room: "Room 301, Garden Wing",
    weekly: sess([1, 2, 3, 4, 5, 6], "15:00", "18:00", 30, [["16:30", "17:00"]]),
  },
  {
    id: "whitfield", name: "Dr. Helen Whitfield", short: "Helen Whitfield", specs: ["General Medicine"], qual: "MBBS, MRCGP", fee: 500,
    room: "Room 101, Main Clinic",
    weekly: sess([1, 2, 3, 4, 5, 6], "08:30", "12:30", 20, [["10:20", "10:40"]]),
  },
  {
    id: "kulkarni", name: "Dr. Rohan Kulkarni", short: "Rohan Kulkarni", specs: ["Orthopaedics"], qual: "MBBS, MS Ortho", fee: 850,
    room: "Room 210, Main Clinic", leave: ["2026-11-18"],
    weekly: sess([1, 3, 5], "16:00", "19:00", 30, [["17:30", "18:00"]]),
  },
];

const DATES = [
  ["2026-11-13", "Fri 13 Nov 2026", 5], ["2026-11-14", "Sat 14 Nov 2026", 6], ["2026-11-15", "Sun 15 Nov 2026", 0],
  ["2026-11-16", "Mon 16 Nov 2026", 1], ["2026-11-17", "Tue 17 Nov 2026", 2], ["2026-11-18", "Wed 18 Nov 2026", 3],
  ["2026-11-19", "Thu 19 Nov 2026", 4], ["2026-11-20", "Fri 20 Nov 2026", 5],
].map(([iso, label, dow]) => ({ iso, label, dow }));

const FIXED_TAKEN = { "rao|2026-11-16": ["10:00"] };

const toMin = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);
const fmt = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

function isTaken(doc, iso, time) {
  const fixed = FIXED_TAKEN[doc.id + "|" + iso];
  if (fixed) return fixed.includes(time);
  let h = 0;
  const s = doc.id + iso + time;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97;
  return h % 4 === 0;
}

function genSlots(doc, iso, extra) {
  const d = DATES.find((x) => x.iso === iso);
  if (doc.leave && doc.leave.includes(iso)) return { kind: "away", slots: [] };
  const w = doc.weekly[d.dow];
  if (!w) return { kind: "off", slots: [] };
  const slots = [];
  const end = toMin(w.end);
  for (let t = toMin(w.start); t + w.len <= end; t += w.len) {
    const inBreak = w.breaks.some(([bs, be]) => t < toMin(be) && t + w.len > toMin(bs));
    if (inBreak) continue;
    if (iso === TODAY_ISO && t <= NOW_MIN) continue;
    const time = fmt(t);
    slots.push({ time, end: fmt(t + w.len), len: w.len, taken: isTaken(doc, iso, time) || !!extra[doc.id + "|" + iso + "|" + time] });
  }
  return { kind: "open", slots };
}

const CSS = `
.mb-root { color: var(--ink); font-variant-numeric: tabular-nums; }
.mb-root :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; box-shadow: 0 0 0 7px color-mix(in srgb, var(--gold) 55%, transparent); }
.mb-btn, .mb-slot, .mb-chip, .mb-opt { transition: transform .18s ease, filter .18s ease, background-color .18s ease; cursor: pointer; }
.mb-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.15); }
.mb-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(.95); }
.mb-btn:disabled { opacity: .5; cursor: not-allowed; }
.mb-slot:hover:not(:disabled) { background-color: color-mix(in srgb, var(--gold) 40%, var(--bg)) !important; }
.mb-slot:disabled { cursor: not-allowed; }
.mb-chip:hover { background-color: color-mix(in srgb, var(--ink) 18%, var(--bg)) !important; }
.mb-opt:hover, .mb-opt[aria-selected="true"] { background-color: color-mix(in srgb, var(--ink) 10%, var(--bg)); }
.mb-row { transition: background-color .2s ease; animation: mb-rise .35s ease both; }
.mb-row:hover { background-color: color-mix(in srgb, var(--ink) 10%, var(--bg)) !important; }
.mb-rise { animation: mb-rise .35s ease both; }
.mb-skel { animation: mb-pulse 1.4s ease-in-out infinite; }
@keyframes mb-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes mb-pulse { 0%,100% { opacity: .45; } 50% { opacity: .9; } }
@media (prefers-reduced-motion: reduce) { .mb-root *, .mb-root *::before { animation: none !important; transition: none !important; } }
`;

const fieldStyle = {
  height: 56, borderRadius: 999, backgroundColor: "var(--tint)", color: "var(--ink)", padding: "0 24px",
  border: "none", boxShadow: "inset 0 1px 3px color-mix(in srgb, var(--ink) 16%, transparent)", fontSize: 16, width: "100%",
};
const primaryBtn = {
  height: 56, borderRadius: 999, backgroundColor: "var(--ink)", color: "var(--bg)", border: "none",
  padding: "0 24px", fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
};
const softBtn = {
  minHeight: 44, borderRadius: 999, backgroundColor: "var(--tint2)", color: "var(--ink)", border: "none",
  padding: "0 20px", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
};

export default function Screen() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("Migraine");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [hint, setHint] = React.useState("");
  const [search, setSearch] = React.useState({ kind: "match", term: "Migraine", type: "disease", specs: ["Neurology"] });
  const [specFilter, setSpecFilter] = React.useState("Neurology");
  const [nameFilter, setNameFilter] = React.useState("");
  const [gone, setGone] = React.useState([]);
  const [notice, setNotice] = React.useState("");
  const [doctorId, setDoctorId] = React.useState(null);
  const [date, setDate] = React.useState("2026-11-16");
  const [loadState, setLoadState] = React.useState("ready");
  const [retryKey, setRetryKey] = React.useState(0);
  const [ago, setAgo] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [reason, setReason] = React.useState("");
  const [extraTaken, setExtraTaken] = React.useState({});
  const [takenMsg, setTakenMsg] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const retriedRef = React.useRef({});
  const lostRef = React.useRef({});
  const timerRef = React.useRef(null);
  const detailRef = React.useRef(null);

  const doctor = DOCTORS.find((d) => d.id === doctorId) || null;

  // ---- search ----
  const q = query.trim().toLowerCase();
  const suggestions = React.useMemo(() => {
    if (q.length < 2) return [];
    const textMatches = [
      ...CATALOG.filter((c) => c.term.toLowerCase().includes(q)).map((c) => ({ term: c.term, type: c.type, specs: c.specs })),
      ...SPECS.filter((s) => s.toLowerCase().includes(q)).map((s) => ({ term: s, type: "specialization", specs: [s] })),
    ].sort((a, b) => Number(b.term.toLowerCase().startsWith(q)) - Number(a.term.toLowerCase().startsWith(q)));
    const out = [...textMatches];
    textMatches.forEach((m) => {
      if (m.type === "specialization") return;
      m.specs.forEach((s) => {
        if (!out.some((o) => o.type === "specialization" && o.term === s)) out.push({ term: s, type: "specialization", specs: [s] });
      });
    });
    return out.slice(0, 6);
  }, [q]);

  function resetSelection() {
    setDoctorId(null); setSelected(null); setTakenMsg(false); setNotice("");
  }

  function runSearch(raw) {
    const text = raw.trim();
    if (text.length < 2) {
      setHint("type at least two letters of a disease, symptom or specialization.");
      return;
    }
    setHint("");
    const lq = text.toLowerCase();
    const t = CATALOG.find((c) => c.term.toLowerCase() === lq);
    const s = SPECS.find((x) => x.toLowerCase() === lq);
    let res;
    if (t) res = { kind: "match", term: t.term, type: t.type, specs: t.specs };
    else if (s) res = { kind: "match", term: s, type: "specialization", specs: [s] };
    else res = { kind: "nomatch", raw: text };
    setSearch(res);
    setQuery(res.kind === "match" ? res.term : text);
    setSpecFilter(""); setNameFilter(""); setOpen(false); setActive(-1);
    resetSelection();
  }

  function onSubmit(e) {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) runSearch(suggestions[active].term);
    else runSearch(query);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault(); setOpen(true); setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false); setActive(-1);
    }
  }

  // ---- results ----
  const matched = search.kind === "match"
    ? DOCTORS.filter((d) => !gone.includes(d.id) && d.specs.some((s) => search.specs.includes(s)))
    : [];
  const filterSpecs = Array.from(new Set(matched.flatMap((d) => d.specs)));
  const filtered = matched.filter(
    (d) => (!specFilter || d.specs.includes(specFilter)) && (!nameFilter.trim() || d.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
  );
  const anyFilter = !!specFilter || !!nameFilter.trim();
  const shownDoctor = doctor && filtered.some((d) => d.id === doctor.id) ? doctor : null;

  function clearFilters() { setSpecFilter(""); setNameFilter(""); }

  function chooseDoctor(d) {
    if (d.gone) {
      setGone((g) => [...g, d.id]);
      setNotice(d.name + " is no longer available for booking, so we have taken them off your list. here are the doctors who are.");
      setDoctorId(null);
      return;
    }
    setNotice("");
    setDoctorId(d.id);
  }

  // ---- availability fetch (simulated) ----
  React.useEffect(() => {
    if (!doctorId) return undefined;
    const d = DOCTORS.find((x) => x.id === doctorId);
    setLoadState("loading"); setSelected(null); setTakenMsg(false); setAgo(0);
    const t = setTimeout(() => {
      if (d.flaky && !retriedRef.current[d.id]) setLoadState("error");
      else setLoadState("ready");
    }, 450);
    return () => clearTimeout(t);
  }, [doctorId, date, retryKey]);

  React.useEffect(() => {
    if (!doctorId || loadState !== "ready") return undefined;
    const i = setInterval(() => setAgo((a) => (a >= 29 ? 0 : a + 1)), 1000);
    return () => clearInterval(i);
  }, [doctorId, loadState]);

  React.useEffect(() => {
    if (shownDoctor && detailRef.current && detailRef.current.scrollIntoView) {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      detailRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [doctorId]);

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  function retry() {
    if (doctor) retriedRef.current[doctor.id] = true;
    setRetryKey((k) => k + 1);
  }

  const info = shownDoctor ? genSlots(shownDoctor, date, extraTaken) : { kind: "open", slots: [] };
  const dateObj = DATES.find((x) => x.iso === date);
  const openSlots = info.slots.filter((s) => !s.taken);
  const selectedSlot = info.slots.find((s) => s.time === selected && !s.taken) || null;

  function confirmBooking() {
    if (!selectedSlot || !shownDoctor) return;
    setBooking(true);
    const lk = shownDoctor.id + "|" + date;
    const pickedTime = selectedSlot.time;
    const last = openSlots[openSlots.length - 1];
    timerRef.current = setTimeout(() => {
      if (last && last.time === pickedTime && !lostRef.current[lk]) {
        // another patient got there first
        lostRef.current[lk] = true;
        setExtraTaken((p) => ({ ...p, [lk + "|" + pickedTime]: true }));
        setSelected(null); setTakenMsg(true); setAgo(0); setBooking(false);
      } else {
        navigate("my-appointments");
      }
    }, 700);
  }

  const rootVars = {
    "--ink": brand.primaryColor, "--bg": brand.backgroundColor, "--gold": brand.accentColor, "--sand": brand.neutralColor,
    "--tint": "color-mix(in srgb, var(--ink) 7%, var(--bg))",
    "--tint2": "color-mix(in srgb, var(--ink) 12%, var(--bg))",
    "--muted": "color-mix(in srgb, var(--ink) 78%, var(--bg))",
    "--lift": "color-mix(in srgb, var(--bg) 55%, white)",
    "--shadow": "0 14px 32px -20px color-mix(in srgb, var(--ink) 60%, transparent)",
    fontFamily: brand.fontBody, backgroundColor: "var(--bg)", minHeight: "100%",
  };
  const serif = { fontFamily: brand.fontHeading, fontStyle: "italic" };
  const caption = { fontSize: 13, color: "var(--muted)", lineHeight: 1.5 };
  const panel = { backgroundColor: "var(--tint)", borderRadius: 24, padding: 24 };

  const showEmpty = search.kind === "nomatch" || (search.kind === "match" && matched.length === 0);

  return (
    <div className="mb-root" style={rootVars}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 16px 64px" }} className="sm:px-8">
        {/* Row 1 */}
        <div data-wf="b-0-0" style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", gap: 16 }}>
          <span aria-hidden="true" style={{ width: 40, height: 56, borderRadius: "999px 999px 8px 8px", backgroundColor: "var(--gold)", flexShrink: 0 }} />
          <div>
            <h1 style={{ ...serif, fontSize: 40, lineHeight: 1.15, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>Find a doctor</h1>
            <p style={{ ...caption, fontSize: 15, margin: "8px 0 0", maxWidth: 560 }}>
              tell us what is troubling you and we will show the doctors who treat it. every visit is in person at the clinic.
            </p>
          </div>
        </div>

        {/* Row 2 */}
        <form role="search" onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end" style={{ marginBottom: 32 }}>
          <div data-wf="b-1-0" className="md:col-span-9" style={{ position: "relative" }}>
            <Label htmlFor="mb-search" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
              Disease, symptom or specialization
            </Label>
            <div style={{ position: "relative" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: 20, top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--muted)", pointerEvents: "none" }}>
                <Icons.Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <Input
                id="mb-search"
                type="text"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls="mb-suggest"
                aria-autocomplete="list"
                aria-describedby="mb-search-help"
                aria-activedescendant={open && active >= 0 ? "mb-opt-" + active : undefined}
                autoComplete="off"
                value={query}
                placeholder="Search a disease, symptom or specialization (e.g. migraine, chest pain, Cardiology)"
                onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.trim().length >= 2); setActive(-1); setHint(""); }}
                onKeyDown={onKeyDown}
                onBlur={() => setOpen(false)}
                style={{ ...fieldStyle, paddingLeft: 52 }}
              />
              {open && suggestions.length > 0 && (
                <ul
                  id="mb-suggest"
                  role="listbox"
                  aria-label="Suggestions from the clinic catalogue"
                  className="mb-rise"
                  style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: 64, margin: 0, padding: 8, listStyle: "none", backgroundColor: "var(--lift)", borderRadius: 24, boxShadow: "0 18px 40px -16px color-mix(in srgb, var(--ink) 55%, transparent)" }}
                >
                  {suggestions.map((s, i) => (
                    <li key={s.type + s.term} role="presentation">
                      <button
                        type="button"
                        id={"mb-opt-" + i}
                        role="option"
                        tabIndex={-1}
                        aria-selected={active === i}
                        data-wf={i < 3 ? "i-1-0-" + i : undefined}
                        className="mb-opt"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runSearch(s.term)}
                        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, padding: "8px 16px", borderRadius: 999, background: "transparent", border: "none", color: "var(--ink)", fontSize: 16, textAlign: "left" }}
                      >
                        <span>{s.term}</span>
                        <span style={{ ...caption, fontStyle: "italic" }}>{s.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p id="mb-search-help" role={hint ? "alert" : undefined} style={{ ...caption, margin: "8px 0 0 8px" }}>
              {hint || "suggestions come from the clinic's own list of conditions and symptoms, matched on the words you type."}
            </p>
          </div>
          <div data-wf="b-1-1" className="md:col-span-3" style={{ paddingBottom: 32 }}>
            <Button type="submit" className="mb-btn" style={primaryBtn}>
              <Icons.Search className="h-5 w-5" aria-hidden="true" />
              Search
            </Button>
          </div>
        </form>

        {/* Row 3 */}
        <section data-wf="b-2-0" aria-labelledby="mb-filters-h" style={{ ...panel, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icons.Filter className="h-5 w-5" aria-hidden="true" />
            <h2 id="mb-filters-h" style={{ ...serif, fontSize: 20, fontWeight: 600, margin: 0 }}>Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <Label htmlFor="mb-spec" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Specialization</Label>
              <Select id="mb-spec" data-wf="i-2-0-0" value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} disabled={matched.length === 0} style={fieldStyle}>
                <option value="">All specializations</option>
                {filterSpecs.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="md:col-span-5">
              <Label htmlFor="mb-docname" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Doctor name</Label>
              <Input id="mb-docname" data-wf="i-2-0-1" type="text" value={nameFilter} placeholder="e.g. Rao" onChange={(e) => setNameFilter(e.target.value)} disabled={matched.length === 0} style={fieldStyle} />
            </div>
            <div className="md:col-span-3">
              <Button type="button" data-wf="i-2-0-2" className="mb-btn" onClick={clearFilters} disabled={!anyFilter} style={{ ...softBtn, width: "100%", height: 56 }}>
                <Icons.X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, minHeight: 44, alignItems: "center" }} aria-live="polite">
            {!anyFilter && <span style={caption}>no filters applied. showing every active doctor who treats {search.kind === "match" ? search.term.toLowerCase() : "your term"}.</span>}
            {specFilter && (
              <button type="button" className="mb-chip" onClick={() => setSpecFilter("")} aria-label={"Remove filter Specialization: " + specFilter}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none", backgroundColor: "var(--tint2)", color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>
                Specialization: {specFilter}
                <Icons.X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {nameFilter.trim() && (
              <button type="button" className="mb-chip" onClick={() => setNameFilter("")} aria-label={"Remove filter Doctor name: " + nameFilter.trim()}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none", backgroundColor: "var(--tint2)", color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>
                Doctor name: {nameFilter.trim()}
                <Icons.X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        {/* Row 4 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start" style={{ marginBottom: 32 }}>
          {showEmpty && (
            <div data-wf="b-3-0" role="status" className="md:col-span-6 mb-rise" style={{ ...panel, borderRadius: "50% 50% 24px 24px / 64px 64px 24px 24px", padding: "48px 24px 24px", textAlign: "center" }}>
              <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 8 }}><Icons.Search className="h-6 w-6" /></span>
              <p style={{ ...serif, fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
                {search.kind === "nomatch" ? "No match found." : "No specialist available right now."}
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.5 }}>
                {search.kind === "nomatch"
                  ? "No match found. Try a different term or browse all specializations."
                  : "The clinic has no available specialist for " + search.term.toLowerCase() + " at the moment. Try a different term or browse all specializations."}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {SPECS.map((s) => (
                  <button key={s} type="button" className="mb-chip" onClick={() => runSearch(s)}
                    style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none", backgroundColor: "var(--tint2)", color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p data-wf="b-3-1" className="md:col-span-6" style={{ margin: 0, padding: "8px 8px", fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}>
            Consultation fees are shown for information only and are payable at the clinic. No online payment is available.
          </p>
        </div>

        {/* Row 5 */}
        {search.kind === "match" && matched.length > 0 && (
          <section data-wf="b-4-0" aria-labelledby="mb-list-h" style={{ marginBottom: 48 }}>
            <h2 id="mb-list-h" style={{ ...serif, fontSize: 28, fontWeight: 600, margin: "0 0 8px" }}>Matching doctors</h2>
            <p style={{ ...caption, margin: "0 0 16px" }}>
              {filtered.length} active {filtered.length === 1 ? "doctor" : "doctors"} for {search.term.toLowerCase()} ({search.type}) · {search.specs.join(" and ").toLowerCase()}
            </p>
            {notice && (
              <p role="status" className="mb-rise" style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "0 0 16px", padding: "16px 24px", borderRadius: 24, backgroundColor: "var(--tint2)", fontSize: 15, lineHeight: 1.5 }}>
                <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{notice}</span>
              </p>
            )}
            {filtered.length === 0 ? (
              <p role="status" style={{ ...panel, margin: 0, fontSize: 15 }}>
                no active doctors match these filters. clear a filter to see everyone who treats {search.term.toLowerCase()}.
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
                {filtered.map((d, i) => {
                  const isSel = shownDoctor && shownDoctor.id === d.id;
                  return (
                    <li key={d.id} className="mb-row" style={{ backgroundColor: isSel ? "var(--tint2)" : "var(--tint)", borderRadius: 24, padding: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, animationDelay: i * 40 + "ms" }}>
                      <Avatar name={d.short} className="h-14 w-14 shrink-0" />
                      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                        <h3 style={{ ...serif, fontSize: 22, fontWeight: 600, margin: 0 }}>{d.name}</h3>
                        <p style={{ margin: "4px 0 0", fontSize: 15 }}>{d.specs.join(", ")} · {d.qual}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}>Fee: {d.fee} (pay at clinic) · {d.room}</p>
                      </div>
                      <Button type="button" data-wf={"i-4-0-" + i} className="mb-btn" aria-pressed={!!isSel}
                        aria-label={(isSel ? "Viewing slots for " : "View slots for ") + d.name}
                        onClick={() => chooseDoctor(d)}
                        style={isSel ? { ...softBtn, height: 48, padding: "0 24px" } : { ...primaryBtn, width: "auto", height: 48, padding: "0 24px" }}>
                        {isSel ? <Icons.Check className="h-4 w-4" aria-hidden="true" /> : null}
                        {isSel ? "Viewing slots" : "View slots"}
                        {isSel ? null : <Icons.ChevronRight className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Slot calendar */}
        <div ref={detailRef} style={{ scrollMarginTop: 24 }}>
          {!shownDoctor && search.kind === "match" && matched.length > 0 && (
            <p style={{ ...caption, textAlign: "center", fontSize: 15, padding: "16px 0" }}>
              choose a doctor above to see their open times.
            </p>
          )}
          {shownDoctor && (
            <div className="mb-rise">
              {/* Row 6 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start" style={{ marginBottom: 32 }}>
                <div data-wf="b-5-0" className="md:col-span-5" style={{ ...panel, backgroundColor: "var(--tint2)", borderRadius: "50% 50% 24px 24px / 96px 96px 24px 24px", padding: "48px 24px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Avatar name={shownDoctor.short} className="h-16 w-16" /></div>
                  <h2 style={{ ...serif, fontSize: 24, fontWeight: 600, margin: 0 }}>{shownDoctor.name}</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 15 }}>{shownDoctor.specs.join(", ")}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 15 }}>{shownDoctor.room}</p>
                  <p style={{ margin: "12px 0 0", display: "inline-block", padding: "4px 16px", borderRadius: 999, backgroundColor: "var(--bg)", fontSize: 13, fontWeight: 600 }}>In-person visit only</p>
                </div>
                <div className="md:col-span-4">
                  <Label htmlFor="mb-date" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Date</Label>
                  <div data-wf="b-5-1">
                    <Select id="mb-date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle}>
                      {DATES.map((d) => <option key={d.iso} value={d.iso}>{d.label}{d.iso === TODAY_ISO ? " · today" : ""}</option>)}
                    </Select>
                  </div>
                </div>
                <p data-wf="b-5-2" className="md:col-span-3" style={{ ...caption, margin: 0, paddingTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Icons.Clock className="h-4 w-4 shrink-0" aria-hidden="true" style={{ marginTop: 3 }} />
                  <span>
                    Times shown in clinic timezone ({CLINIC_TZ}).{" "}
                    {loadState === "loading" ? "Refreshing…" : loadState === "error" ? "Not refreshed." : <>Refreshed {ago === 0 ? "just now" : ago + "s ago"}.</>}
                  </span>
                </p>
              </div>

              {/* Row 7 */}
              <section data-wf="b-6-0" aria-labelledby="mb-slots-h" aria-busy={loadState === "loading"} style={{ ...panel, marginBottom: 32 }}>
                <h2 id="mb-slots-h" style={{ ...serif, fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Available slots</h2>
                <p style={{ ...caption, margin: "0 0 24px" }}>
                  {dateObj.label} · one patient per slot{info.slots[0] ? " · " + info.slots[0].len + " minutes each" : ""}
                </p>
                {loadState === "loading" && (
                  <div>
                    <p style={{ ...caption, margin: "0 0 16px" }}>checking who has booked since you last looked…</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" aria-hidden="true">
                      {[0, 1, 2, 3, 4, 5].map((n) => <div key={n} className="mb-skel" style={{ height: 56, borderRadius: 999, backgroundColor: "var(--tint2)" }} />)}
                    </div>
                  </div>
                )}
                {loadState === "error" && (
                  <p style={{ margin: 0, fontSize: 15 }}>no times are shown while availability can't be loaded, so nothing here can be booked by mistake.</p>
                )}
                {loadState === "ready" && info.kind === "away" && (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{shownDoctor.name} is away on {dateObj.label}. pick another date to see open times.</p>
                )}
                {loadState === "ready" && info.kind === "off" && (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{shownDoctor.name} does not consult on {dateObj.label.slice(0, 3)}days. pick another date to see open times.</p>
                )}
                {loadState === "ready" && info.kind === "open" && info.slots.length === 0 && (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>there are no times left today. pick another date to see open times.</p>
                )}
                {loadState === "ready" && info.slots.length > 0 && (
                  <>
                    <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {info.slots.map((s, i) => {
                        const isSel = selected === s.time && !s.taken;
                        return (
                          <li key={s.time}>
                            <button
                              type="button"
                              data-wf={"i-6-0-" + i}
                              className="mb-slot"
                              disabled={s.taken}
                              aria-pressed={isSel}
                              aria-label={s.taken ? s.time + ", taken" : s.time + " to " + s.end}
                              onClick={() => { setSelected(s.time); setTakenMsg(false); }}
                              style={{
                                width: "100%", minHeight: 56, borderRadius: 999, border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
                                backgroundColor: isSel ? "var(--ink)" : s.taken ? "transparent" : "var(--tint2)",
                                color: isSel ? "var(--bg)" : s.taken ? "var(--muted)" : "var(--ink)",
                                boxShadow: s.taken ? "inset 0 0 0 1px color-mix(in srgb, var(--ink) 18%, transparent)" : isSel ? "0 0 0 3px var(--gold)" : "none",
                                fontSize: 17, fontWeight: 600,
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: s.taken ? "line-through" : "none" }}>
                                {isSel && <Icons.Check className="h-4 w-4" aria-hidden="true" />}
                                {s.time}
                              </span>
                              {s.taken && <span style={{ fontSize: 12, fontWeight: 500, fontStyle: "italic" }}>(taken)</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {openSlots.length === 0 && (
                      <p style={{ margin: "16px 0 0", fontSize: 15 }}>every time on this date has been taken. pick another date to see open times.</p>
                    )}
                  </>
                )}
              </section>

              {/* Row 8 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start" style={{ marginBottom: 24 }}>
                <div className="md:col-span-6">
                  <Label htmlFor="mb-reason" style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>Reason for visit (optional)</Label>
                  <Textarea
                    id="mb-reason"
                    data-wf="b-7-0"
                    rows={3}
                    maxLength={240}
                    value={reason}
                    placeholder="e.g. throbbing headaches for the past two weeks"
                    onChange={(e) => setReason(e.target.value)}
                    style={{ ...fieldStyle, height: "auto", borderRadius: 24, padding: "16px 24px", lineHeight: 1.5, resize: "vertical" }}
                  />
                </div>
                <div data-wf="b-7-1" className="md:col-span-3" style={{ paddingTop: 30 }}>
                  <Button type="button" className="mb-btn" onClick={confirmBooking} disabled={!selectedSlot || booking || loadState !== "ready"} style={primaryBtn}>
                    <Icons.Check className="h-5 w-5" aria-hidden="true" />
                    {booking ? "Confirming…" : "Confirm booking"}
                  </Button>
                </div>
                <p className="md:col-span-3" aria-live="polite" style={{ ...caption, margin: 0, paddingTop: 30 }}>
                  {selectedSlot
                    ? dateObj.label + " · " + selectedSlot.time + "–" + selectedSlot.end + " · fee " + shownDoctor.fee + ", payable at the clinic"
                    : "choose a time above to confirm it."}
                </p>
              </div>

              {/* Row 9 */}
              {(takenMsg || loadState === "error") && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {takenMsg && (
                    <p data-wf="b-8-0" role="alert" className="md:col-span-6 mb-rise" style={{ ...panel, backgroundColor: "var(--tint2)", margin: 0, display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5 }}>
                      <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>Sorry, that slot was just taken by someone else. Your booking was not made. The slot list has been refreshed.</span>
                    </p>
                  )}
                  {loadState === "error" && (
                    <div data-wf="b-8-1" role="alert" className="md:col-span-6 mb-rise" style={{ ...panel, backgroundColor: "var(--tint2)", fontSize: 15, lineHeight: 1.5 }}>
                      <p style={{ margin: "0 0 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span>Availability could not be loaded. Please try again.</span>
                      </p>
                      <Button type="button" className="mb-btn" onClick={retry} style={{ ...softBtn, backgroundColor: "var(--ink)", color: "var(--bg)" }}>
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
