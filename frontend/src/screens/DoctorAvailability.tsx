// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Table, THead, TBody, TR, TH, TD, Empty } = UI;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TODAY = '2026-11-13';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CLINIC_TZ = 'Europe/London (GMT)';

const SEED_PATTERN = [
  { day: 'Monday', working: true, start: '09:00', end: '13:00', slot: '30', breaks: [{ id: 'b1', start: '10:30', end: '11:00' }] },
  { day: 'Tuesday', working: true, start: '14:00', end: '18:00', slot: '30', breaks: [] },
  { day: 'Wednesday', working: true, start: '09:00', end: '13:00', slot: '30', breaks: [{ id: 'b2', start: '10:30', end: '11:00' }] },
  { day: 'Thursday', working: true, start: '14:00', end: '18:00', slot: '30', breaks: [{ id: 'b3', start: '16:00', end: '16:15' }] },
  { day: 'Friday', working: true, start: '09:00', end: '12:00', slot: '30', breaks: [] },
  { day: 'Saturday', working: false, start: '09:00', end: '12:00', slot: '30', breaks: [] },
  { day: 'Sunday', working: false, start: '09:00', end: '12:00', slot: '30', breaks: [] },
];

const SEED_APPTS = [
  { id: 'a1', date: '2026-11-16', time: '09:30', patient: 'Meera Kulkarni', status: 'Booked' },
  { id: 'a2', date: '2026-11-17', time: '15:00', patient: 'Daniel Okafor', status: 'Confirmed' },
  { id: 'a3', date: '2026-11-18', time: '10:00', patient: 'Sofia Marini', status: 'Booked' },
  { id: 'a4', date: '2026-11-18', time: '11:30', patient: 'Arjun Patel', status: 'Booked' },
  { id: 'a5', date: '2026-11-19', time: '15:30', patient: 'Priya Raman', status: 'Booked' },
  { id: 'a6', date: '2026-11-23', time: '11:30', patient: 'Ibrahim Yusuf', status: 'Booked' },
  { id: 'a7', date: '2026-11-24', time: '14:30', patient: 'Lena Fischer', status: 'Confirmed' },
  { id: 'a8', date: '2026-11-27', time: '09:30', patient: 'Tomás Ruiz', status: 'Booked' },
  { id: 'a9', date: '2026-11-28', time: '14:30', patient: 'Chloe Bennett', status: 'Booked' },
];

const SEED_EXCEPTIONS = [
  { id: 'e1', date: '2026-11-20', type: 'Unavailable', start: '', end: '', reason: 'Conference' },
  { id: 'e2', date: '2026-11-28', type: 'Extra hours', start: '14:00', end: '17:00', reason: '' },
];

const toMin = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return d + ' ' + MONTHS[m - 1] + ' ' + y;
};
const dayIdx = (iso) => (parseISO(iso).getUTCDay() + 6) % 7;
const fmtAppt = (a) => DAYS[dayIdx(a.date)].slice(0, 3) + ' ' + fmtDate(a.date) + ' · ' + a.time;
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

function validateDay(p) {
  const errs = [];
  if (!p.working) return errs;
  const s = toMin(p.start);
  const e = toMin(p.end);
  if (isNaN(s) || isNaN(e)) {
    errs.push(p.day + ': set both a start time and an end time.');
  } else if (e <= s) {
    errs.push(p.day + ': end time must be later than start time.');
  }
  const sl = Number(p.slot);
  if (!p.slot || isNaN(sl) || sl <= 0) errs.push(p.day + ': slot length must be more than 0 minutes.');
  const valid = [];
  p.breaks.forEach((b) => {
    const bs = toMin(b.start);
    const be = toMin(b.end);
    const label = b.start + '–' + b.end;
    if (isNaN(bs) || isNaN(be) || be <= bs) {
      errs.push(p.day + ': break ' + label + ' must end after it starts.');
    } else if (!isNaN(s) && !isNaN(e) && (bs < s || be > e)) {
      errs.push(p.day + ': break ' + label + ' falls outside working hours.');
    } else {
      valid.push([bs, be]);
    }
  });
  valid.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < valid.length; i++) {
    if (valid[i][0] < valid[i - 1][1]) {
      errs.push(p.day + ': break periods may not overlap.');
      break;
    }
  }
  return errs;
}

function slotsFor(p) {
  if (!p.working || validateDay(p).length) return null;
  const s = toMin(p.start), e = toMin(p.end), sl = Number(p.slot);
  const br = p.breaks.map((b) => [toMin(b.start), toMin(b.end)]);
  let n = 0;
  for (let t = s; t + sl <= e; t += sl) {
    if (!br.some(([bs, be]) => t < be && t + sl > bs)) n++;
  }
  return n;
}

function fits(a, pattern, extras) {
  const s = toMin(a.time);
  const p = pattern[dayIdx(a.date)];
  if (extras.some((x) => x.type === 'Extra hours' && x.date === a.date && s >= toMin(x.start) && s < toMin(x.end))) return true;
  if (!p.working) return false;
  if (validateDay(p).length) return true; // unknown while the day is mid-edit
  if (s < toMin(p.start) || s >= toMin(p.end)) return false;
  return !p.breaks.some((b) => s >= toMin(b.start) && s < toMin(b.end));
}

function exceptionHits(a, ex) {
  if (ex.type !== 'Unavailable' || a.date !== ex.date) return false;
  if (!ex.start && !ex.end) return true;
  const s = toMin(a.time);
  return s >= toMin(ex.start) && s < toMin(ex.end);
}

export default function Screen() {
  const navigate = useNavigate();
  const [pattern, setPattern] = React.useState(SEED_PATTERN);
  const [saved, setSaved] = React.useState(SEED_PATTERN);
  const [activeDay, setActiveDay] = React.useState(0);
  const [weeklyNotice, setWeeklyNotice] = React.useState(null);
  const [exceptions, setExceptions] = React.useState(SEED_EXCEPTIONS);
  const [appts, setAppts] = React.useState(SEED_APPTS);
  const [form, setForm] = React.useState({ date: '', type: 'Unavailable', start: '', end: '', reason: '' });
  const [formErrors, setFormErrors] = React.useState({});
  const [pending, setPending] = React.useState(null);
  const [excNotice, setExcNotice] = React.useState(null);
  const [confirmNotice, setConfirmNotice] = React.useState(null);
  const idRef = React.useRef(10);

  const P = brand.primaryColor;
  const A = brand.accentColor;
  const BG = brand.backgroundColor;
  const tint = (n) => 'color-mix(in srgb, ' + P + ' ' + n + '%, ' + BG + ')';
  const soft = (n) => 'color-mix(in srgb, ' + P + ' ' + n + '%, transparent)';
  const quiet = 'color-mix(in srgb, ' + P + ' 78%, ' + BG + ')';

  const errors = pattern.flatMap(validateDay);
  const dirty = JSON.stringify(pattern) !== JSON.stringify(saved);
  const active = (a) => a.status === 'Booked' || a.status === 'Confirmed';

  const weeklyRows = appts
    .filter(active)
    .filter((a) => fits(a, saved, exceptions) && !fits(a, pattern, exceptions))
    .map((a) => ({ ...a, effect: 'keep' }));
  const exRows = pending ? appts.filter((a) => pending.ids.includes(a.id) && active(a)).map((a) => ({ ...a, effect: 'cancel' })) : [];
  const affected = [...exRows, ...weeklyRows.filter((w) => !pending || !pending.ids.includes(w.id))].sort((x, y) =>
    (x.date + x.time).localeCompare(y.date + y.time)
  );

  const setDay = (i, patch) => {
    setPattern((prev) => prev.map((d, k) => (k === i ? { ...d, ...patch } : d)));
    setWeeklyNotice(null);
  };
  const setBreak = (i, bid, patch) => {
    setPattern((prev) => prev.map((d, k) => (k === i ? { ...d, breaks: d.breaks.map((b) => (b.id === bid ? { ...b, ...patch } : b)) } : d)));
    setWeeklyNotice(null);
  };
  const removeBreak = (i, bid) => {
    setPattern((prev) => prev.map((d, k) => (k === i ? { ...d, breaks: d.breaks.filter((b) => b.id !== bid) } : d)));
    setWeeklyNotice(null);
  };

  const addBreak = () => {
    const d = pattern[activeDay];
    if (!d.working) {
      setWeeklyNotice({ tone: 'warn', text: d.day + ' is a day off. Mark it as working first, then add a break.' });
      return;
    }
    const s = toMin(d.start), e = toMin(d.end);
    let bs = isNaN(s) || isNaN(e) ? 720 : Math.round((s + e) / 2 / 15) * 15;
    let be = bs + 30;
    if (!isNaN(e) && be > e) be = e;
    if (be <= bs) { bs = isNaN(s) ? 720 : s; be = bs + 15; }
    idRef.current += 1;
    setDay(activeDay, { breaks: [...d.breaks, { id: 'nb' + idRef.current, start: fromMin(bs), end: fromMin(be) }] });
    setWeeklyNotice({ tone: 'ok', text: 'Added a break on ' + d.day + '. Adjust the times, then save.' });
  };

  const saveWeekly = () => {
    if (errors.length) {
      setWeeklyNotice({ tone: 'warn', text: plural(errors.length, 'thing') + ' to fix before this pattern can be saved. Nothing was changed.' });
      return;
    }
    const n = weeklyRows.length;
    setSaved(pattern);
    setWeeklyNotice({
      tone: 'ok',
      text: n
        ? 'Weekly pattern saved. ' + plural(n, 'booked appointment') + ' no longer fit your working hours. They stay booked, and nothing was cancelled.'
        : 'Weekly pattern saved. Patients now see slots generated from it.',
    });
  };

  const upd = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setPending(null);
    setExcNotice(null);
    setConfirmNotice(null);
  };

  const saveException = () => {
    const er = {};
    if (!form.date) er.date = 'Choose the date this applies to.';
    else if (form.date < TODAY) er.date = 'Exceptions can only be set for today or future dates.';
    const hasS = !!form.start, hasE = !!form.end;
    if (form.type === 'Extra hours') {
      if (!hasS || !hasE) er.time = 'Extra hours need both a start and an end time.';
      else if (toMin(form.end) <= toMin(form.start)) er.time = 'End time must be later than start time.';
    } else if (hasS !== hasE) {
      er.time = 'Give both times for part of a day, or leave both empty for the whole day.';
    } else if (hasS && toMin(form.end) <= toMin(form.start)) {
      er.time = 'End time must be later than start time.';
    }
    setFormErrors(er);
    setConfirmNotice(null);
    if (Object.keys(er).length) {
      setExcNotice({ tone: 'warn', text: 'This exception was not saved. Your entries are still here — fix the marked fields.' });
      return;
    }
    const ids = appts.filter((a) => active(a) && exceptionHits(a, form)).map((a) => a.id);
    if (ids.length) {
      setPending({ ids, draft: { ...form } });
      setExcNotice({ tone: 'warn', text: plural(ids.length, 'booked appointment') + ' fall inside this leave. Review them below, then confirm to cancel them and save the exception.' });
      return;
    }
    commitException(form);
    setExcNotice({ tone: 'ok', text: 'Exception saved. No booked appointments were affected.' });
  };

  const commitException = (ex) => {
    idRef.current += 1;
    setExceptions((prev) => [...prev, { ...ex, id: 'ne' + idRef.current }].sort((x, y) => x.date.localeCompare(y.date)));
    setForm({ date: '', type: 'Unavailable', start: '', end: '', reason: '' });
    setFormErrors({});
  };

  const confirmCancel = () => {
    if (!pending) return;
    const reason = pending.draft.reason.trim() || 'Doctor unavailable';
    const ids = pending.ids;
    setAppts((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status: 'Cancelled', cancelReason: reason, cancelledBy: 'Doctor' } : a)));
    commitException(pending.draft);
    setPending(null);
    setExcNotice(null);
    setConfirmNotice({ text: plural(ids.length, 'appointment') + ' cancelled with the reason "' + reason + '". Those patients will see it in their appointment list, and the exception is saved.' });
  };

  const excLabel = (x) => {
    let s = fmtDate(x.date) + ' · ' + x.type;
    if (x.start && x.end) s += (x.type === 'Extra hours' ? ' ' : ' ') + x.start + '–' + x.end;
    if (x.reason) s += ' · ' + x.reason;
    return s;
  };

  const btn = {
    borderRadius: 999, minHeight: 48, padding: '12px 28px', fontWeight: 600, fontSize: 15,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: 'none',
  };
  const primaryBtn = { ...btn, backgroundColor: P, color: BG };
  const softBtn = { ...btn, backgroundColor: tint(10), color: P };
  const lbl = { fontSize: 13, fontWeight: 600, color: P, display: 'block', marginBottom: 8 };
  const hint = { fontSize: 13, lineHeight: 1.5, color: quiet };
  const noticeStyle = (tone) => ({
    fontSize: 14, lineHeight: 1.5, borderRadius: 24, padding: '12px 20px', color: P,
    backgroundColor: tone === 'warn' ? 'color-mix(in srgb, ' + A + ' 22%, ' + BG + ')' : tint(8),
    display: 'flex', gap: 12, alignItems: 'flex-start',
  });

  const Pill = ({ status }) => {
    const I = status === 'Confirmed' ? Icons.CheckCircle : status === 'Cancelled' ? Icons.X : Icons.Calendar;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: P, backgroundColor: status === 'Confirmed' ? 'color-mix(in srgb, ' + A + ' 28%, ' + BG + ')' : tint(10) }}>
        <I className="h-4 w-4" aria-hidden="true" />
        {status}
      </span>
    );
  };

  const Notice = ({ n, id }) =>
    n ? (
      <div id={id} className="at-enter" style={noticeStyle(n.tone)}>
        {n.tone === 'warn' ? <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Icons.CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />}
        <span>{n.text}</span>
      </div>
    ) : null;

  return (
    <div style={{ '--p': P, '--a': A, backgroundColor: BG, color: P, fontFamily: brand.fontBody, minHeight: '100%' }}>
      <style>{`
        .at-field{width:100%;min-height:44px;border:none;border-radius:999px;padding:10px 18px;font:inherit;font-size:15px;color:var(--p);background:${BG};box-shadow:inset 0 0 0 1px ${soft(16)};font-variant-numeric:tabular-nums}
        .at-field:disabled{opacity:.45;cursor:not-allowed}
        .at-field[aria-invalid="true"]{box-shadow:inset 0 0 0 2px var(--a)}
        .at-root button:focus-visible,.at-root input:focus-visible,.at-root select:focus-visible{outline:3px solid var(--p);outline-offset:2px}
        .at-root button:not(:disabled):hover{filter:brightness(1.12)}
        .at-root button:disabled{opacity:.45;cursor:not-allowed}
        .at-root button{transition:filter .2s ease, transform .2s ease}
        .at-root button:not(:disabled):active{transform:translateY(1px)}
        .at-arch{border-radius:50% 50% 24px 24px / 72px 72px 24px 24px;padding:80px 32px 32px}
        .at-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
        .at-table th{text-align:left;font-size:13px;font-weight:600;padding:8px 12px 12px;color:${quiet}}
        .at-table td{padding:16px 12px;vertical-align:top;border-top:1px solid ${soft(10)};font-size:15px}
        .at-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
        @keyframes at-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:no-preference){.at-enter{animation:at-in .35s ease both}}
        @media (max-width:767px){
          .at-arch{border-radius:50% 50% 24px 24px / 48px 48px 24px 24px;padding:56px 16px 24px}
          .at-table,.at-table tbody,.at-table tr,.at-table td{display:block;width:100%}
          .at-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
          .at-table tr{padding:16px 0;border-top:1px solid ${soft(14)}}
          .at-table td{border-top:none;padding:8px 4px;display:flex;justify-content:space-between;align-items:center;gap:16px}
          .at-table td::before{content:attr(data-label);font-size:13px;font-weight:600;color:${quiet};flex:0 0 96px}
          .at-table td > *{max-width:100%}
        }
      `}</style>
      <div className="at-root" style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 24px 96px', display: 'flex', flexDirection: 'column', gap: 48 }}>

        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div data-wf="b-0-0" className="md:col-span-9">
            <div aria-hidden="true" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {pattern.map((d, i) => (
                <div key={d.day} style={{ width: 32, height: 44, borderRadius: '999px 999px 8px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, fontSize: 12, fontWeight: 700, backgroundColor: d.working ? A : tint(8), color: P, opacity: d.working ? 1 : 0.7 }}>
                  {d.day[0]}
                </div>
              ))}
            </div>
            <h1 style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontWeight: 600, fontSize: 40, lineHeight: 1.15, margin: 0 }}>My availability</h1>
            <p style={{ ...hint, fontSize: 16, maxWidth: 560, marginTop: 12 }}>
              set the days, hours and breaks patients can book, and mark the days you are away. every change shows which booked visits it touches before anything is cancelled.
            </p>
          </div>
          <div className="md:col-span-3 md:text-right">
            <button type="button" data-wf="b-0-1" style={softBtn} onClick={() => navigate('doctor-schedule')}>
              View my schedule
              <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Row 2 */}
        <section data-wf="b-1-0" aria-labelledby="weekly-h" className="at-arch" style={{ backgroundColor: tint(7) }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 id="weekly-h" style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontWeight: 600, fontSize: 28, margin: 0 }}>Weekly pattern (clinic timezone)</h2>
            <p style={{ ...hint, marginTop: 8 }}>all times are shown in {CLINIC_TZ}, 24-hour clock. click into a day to choose where the next break goes.</p>
          </div>
          <Table className="at-table">
            <THead>
              <TR>
                <TH data-wf="i-1-0-0" scope="col">Day</TH>
                <TH data-wf="i-1-0-1" scope="col">Working</TH>
                <TH data-wf="i-1-0-2" scope="col">Start time</TH>
                <TH data-wf="i-1-0-3" scope="col">End time</TH>
                <TH data-wf="i-1-0-4" scope="col">Slot length (min)</TH>
                <TH data-wf="i-1-0-5" scope="col">Breaks</TH>
              </TR>
            </THead>
            <TBody>
              {pattern.map((d, i) => {
                const bad = validateDay(d).length > 0;
                const n = slotsFor(d);
                return (
                  <TR key={d.day} onFocusCapture={() => setActiveDay(i)} style={{ backgroundColor: activeDay === i ? tint(6) : 'transparent', transition: 'background-color .25s ease' }}>
                    <TD data-label="Day" style={{ minWidth: 110 }}>
                      <div>
                        <strong style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontSize: 18, fontWeight: 600 }}>{d.day}</strong>
                        <div style={hint}>{!d.working ? 'day off' : bad ? 'check the times' : plural(n, 'slot') + ' a day'}</div>
                      </div>
                    </TD>
                    <TD data-label="Working">
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                        <input type="checkbox" checked={d.working} onChange={(e) => setDay(i, { working: e.target.checked })} style={{ width: 20, height: 20, accentColor: P }} />
                        {d.working ? 'Working' : 'Day off'}
                      </label>
                    </TD>
                    <TD data-label="Start time">
                      <input type="time" className="at-field" style={{ minWidth: 120 }} aria-label={d.day + ' start time'} aria-invalid={d.working && bad} disabled={!d.working} value={d.start} onChange={(e) => setDay(i, { start: e.target.value })} />
                    </TD>
                    <TD data-label="End time">
                      <input type="time" className="at-field" style={{ minWidth: 120 }} aria-label={d.day + ' end time'} aria-invalid={d.working && bad} disabled={!d.working} value={d.end} onChange={(e) => setDay(i, { end: e.target.value })} />
                    </TD>
                    <TD data-label="Slot length (min)">
                      <input type="number" min="1" step="5" className="at-field" style={{ minWidth: 88, maxWidth: 120 }} aria-label={d.day + ' slot length in minutes'} aria-invalid={d.working && bad} disabled={!d.working} value={d.slot} onChange={(e) => setDay(i, { slot: e.target.value })} />
                    </TD>
                    <TD data-label="Breaks" style={{ minWidth: 260 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }} className="md:items-start">
                        {d.breaks.length === 0 && <span style={{ ...hint, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>no breaks</span>}
                        {d.breaks.map((b) => (
                          <div key={b.id} className="at-enter" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="time" className="at-field" style={{ width: 118 }} aria-label={d.day + ' break start'} aria-invalid={bad} value={b.start} disabled={!d.working} onChange={(e) => setBreak(i, b.id, { start: e.target.value })} />
                            <span aria-hidden="true">–</span>
                            <input type="time" className="at-field" style={{ width: 118 }} aria-label={d.day + ' break end'} aria-invalid={bad} value={b.end} disabled={!d.working} onChange={(e) => setBreak(i, b.id, { end: e.target.value })} />
                            <button type="button" aria-label={'Remove ' + d.day + ' break ' + b.start + ' to ' + b.end} title="Remove break" onClick={() => removeBreak(i, b.id)} style={{ ...softBtn, minHeight: 44, minWidth: 44, padding: 0 }}>
                              <Icons.X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </section>

        {/* Row 3 */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-3">
              <button type="button" data-wf="b-2-0" style={{ ...softBtn, width: '100%' }} onClick={addBreak}>
                <Icons.Plus className="h-4 w-4" aria-hidden="true" />
                Add break
              </button>
              <p style={{ ...hint, marginTop: 8 }}>goes on {pattern[activeDay].day}</p>
            </div>
            <div className="md:col-span-3">
              <button type="button" data-wf="b-2-1" style={{ ...primaryBtn, width: '100%' }} onClick={saveWeekly}>
                Save weekly pattern
              </button>
              <p style={{ ...hint, marginTop: 8 }}>{dirty ? 'unsaved changes' : 'everything saved'}</p>
            </div>
            <div data-wf="b-2-2" className="md:col-span-6" aria-live="polite" style={{ fontSize: 14, lineHeight: 1.6 }}>
              {errors.length ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {errors.map((m, k) => (
                    <li key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 600 }}>
                      <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ ...hint, fontSize: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icons.CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                  every working day checks out: end times follow start times, breaks sit inside working hours and none overlap.
                </span>
              )}
            </div>
          </div>
          {weeklyNotice && <div style={{ marginTop: 24 }} role="status"><Notice n={weeklyNotice} /></div>}
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <form data-wf="b-3-0" className="md:col-span-8 at-arch" aria-labelledby="exc-h" noValidate onSubmit={(e) => { e.preventDefault(); saveException(); }} style={{ backgroundColor: tint(7), padding: undefined }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 id="exc-h" style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontWeight: 600, fontSize: 28, margin: 0 }}>Add exception</h2>
              <p style={{ ...hint, marginTop: 8 }}>mark leave, or open an extra session. leave the times empty to block the whole day.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="exc-date" style={lbl}>Date (today or later)</label>
                <input id="exc-date" data-wf="i-3-0-0" type="date" min={TODAY} className="at-field" value={form.date} aria-invalid={!!formErrors.date} aria-describedby={formErrors.date ? 'exc-date-e' : undefined} onChange={(e) => upd({ date: e.target.value })} />
                {formErrors.date && <p id="exc-date-e" style={{ ...hint, color: P, fontWeight: 600, marginTop: 8 }}>{formErrors.date}</p>}
              </div>
              <div>
                <label htmlFor="exc-type" style={lbl}>Type</label>
                <select id="exc-type" data-wf="i-3-0-1" className="at-field" value={form.type} onChange={(e) => upd({ type: e.target.value })}>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Extra hours">Extra hours</option>
                </select>
              </div>
              <div>
                <label htmlFor="exc-start" style={lbl}>Start time</label>
                <input id="exc-start" data-wf="i-3-0-2" type="time" className="at-field" value={form.start} aria-invalid={!!formErrors.time} aria-describedby={formErrors.time ? 'exc-time-e' : undefined} onChange={(e) => upd({ start: e.target.value })} />
              </div>
              <div>
                <label htmlFor="exc-end" style={lbl}>End time</label>
                <input id="exc-end" data-wf="i-3-0-3" type="time" className="at-field" value={form.end} aria-invalid={!!formErrors.time} aria-describedby={formErrors.time ? 'exc-time-e' : undefined} onChange={(e) => upd({ end: e.target.value })} />
              </div>
              {formErrors.time && <p id="exc-time-e" className="sm:col-span-2" style={{ ...hint, color: P, fontWeight: 600, margin: 0 }}>{formErrors.time}</p>}
              <div className="sm:col-span-2">
                <label htmlFor="exc-reason" style={lbl}>Reason</label>
                <input id="exc-reason" data-wf="i-3-0-4" type="text" className="at-field" value={form.reason} placeholder="e.g. conference, training day" onChange={(e) => upd({ reason: e.target.value })} />
                <p style={{ ...hint, marginTop: 8 }}>if bookings are cancelled, patients see this reason.</p>
              </div>
            </div>
          </form>
          <div className="md:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button type="button" data-wf="b-3-1" style={{ ...primaryBtn, width: '100%' }} onClick={saveException}>
              Save exception
            </button>
            <div role="status"><Notice n={excNotice} /></div>
          </div>
        </div>

        {/* Row 5 */}
        <section data-wf="b-4-0" aria-labelledby="aff-h" style={{ backgroundColor: tint(6), borderRadius: 24, padding: '32px 24px', boxShadow: '0 12px 32px -20px ' + soft(40) }}>
          <h2 id="aff-h" style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontWeight: 600, fontSize: 28, margin: 0 }}>Booked appointments affected by this change</h2>
          <p style={{ ...hint, margin: '8px 0 24px' }}>
            pattern changes never cancel anything: those visits stay booked. leave days ask you to confirm before patients are told.
          </p>
          {affected.length === 0 ? (
            <div className="at-enter" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <Empty title="Nothing affected" description="Every booked appointment still fits your pattern and exceptions. Make a change above and any visit it touches will be listed here." />
            </div>
          ) : (
            <Table className="at-table">
              <THead>
                <TR>
                  <TH data-wf="i-4-0-0" scope="col">Date &amp; time</TH>
                  <TH data-wf="i-4-0-1" scope="col">Patient</TH>
                  <TH data-wf="i-4-0-2" scope="col">Status</TH>
                </TR>
              </THead>
              <TBody>
                {affected.map((a) => (
                  <TR key={a.id} className="at-enter">
                    <TD data-label="Date & time" style={{ fontWeight: 600 }}>{fmtAppt(a)}</TD>
                    <TD data-label="Patient">{a.patient}</TD>
                    <TD data-label="Status">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <Pill status={a.status} />
                        <span style={hint}>{a.effect === 'cancel' ? 'will be cancelled on confirm' : 'stays booked'}</span>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        {/* Row 6 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center" style={{ marginTop: -16 }}>
          <div className="md:col-span-4">
            <button type="button" data-wf="b-5-0" style={{ ...primaryBtn, width: '100%' }} disabled={!pending} onClick={confirmCancel}>
              Confirm and cancel affected appointments
            </button>
          </div>
          <div className="md:col-span-8" role="status" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {confirmNotice ? (
              <Notice n={{ tone: 'ok', text: confirmNotice.text }} />
            ) : pending ? (
              <span style={hint}>this cancels {plural(pending.ids.length, 'appointment')} on {fmtDate(pending.draft.date)} and records "{pending.draft.reason.trim() || 'Doctor unavailable'}" as the reason.</span>
            ) : (
              <span style={hint}>available once a leave day would cancel booked visits. you can still change your mind until you confirm.</span>
            )}
          </div>
        </div>

        {/* Row 7 */}
        <section data-wf="b-6-0" aria-labelledby="upc-h">
          <h2 id="upc-h" style={{ fontFamily: brand.fontHeading, fontStyle: 'italic', fontWeight: 600, fontSize: 28, margin: '0 0 16px' }}>Upcoming exceptions</h2>
          {exceptions.length === 0 ? (
            <Empty title="No exceptions yet" description="Leave days and extra sessions you add above will appear here, soonest first." />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exceptions.map((x, i) => (
                <li key={x.id} data-wf={'i-6-0-' + i} className="at-enter" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderRadius: 999, backgroundColor: tint(7), fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '999px 999px 2px 2px', backgroundColor: x.type === 'Extra hours' ? A : P, flexShrink: 0 }} />
                  <span>{excLabel(x)}</span>
                </li>
              ))}
            </ul>
          )}
          <p style={{ ...hint, marginTop: 16 }}>dates in {CLINIC_TZ}. exceptions apply from the moment they are saved.</p>
        </section>
      </div>
    </div>
  );
}
