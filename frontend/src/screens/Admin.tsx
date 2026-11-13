// @ts-nocheck -- generated from the approved design under its JS runtime contract; not hand-written TypeScript.
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Button, Input, Textarea, Label, Table, THead, TBody, TR, TH, TD, Avatar } = UI;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Settings, Edit } = Icons;

const TZ = [
  { value: 'UTC', label: 'UTC, Coordinated Universal Time', abbr: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London', abbr: 'GMT' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin', abbr: 'CET' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai', abbr: 'GST' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata', abbr: 'IST' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore', abbr: 'SGT' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney', abbr: 'AEDT' },
  { value: 'America/New_York', label: 'America/New_York', abbr: 'EST' },
  { value: 'America/Chicago', label: 'America/Chicago', abbr: 'CST' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles', abbr: 'PST' },
];

const SPECS_SEED = [
  { id: 'gm', name: 'General Medicine', description: 'First-line care for everyday illness, check-ups and referrals.', active: true },
  { id: 'neuro', name: 'Neurology', description: 'Brain, nerves and spine, from migraine to epilepsy.', active: true },
  { id: 'cardio', name: 'Cardiology', description: 'Heart rhythm, blood pressure and chest symptoms.', active: true },
  { id: 'derm', name: 'Dermatology', description: 'Skin, hair and nail conditions.', active: true },
  { id: 'ortho', name: 'Orthopaedics', description: 'Bones, joints and sports injuries.', active: true },
  { id: 'paed', name: 'Paediatrics', description: 'Children from newborn to sixteen.', active: true },
  { id: 'gastro', name: 'Gastroenterology', description: 'Digestive tract and liver.', active: true },
  { id: 'ent', name: 'ENT', description: 'Ear, nose and throat.', active: true },
  { id: 'psych', name: 'Psychiatry', description: 'Mood, anxiety and sleep. Not yet staffed.', active: false },
];

const DOCTORS_SEED = [
  { id: 'd1', accountId: 'a1', displayName: 'Dr. Anika Rao', specs: ['neuro'], quals: 'MBBS, MD (Medicine), DM (Neurology)', bio: 'Twelve years in headache and epilepsy care. Sees patients Monday to Thursday.', room: 'Wing B, Room 204', fee: '$85 per consultation', active: true, future: 3 },
  { id: 'd2', accountId: 'a2', displayName: 'Dr. Marcus Feldman', specs: ['neuro', 'gm'], quals: 'MD, Board certified in Neurology', bio: 'Combines general medicine with a neurology practice for first-time referrals.', room: 'Wing B, Room 206', fee: '$90 per consultation', active: true, future: 5 },
  { id: 'd3', accountId: 'a3', displayName: 'Dr. Priya Nair', specs: ['cardio'], quals: 'MBBS, MD, DM (Cardiology)', bio: 'Focus on hypertension, palpitations and post-event recovery.', room: 'Wing A, Room 112', fee: '$95 per consultation', active: true, future: 7 },
  { id: 'd4', accountId: 'a4', displayName: 'Dr. Tomás Ibarra', specs: ['neuro'], quals: 'MD, Fellowship in Movement Disorders', bio: 'Tremor, Parkinson’s disease and balance problems.', room: 'Wing B, Room 208', fee: '$90 per consultation', active: true, future: 2 },
  { id: 'd5', accountId: 'a5', displayName: 'Dr. Helen Okafor', specs: ['derm'], quals: 'MBBS, MD (Dermatology)', bio: 'Eczema, acne and rashes in adults and teenagers.', room: 'Wing C, Room 301', fee: '$75 per consultation', active: true, future: 4 },
  { id: 'd6', accountId: 'a6', displayName: 'Dr. Samuel Whitfield', specs: ['ortho'], quals: 'MBBS, MS (Orthopaedics)', bio: 'Knee, shoulder and sports injuries.', room: 'Wing A, Room 118', fee: '$80 per consultation', active: true, future: 6 },
  { id: 'd7', accountId: 'a7', displayName: 'Dr. Mei-Ling Chen', specs: ['paed'], quals: 'MBBS, DCH, MRCPCH', bio: 'Newborn to teenage care, including asthma and childhood fevers.', room: 'Garden Wing, Room 1', fee: '$65 per consultation', active: true, future: 9 },
  { id: 'd8', accountId: 'a8', displayName: 'Dr. Rahul Deshmukh', specs: ['gastro'], quals: 'MBBS, MD, DM (Gastroenterology)', bio: 'Reflux, abdominal pain and liver health.', room: 'Wing C, Room 305', fee: '$85 per consultation', active: true, future: 1 },
  { id: 'd9', accountId: 'a9', displayName: 'Dr. Laila Haddad', specs: ['neuro'], quals: 'MBBS, MRCP (Neurology)', bio: 'Seizure care, memory concerns and neuropathy.', room: 'Wing B, Room 210', fee: '$85 per consultation', active: true, future: 4 },
  { id: 'd10', accountId: 'a10', displayName: 'Dr. Owen Brennan', specs: ['gm'], quals: 'MBBS, MRCGP', bio: 'Family doctor for check-ups, long-term conditions and referrals.', room: 'Garden Wing, Room 3', fee: '$55 per consultation', active: true, future: 11 },
  { id: 'd11', accountId: 'a11', displayName: 'Dr. Sofia Lindqvist', specs: ['ent'], quals: 'MD, Otorhinolaryngology', bio: 'On extended leave until spring.', room: 'Wing C, Room 310', fee: '$80 per consultation', active: false, future: 2 },
];

const ACCOUNTS_SEED = [
  { id: 'a1', name: 'Anika Rao', email: 'anika.rao@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a2', name: 'Marcus Feldman', email: 'marcus.feldman@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a3', name: 'Priya Nair', email: 'priya.nair@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a4', name: 'Tomás Ibarra', email: 'tomas.ibarra@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a5', name: 'Helen Okafor', email: 'helen.okafor@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a6', name: 'Samuel Whitfield', email: 'samuel.whitfield@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a7', name: 'Mei-Ling Chen', email: 'meiling.chen@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a8', name: 'Rahul Deshmukh', email: 'rahul.deshmukh@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a9', name: 'Laila Haddad', email: 'laila.haddad@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a10', name: 'Owen Brennan', email: 'owen.brennan@willowbrook.clinic', role: 'doctor', active: true },
  { id: 'a11', name: 'Sofia Lindqvist', email: 'sofia.lindqvist@willowbrook.clinic', role: 'doctor', active: false },
  { id: 'a12', name: 'Imani Brooks', email: 'imani.brooks@willowbrook.clinic', role: 'admin', active: true },
  { id: 'a13', name: 'Daniel Park', email: 'daniel.park@willowbrook.clinic', role: 'admin', active: true },
];

const TERMS_SEED = [
  { id: 't1', term: 'Headache', type: 'symptom', specs: ['neuro', 'gm'] },
  { id: 't2', term: 'Migraine', type: 'disease', specs: ['neuro'] },
  { id: 't3', term: 'Seizure', type: 'symptom', specs: ['neuro'] },
  { id: 't4', term: 'Epilepsy', type: 'disease', specs: ['neuro'] },
  { id: 't5', term: 'Dizziness', type: 'symptom', specs: ['neuro', 'ent'] },
  { id: 't6', term: 'Vertigo', type: 'symptom', specs: ['neuro', 'ent'] },
  { id: 't7', term: 'Numbness', type: 'symptom', specs: ['neuro'] },
  { id: 't8', term: 'Tremor', type: 'symptom', specs: ['neuro'] },
  { id: 't9', term: 'Stroke', type: 'disease', specs: ['neuro', 'cardio'] },
  { id: 't10', term: 'Memory loss', type: 'symptom', specs: ['neuro'] },
  { id: 't11', term: 'Parkinson’s disease', type: 'disease', specs: ['neuro'] },
  { id: 't12', term: 'Peripheral neuropathy', type: 'disease', specs: ['neuro'] },
  { id: 't13', term: 'Chest pain', type: 'symptom', specs: ['cardio', 'gm'] },
  { id: 't14', term: 'Hypertension', type: 'disease', specs: ['cardio', 'gm'] },
  { id: 't15', term: 'Palpitations', type: 'symptom', specs: ['cardio'] },
  { id: 't16', term: 'Eczema', type: 'disease', specs: ['derm'] },
  { id: 't17', term: 'Acne', type: 'disease', specs: ['derm'] },
  { id: 't18', term: 'Skin rash', type: 'symptom', specs: ['derm', 'gm'] },
  { id: 't19', term: 'Knee pain', type: 'symptom', specs: ['ortho'] },
  { id: 't20', term: 'Fracture', type: 'disease', specs: ['ortho'] },
  { id: 't21', term: 'Back pain', type: 'symptom', specs: ['ortho', 'gm'] },
  { id: 't22', term: 'Childhood fever', type: 'symptom', specs: ['paed'] },
  { id: 't23', term: 'Asthma', type: 'disease', specs: ['paed', 'gm'] },
  { id: 't24', term: 'Acid reflux', type: 'disease', specs: ['gastro'] },
  { id: 't25', term: 'Abdominal pain', type: 'symptom', specs: ['gastro', 'gm'] },
  { id: 't26', term: 'Sore throat', type: 'symptom', specs: ['ent', 'gm'] },
  { id: 't27', term: 'Anxiety', type: 'disease', specs: ['psych', 'gm'] },
];

const AUDIT_SEED = [
  { id: 'l1', at: '2026-11-13T09:42:00Z', actor: 'Dr. Anika Rao', role: 'doctor', action: 'update', record: 'CONS-2087', outcome: 'allowed' },
  { id: 'l2', at: '2026-11-13T09:31:00Z', actor: 'Dr. Anika Rao', role: 'doctor', action: 'create', record: 'CONS-2087', outcome: 'allowed' },
  { id: 'l3', at: '2026-11-13T09:12:00Z', actor: 'Maya Collins', role: 'patient', action: 'view', record: 'CONS-2071', outcome: 'allowed' },
  { id: 'l4', at: '2026-11-13T08:58:00Z', actor: 'Daniel Okoye', role: 'patient', action: 'view', record: 'CONS-2063', outcome: 'denied' },
  { id: 'l5', at: '2026-11-13T08:40:00Z', actor: 'Dr. Marcus Feldman', role: 'doctor', action: 'view', record: 'CONS-2059', outcome: 'allowed' },
  { id: 'l6', at: '2026-11-12T16:20:00Z', actor: 'Dr. Priya Nair', role: 'doctor', action: 'view', record: 'CONS-2044', outcome: 'denied' },
  { id: 'l7', at: '2026-11-12T15:47:00Z', actor: 'Ruth Adeyemi', role: 'patient', action: 'view', record: 'CONS-2052', outcome: 'allowed' },
  { id: 'l8', at: '2026-11-12T14:05:00Z', actor: 'Dr. Helen Okafor', role: 'doctor', action: 'create', record: 'CONS-2049', outcome: 'allowed' },
  { id: 'l9', at: '2026-11-12T11:33:00Z', actor: 'Dr. Tomás Ibarra', role: 'doctor', action: 'update', record: 'CONS-2031', outcome: 'allowed' },
  { id: 'l10', at: '2026-11-12T10:18:00Z', actor: 'Aisha Karim', role: 'patient', action: 'view', record: 'CONS-2028', outcome: 'allowed' },
  { id: 'l11', at: '2026-11-11T17:02:00Z', actor: 'Dr. Samuel Whitfield', role: 'doctor', action: 'create', record: 'CONS-2019', outcome: 'allowed' },
  { id: 'l12', at: '2026-11-11T13:55:00Z', actor: 'Dr. Mei-Ling Chen', role: 'doctor', action: 'update', record: 'CONS-2014', outcome: 'allowed' },
];

const DOCS = [
  {
    key: 'setup', wf: 'i-7-0-0', lead: 'Setup guide:', rest: ' deployment, database, first admin, timezone, catalogue',
    points: [
      'Deployment and hosting, over an encrypted connection only.',
      'Database provisioning, with encryption at rest switched on.',
      'Environment configuration.',
      'Creating the first administrator account.',
      'Setting the clinic timezone and the booking cutoff.',
      'The contents of the seeded disease and symptom catalogue, and how to edit it.',
    ],
  },
  {
    key: 'usage', wf: 'i-7-0-1', lead: 'Usage guide:', rest: ' patient, doctor and administrator walkthroughs',
    points: [
      'Patient journey: register, search, book, reschedule, cancel, view and print consultation history.',
      'Doctor journey: set weekly availability, record exceptions, manage schedule and statuses, record consultations and prescriptions.',
      'Administrator journey: manage specializations, doctor profiles and disease mappings, and configure settings.',
    ],
  },
  {
    key: 'not', wf: 'i-7-0-2', lead: 'What this version does not do', rest: '',
    points: [
      'No online payments.',
      'No video or online consultations.',
      'No lab report or file uploads.',
      'No vitals tracking.',
      'No external calendar or EMR integration.',
      'No email or SMS notifications.',
    ],
  },
];

const WORDS = ['fern', 'olive', 'cedar', 'moss', 'linen', 'clay', 'willow', 'sage', 'ember', 'birch'];
function makePassword() {
  const w = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  return w() + '-' + w() + '-' + Math.floor(1000 + Math.random() * 9000);
}

function fmtTime(iso, tz) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch (e) {
    return iso;
  }
}

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

const H2 = { fontFamily: 'var(--font-h)', fontStyle: 'italic', fontWeight: 600, fontSize: 26, lineHeight: 1.2, margin: 0, color: 'var(--ink)' };
const MUTED = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.55, margin: 0 };
const fieldBase = { width: '100%', minHeight: 44, padding: '10px 18px', borderRadius: 9999, backgroundColor: 'var(--field)', color: 'var(--ink)', border: '1px solid var(--line)', fontSize: 15, fontFamily: 'inherit' };
const errField = { borderColor: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--ink)' };
const thS = { position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel)', textAlign: 'left', padding: '12px', fontSize: 13, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' };
const tdS = { padding: '12px', fontSize: 14, verticalAlign: 'middle', borderTop: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' };

function Sprig() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)' }}>
      <path d="M16 29V10" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 18c-5 0-7-3-7-7 5 0 7 3 7 7Z" fill="var(--accent)" />
      <path d="M16 13c4 0 6-2.5 6-6-4 0-6 2.5-6 6Z" fill="var(--accent)" opacity="0.75" />
    </svg>
  );
}

function Panel({ wf, labelledby, className, arch, children }) {
  return (
    <section
      data-wf={wf}
      aria-labelledby={labelledby}
      className={'relative ' + (className || '')}
      style={{
        background: 'var(--panel)',
        borderRadius: arch ? '50% 50% 24px 24px / 140px 140px 24px 24px' : 24,
        padding: arch ? '80px 32px 40px' : '32px',
        boxShadow: '0 18px 40px -26px color-mix(in srgb, var(--ink) 45%, transparent)',
        minWidth: 0,
      }}
    >
      {arch ? <Sprig /> : null}
      {children}
    </section>
  );
}

function Btn({ kind = 'primary', icon, children, size, ...p }) {
  const primary = kind === 'primary';
  const style = {
    minHeight: size === 'sm' ? 40 : 44, borderRadius: 9999, padding: size === 'sm' ? '0 16px' : '0 24px', fontWeight: 600, fontSize: size === 'sm' ? 14 : 15,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap',
    background: primary ? 'var(--ink)' : 'transparent', color: primary ? 'var(--bg)' : 'var(--ink)',
    border: '1px solid ' + (primary ? 'var(--ink)' : 'var(--line)'),
    boxShadow: primary ? 'inset 0 -3px 0 var(--accent)' : 'none',
  };
  return (
    <Button type="button" className={'at-btn ' + (primary ? '' : 'at-quiet')} style={style} {...p}>
      {icon}{children}
    </Button>
  );
}

function Tag({ tone, icon, children }) {
  return (
    <span className="inline-flex items-center gap-1" style={{ padding: '2px 12px', minHeight: 24, borderRadius: 9999, fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', background: tone === 'warn' ? 'color-mix(in srgb, var(--accent) 38%, var(--bg))' : 'color-mix(in srgb, var(--ink) 11%, var(--bg))' }}>
      {icon}{children}
    </span>
  );
}

function Msg({ kind, id, children }) {
  const err = kind === 'error';
  return (
    <p id={id} role={err ? 'alert' : undefined} className="at-enter flex items-start gap-2" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 16, color: 'var(--ink)', background: err ? 'color-mix(in srgb, var(--accent) 30%, var(--bg))' : 'var(--panel2)' }}>
      {err ? <Icons.AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" style={{ marginTop: 2 }} /> : <Icons.CheckCircle aria-hidden="true" className="w-4 h-4 shrink-0" style={{ marginTop: 2 }} />}
      <span>{children}</span>
    </p>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</Label>
      {children}
      {error ? <Msg kind="error" id={id + '-msg'}>{error}</Msg> : hint ? <p id={id + '-msg'} style={{ ...MUTED, fontSize: 13 }}>{hint}</p> : null}
    </div>
  );
}

function SelectBox({ id, value, onChange, wf, children, invalid, describedBy }) {
  return (
    <div className="relative">
      <select id={id} data-wf={wf} value={value} onChange={onChange} aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy}
        style={{ ...fieldBase, appearance: 'none', WebkitAppearance: 'none', paddingRight: 44, cursor: 'pointer' }}>
        {children}
      </select>
      <Icons.ChevronDown aria-hidden="true" className="w-4 h-4" style={{ position: 'absolute', right: 18, top: 15, pointerEvents: 'none', color: 'var(--ink)' }} />
    </div>
  );
}

function SpecPicker({ idp, legend, specs, value, onToggle, error, wf }) {
  return (
    <fieldset data-wf={wf} aria-describedby={error ? idp + '-msg' : undefined} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, padding: 0 }}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {specs.map((s) => {
          const on = value.includes(s.id);
          return (
            <label key={s.id} className="at-chip inline-flex items-center gap-1" style={{ minHeight: 40, padding: '0 16px', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: on ? 'var(--ink)' : 'var(--field)', color: on ? 'var(--bg)' : 'var(--ink)', border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line)'), transition: 'background-color .15s' }}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(s.id)} />
              {on ? <Icons.Check aria-hidden="true" className="w-4 h-4" /> : null}
              {s.name}{s.active ? '' : ' (inactive)'}
            </label>
          );
        })}
      </div>
      <div style={{ marginTop: 8 }}>{error ? <Msg kind="error" id={idp + '-msg'}>{error}</Msg> : null}</div>
    </fieldset>
  );
}

export default function Screen() {
  const [accounts, setAccounts] = React.useState(ACCOUNTS_SEED.map((a, i) => (a.role === 'doctor' ? { ...a, id: 'a' + (i + 1) } : a)));
  const [doctors, setDoctors] = React.useState(DOCTORS_SEED);
  const [specs, setSpecs] = React.useState(SPECS_SEED);
  const [terms, setTerms] = React.useState(TERMS_SEED);
  const [tab, setTab] = React.useState('accounts');
  const counter = React.useRef(100);

  /* accounts */
  const [ca, setCa] = React.useState({ name: '', email: '', role: 'doctor', password: '' });
  const [caErr, setCaErr] = React.useState({});
  const [caStatus, setCaStatus] = React.useState(null);
  const [acctStatus, setAcctStatus] = React.useState(null);
  const [secret, setSecret] = React.useState(null);

  /* doctor profile */
  const toDraft = (d) => ({ displayName: d.displayName, specs: d.specs, quals: d.quals, bio: d.bio, room: d.room, fee: d.fee, active: d.active });
  const [selId, setSelId] = React.useState('d1');
  const [pd, setPd] = React.useState(() => toDraft(DOCTORS_SEED[0]));
  const [pErr, setPErr] = React.useState({});
  const [pStatus, setPStatus] = React.useState(null);

  /* specializations */
  const [specStatus, setSpecStatus] = React.useState(null);

  /* catalogue */
  const emptyTerm = { id: null, term: '', type: 'disease', specs: [] };
  const [td, setTd] = React.useState(emptyTerm);
  const [tErr, setTErr] = React.useState({});
  const [tStatus, setTStatus] = React.useState(null);
  const [delId, setDelId] = React.useState(null);

  /* settings */
  const [saved, setSaved] = React.useState({ tz: 'UTC', cutoff: 24, confirmed: false });
  const [sd, setSd] = React.useState({ tz: 'UTC', cutoff: '24' });
  const [sErr, setSErr] = React.useState({});
  const [sStatus, setSStatus] = React.useState(null);

  /* docs */
  const [docOpen, setDocOpen] = React.useState(null);

  const doc = doctors.find((d) => d.id === selId) || doctors[0];
  const specName = (id) => (specs.find((s) => s.id === id) || {}).name || id;
  const abbr = (TZ.find((z) => z.value === saved.tz) || {}).abbr || saved.tz;
  const neuro = specs.find((s) => s.id === 'neuro');
  const neuroDocs = doctors.filter((d) => d.specs.includes('neuro')).length;
  const neuroMaps = terms.filter((t) => t.specs.includes('neuro')).length;

  const TABS = [
    { key: 'accounts', label: 'Accounts', wf: 'i-1-0-0', target: 'h-accounts' },
    { key: 'profiles', label: 'Doctor profiles', wf: 'i-1-0-1', target: 'h-profile' },
    { key: 'specs', label: 'Specializations', wf: 'i-1-0-2', target: 'h-specs' },
    { key: 'catalogue', label: 'Disease & symptom catalogue', wf: 'i-1-0-3', target: 'h-catalogue' },
    { key: 'settings', label: 'Settings', wf: 'i-1-0-4', target: 'h-settings' },
    { key: 'audit', label: 'Audit log', wf: 'i-1-0-5', target: 'h-audit' },
    { key: 'docs', label: 'Documentation', wf: 'i-1-0-6', target: 'h-docs' },
  ];

  const jump = (key, target) => {
    setTab(key);
    const el = document.getElementById(target);
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  /* ---- accounts ---- */
  const createAccount = (e) => {
    e.preventDefault();
    const errs = {};
    const name = ca.name.trim();
    const email = ca.email.trim();
    if (!name) errs.name = 'Enter their full name.';
    if (!email) errs.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.email = 'That email doesn’t look right. Try name@clinic.org.';
    else if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) errs.email = 'This email already has an account. Each address can belong to one account only.';
    if (ca.password.length < 10 || !/[A-Za-z]/.test(ca.password) || !/\d/.test(ca.password)) errs.password = 'Use at least 10 characters with a letter and a number.';
    setCaErr(errs);
    setCaStatus(null);
    if (Object.keys(errs).length) return;
    const n = ++counter.current;
    const accId = 'a' + n;
    setAccounts((list) => [...list, { id: accId, name, email, role: ca.role, active: true }]);
    if (ca.role === 'doctor') {
      const nd = { id: 'd' + n, accountId: accId, displayName: /^dr\.?\s/i.test(name) ? name : 'Dr. ' + name, specs: [], quals: '', bio: '', room: '', fee: '', active: false, future: 0 };
      setDoctors((l) => [...l, nd]);
      setSelId(nd.id);
      setPd(toDraft(nd));
      setPErr({});
      setPStatus('Complete this profile and tick Active to put them in patient search.');
    }
    setSecret({ kind: 'created', name, password: ca.password });
    setCaStatus(ca.role === 'doctor' ? 'Account created. Their blank profile is waiting in Doctor profile below.' : 'Administrator account created and active.');
    setCa({ name: '', email: '', role: 'doctor', password: '' });
  };

  const resetPassword = (a) => {
    setSecret({ kind: 'reset', name: a.name, password: makePassword() });
    setAcctStatus(null);
  };

  /* ---- doctor profile ---- */
  const toggleSpec = (id) => setPd((p) => ({ ...p, specs: p.specs.includes(id) ? p.specs.filter((x) => x !== id) : [...p.specs, id] }));

  const saveProfile = (e) => {
    e.preventDefault();
    const errs = {};
    if (!pd.displayName.trim()) errs.displayName = 'Patients need a name to see. Enter a display name.';
    if (pd.specs.length === 0) errs.specs = 'A specialization is required, because patient search relies on it.';
    setPErr(errs);
    if (Object.keys(errs).length) { setPStatus(null); return; }
    const deactivating = doc.active && !pd.active;
    setDoctors((l) => l.map((d) => (d.id === doc.id ? { ...d, ...pd, displayName: pd.displayName.trim() } : d)));
    setPStatus(
      deactivating
        ? 'Saved. ' + pd.displayName.trim() + ' is inactive: ' + plural(doc.future, 'future appointment', 'future appointments') + ' stay visible to patient and doctor, and no new slots can be booked.'
        : 'Saved. ' + pd.displayName.trim() + '’s profile is up to date, and the fee is shown to patients as text only.'
    );
  };

  /* the profile form has no save button in the wireframe, so Enter in a single-line field saves it */
  const profileKey = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') saveProfile(e);
  };

  const profileSpecs = specs.filter((s) => s.active || pd.specs.includes(s.id));

  /* ---- catalogue ---- */
  const toggleTermSpec = (id) => setTd((p) => ({ ...p, specs: p.specs.includes(id) ? p.specs.filter((x) => x !== id) : [...p.specs, id] }));
  const editTerm = (t) => {
    setTd({ id: t.id, term: t.term, type: t.type, specs: t.specs });
    setTErr({});
    setTStatus(null);
    setDelId(null);
    const el = document.getElementById('te-term');
    if (el) el.focus();
  };
  const saveTerm = (e) => {
    e.preventDefault();
    const errs = {};
    const name = td.term.trim();
    if (!name) errs.term = 'Enter the disease or symptom as a patient would type it.';
    else if (terms.some((t) => t.id !== td.id && t.term.toLowerCase() === name.toLowerCase())) errs.term = '“' + name + '” is already in the catalogue. Edit that entry instead.';
    if (td.specs.length === 0) errs.specs = 'Pick at least one specialization. An unmapped term would return no doctors.';
    setTErr(errs);
    setTStatus(null);
    if (Object.keys(errs).length) return;
    if (td.id) {
      setTerms((l) => l.map((t) => (t.id === td.id ? { ...t, term: name, type: td.type, specs: td.specs } : t)));
      setTStatus('Saved “' + name + '”. Patient search uses the new mapping straight away.');
    } else {
      setTerms((l) => [{ id: 't' + ++counter.current, term: name, type: td.type, specs: td.specs }, ...l]);
      setTStatus('Added “' + name + '” at the top of the list. Patients searching it now reach ' + td.specs.map(specName).join(' and ') + '.');
    }
    setTd(emptyTerm);
  };
  const deleteTerm = (t) => {
    setTerms((l) => l.filter((x) => x.id !== t.id));
    setDelId(null);
    if (td.id === t.id) setTd(emptyTerm);
    setTStatus('“' + t.term + '” deleted. It no longer resolves in patient search; appointments already booked through it are unaffected.');
  };

  /* ---- settings ---- */
  const saveSettings = (e) => {
    e.preventDefault();
    const errs = {};
    const raw = String(sd.cutoff).trim();
    if (raw === '' || !/^-?\d+(\.\d+)?$/.test(raw)) errs.cutoff = 'Enter the cutoff as a whole number of hours, like 24. ' + saved.cutoff + ' hours stays in force.';
    else if (Number(raw) < 0) errs.cutoff = 'A cutoff can’t be negative. Use 0 or more. ' + saved.cutoff + ' hours stays in force.';
    else if (!Number.isInteger(Number(raw))) errs.cutoff = 'Use whole hours. ' + saved.cutoff + ' hours stays in force.';
    setSErr(errs);
    setSStatus(null);
    if (Object.keys(errs).length) return;
    const a = (TZ.find((z) => z.value === sd.tz) || {}).abbr;
    setSaved({ tz: sd.tz, cutoff: Number(raw), confirmed: true });
    setSStatus('Saved. Every time in the app now reads in ' + a + ' (' + sd.tz + '). Patients can reschedule or cancel up to ' + plural(Number(raw), 'hour', 'hours') + ' before the start.');
  };

  const css = `
  .at-root *{box-sizing:border-box}
  .at-root :is(button,input,select,textarea,[tabindex]):focus-visible,.at-chip:focus-within{outline:2px solid var(--ink);outline-offset:2px;box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 60%,transparent)}
  .at-root ::placeholder{color:color-mix(in srgb,var(--ink) 60%,var(--bg))}
  .at-btn{transition:filter .15s,transform .15s,background-color .15s}
  .at-btn:hover:not(:disabled){filter:brightness(1.22)}
  .at-quiet:hover:not(:disabled){background:var(--panel2)!important;filter:none}
  .at-btn:active:not(:disabled){transform:translateY(1px)}
  .at-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--ink);cursor:pointer;text-align:left;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:4px}
  .at-link:hover{text-decoration-thickness:3px}
  .at-tab{transition:background-color .15s,color .15s}
  .at-tab:hover{background:var(--panel2)}
  .at-enter{animation:atIn .28s ease-out both}
  .at-scroll{scrollbar-width:thin}
  @keyframes atIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.at-enter{animation:none}.at-btn,.at-tab,.at-chip{transition:none}}
  `;

  const rootVars = {
    '--ink': brand.primaryColor,
    '--accent': brand.accentColor,
    '--neutral': brand.neutralColor,
    '--bg': brand.backgroundColor,
    '--font-h': brand.fontHeading,
    '--muted': 'color-mix(in srgb, ' + brand.primaryColor + ' 78%, ' + brand.backgroundColor + ')',
    '--panel': 'color-mix(in srgb, ' + brand.primaryColor + ' 6%, ' + brand.backgroundColor + ')',
    '--panel2': 'color-mix(in srgb, ' + brand.primaryColor + ' 12%, ' + brand.backgroundColor + ')',
    '--field': 'color-mix(in srgb, ' + brand.backgroundColor + ' 35%, white)',
    '--line': 'color-mix(in srgb, ' + brand.primaryColor + ' 62%, ' + brand.backgroundColor + ')',
    background: brand.backgroundColor,
    color: brand.primaryColor,
    fontFamily: brand.fontBody,
    fontSize: 15,
    lineHeight: 1.55,
  };

  return (
    <div className="at-root" style={rootVars}>
      <style>{css}</style>
      <div className="mx-auto w-full px-5 sm:px-8 py-12" style={{ maxWidth: 1240 }}>
        {/* Row 1 */}
        <header data-wf="b-0-0" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-h)', fontStyle: 'italic', fontWeight: 700, fontSize: 40, lineHeight: 1.15, margin: 0 }}>Admin console</h1>
          <p style={{ ...MUTED, marginTop: 8, maxWidth: 560, fontSize: 16 }}>
            accounts, doctors, the search catalogue and the clinic’s rules, kept together in one calm place.
          </p>
        </header>

        {/* Row 2 */}
        <nav data-wf="b-1-0" aria-label="Jump to a section of the admin console" className="flex flex-wrap gap-2" style={{ marginBottom: 48 }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} type="button" data-wf={t.wf} aria-current={on ? 'true' : undefined} onClick={() => jump(t.key, t.target)}
                className="at-tab" style={{ minHeight: 44, padding: '0 20px', borderRadius: 9999, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--ink)' : 'transparent'), background: on ? 'var(--ink)' : 'var(--panel)', color: on ? 'var(--bg)' : 'var(--ink)', boxShadow: on ? 'inset 0 -3px 0 var(--accent)' : 'none' }}>
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Row 3 left: accounts */}
          <Panel wf="b-2-0" labelledby="h-accounts" className="lg:col-span-8">
            <h2 id="h-accounts" tabIndex={-1} style={H2}>Doctor and admin accounts</h2>
            <p style={{ ...MUTED, marginTop: 8 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{accounts.length}</span> accounts. doctors and administrators are only ever created here.
            </p>

            {secret ? (
              <div role="status" className="at-enter" style={{ marginTop: 24, padding: 24, borderRadius: 24, background: 'color-mix(in srgb, var(--accent) 24%, var(--bg))' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{secret.kind === 'created' ? 'Account created for ' + secret.name : 'New password issued for ' + secret.name}</p>
                <p style={{ margin: '8px 0 0' }}>
                  Password, shown once:{' '}
                  <code style={{ padding: '4px 12px', borderRadius: 9999, background: 'var(--field)', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em' }}>{secret.password}</code>
                </p>
                <p style={{ ...MUTED, marginTop: 8, color: 'var(--ink)' }}>
                  hand it over in person; it is shown only here, once, and the next account you create or password you issue replaces it.
                  {secret.kind === 'reset' ? ' Their previous password no longer works and any open session has ended.' : ''}
                </p>
              </div>
            ) : null}

            <div role="region" aria-label="Doctor and admin accounts table, scrollable" tabIndex={0} className="at-scroll overflow-auto" style={{ marginTop: 24, maxHeight: 440 }}>
              <Table className="w-full" style={{ minWidth: 680, borderCollapse: 'collapse' }}>
                <THead>
                  <TR>
                    <TH data-wf="i-2-0-0" scope="col" style={thS}>Name</TH>
                    <TH data-wf="i-2-0-1" scope="col" style={thS}>Email</TH>
                    <TH data-wf="i-2-0-2" scope="col" style={thS}>Role</TH>
                    <TH data-wf="i-2-0-3" scope="col" style={thS}>Active</TH>
                    <TH data-wf="i-2-0-4" scope="col" style={thS}>Reset password</TH>
                  </TR>
                </THead>
                <TBody>
                  {accounts.map((a) => (
                    <TR key={a.id}>
                      <TD style={{ ...tdS, fontWeight: 600 }}>{a.name}</TD>
                      <TD style={{ ...tdS, color: 'var(--muted)' }}>{a.email}</TD>
                      <TD style={tdS}><Tag>{a.role === 'doctor' ? 'Doctor' : 'Administrator'}</Tag></TD>
                      <TD style={tdS}>
                        <Tag tone={a.active ? undefined : 'warn'} icon={a.active ? <Icons.CheckCircle aria-hidden="true" className="w-3 h-3" /> : <Icons.AlertCircle aria-hidden="true" className="w-3 h-3" />}>{a.active ? 'Active' : 'Inactive'}</Tag>
                      </TD>
                      <TD style={tdS}>
                        <Btn kind="quiet" size="sm" onClick={() => resetPassword(a)} aria-label={'Reset password for ' + a.name}>Reset password</Btn>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div aria-live="polite" style={{ marginTop: 16 }}>{acctStatus ? <Msg>{acctStatus}</Msg> : null}</div>
          </Panel>

          {/* Row 3 right: create account */}
          <Panel wf="b-2-1" labelledby="h-create" className="lg:col-span-4" arch>
            <h2 id="h-create" style={{ ...H2, textAlign: 'center' }}>Create account</h2>
            <p style={{ ...MUTED, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>for doctors and fellow administrators only</p>
            <form onSubmit={createAccount} noValidate className="flex flex-col gap-4">
              <Field id="ca-name" label="Name" error={caErr.name}>
                <Input id="ca-name" data-wf="i-2-1-0" autoComplete="off" value={ca.name} onChange={(e) => setCa({ ...ca, name: e.target.value })} aria-invalid={caErr.name ? 'true' : undefined} aria-describedby={caErr.name ? 'ca-name-msg' : undefined} placeholder="Full name" style={{ ...fieldBase, ...(caErr.name ? errField : {}) }} />
              </Field>
              <Field id="ca-email" label="Email" error={caErr.email}>
                <Input id="ca-email" data-wf="i-2-1-1" type="email" autoComplete="off" value={ca.email} onChange={(e) => setCa({ ...ca, email: e.target.value })} aria-invalid={caErr.email ? 'true' : undefined} aria-describedby={caErr.email ? 'ca-email-msg' : undefined} placeholder="name@willowbrook.clinic" style={{ ...fieldBase, ...(caErr.email ? errField : {}) }} />
              </Field>
              <Field id="ca-role" label="Role">
                <SelectBox id="ca-role" wf="i-2-1-2" value={ca.role} onChange={(e) => setCa({ ...ca, role: e.target.value })}>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Administrator</option>
                </SelectBox>
              </Field>
              <Field id="ca-pass" label="Initial password (shown once)" error={caErr.password} hint="At least 10 characters, with a letter and a number. You’ll see it once after creating.">
                <Input id="ca-pass" data-wf="i-2-1-3" autoComplete="off" value={ca.password} onChange={(e) => setCa({ ...ca, password: e.target.value })} aria-invalid={caErr.password ? 'true' : undefined} aria-describedby="ca-pass-msg" style={{ ...fieldBase, ...(caErr.password ? errField : {}) }} />
              </Field>
              <Btn data-wf="i-2-1-4" type="submit" icon={<Icons.Plus aria-hidden="true" className="w-4 h-4" />}>Create account</Btn>
              <div aria-live="polite">{caStatus ? <Msg>{caStatus}</Msg> : null}</div>
            </form>
          </Panel>

          {/* Row 4 left: doctor profile */}
          <Panel wf="b-3-0" labelledby="h-profile" className="lg:col-span-6" arch>
            <h2 id="h-profile" tabIndex={-1} style={{ ...H2, textAlign: 'center' }}>Doctor profile</h2>
            <div className="flex items-center justify-center gap-2" style={{ marginTop: 12, marginBottom: 24 }}>
              <Avatar name={doc.displayName} />
              <p style={{ ...MUTED }}>editing {doc.displayName}, {(accounts.find((a) => a.id === doc.accountId) || {}).email}</p>
            </div>
            <form onSubmit={saveProfile} onKeyDown={profileKey} noValidate className="flex flex-col gap-4">
              <Field id="pf-name" label="Display name" error={pErr.displayName}>
                <Input id="pf-name" data-wf="i-3-0-0" value={pd.displayName} onChange={(e) => setPd({ ...pd, displayName: e.target.value })} aria-invalid={pErr.displayName ? 'true' : undefined} aria-describedby={pErr.displayName ? 'pf-name-msg' : undefined} style={{ ...fieldBase, ...(pErr.displayName ? errField : {}) }} />
              </Field>
              <SpecPicker idp="pf-specs" wf="i-3-0-1" legend="Specializations (at least one)" specs={profileSpecs} value={pd.specs} onToggle={toggleSpec} error={pErr.specs} />
              <Field id="pf-quals" label="Qualifications">
                <Input id="pf-quals" data-wf="i-3-0-2" value={pd.quals} onChange={(e) => setPd({ ...pd, quals: e.target.value })} placeholder="MBBS, MD" style={fieldBase} />
              </Field>
              <Field id="pf-bio" label="Biography">
                <Textarea id="pf-bio" data-wf="i-3-0-3" rows={4} value={pd.bio} onChange={(e) => setPd({ ...pd, bio: e.target.value })} placeholder="A sentence or two patients will read before booking" style={{ ...fieldBase, borderRadius: 24, padding: '12px 20px', resize: 'vertical' }} />
              </Field>
              <Field id="pf-room" label="Room / location">
                <Input id="pf-room" data-wf="i-3-0-4" value={pd.room} onChange={(e) => setPd({ ...pd, room: e.target.value })} placeholder="Wing, room number" style={fieldBase} />
              </Field>
              <Field id="pf-fee" label="Consultation fee (display text)" hint="Shown as plain text and payable at the clinic. There is no online payment.">
                <Input id="pf-fee" data-wf="i-3-0-5" value={pd.fee} onChange={(e) => setPd({ ...pd, fee: e.target.value })} aria-describedby="pf-fee-msg" placeholder="$80 per consultation" style={fieldBase} />
              </Field>
              <label className="flex items-center gap-3" style={{ minHeight: 44, cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" data-wf="i-3-0-6" checked={pd.active} onChange={(e) => setPd({ ...pd, active: e.target.checked })} style={{ width: 22, height: 22, accentColor: 'var(--ink)' }} />
                <span>Active <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— patients can find and book this doctor</span></span>
              </label>
              <p style={{ ...MUTED, fontSize: 13 }}>press Enter in any single-line field to save this profile.</p>
              <div aria-live="polite">{pStatus ? <Msg>{pStatus}</Msg> : null}</div>
            </form>
          </Panel>

          {/* Row 4 right: specializations */}
          <Panel wf="b-3-1" labelledby="h-specs" className="lg:col-span-6">
            <h2 id="h-specs" tabIndex={-1} style={H2}>Specializations</h2>
            <p style={{ ...MUTED, marginTop: 8 }}>the fixed set of targets that doctors and disease mappings point at.</p>
            <div role="region" aria-label="Specializations table, scrollable" tabIndex={0} className="at-scroll overflow-auto" style={{ marginTop: 24, maxHeight: 560 }}>
              <Table className="w-full" style={{ minWidth: 520, borderCollapse: 'collapse' }}>
                <THead>
                  <TR>
                    <TH data-wf="i-3-1-0" scope="col" style={thS}>Name</TH>
                    <TH data-wf="i-3-1-1" scope="col" style={thS}>Description</TH>
                    <TH data-wf="i-3-1-2" scope="col" style={{ ...thS, textAlign: 'right' }}>Doctors</TH>
                    <TH data-wf="i-3-1-3" scope="col" style={{ ...thS, textAlign: 'right' }}>Mappings</TH>
                    <TH data-wf="i-3-1-4" scope="col" style={thS}>Active</TH>
                  </TR>
                </THead>
                <TBody>
                  {specs.map((s) => (
                    <TR key={s.id}>
                      <TD style={{ ...tdS, fontWeight: 600 }}>{s.name}</TD>
                      <TD style={{ ...tdS, color: 'var(--muted)', minWidth: 180 }}>{s.description}</TD>
                      <TD style={{ ...tdS, textAlign: 'right' }}>{doctors.filter((d) => d.specs.includes(s.id)).length}</TD>
                      <TD style={{ ...tdS, textAlign: 'right' }}>{terms.filter((t) => t.specs.includes(s.id)).length}</TD>
                      <TD style={tdS}>
                        <Tag tone={s.active ? undefined : 'warn'} icon={s.active ? <Icons.CheckCircle aria-hidden="true" className="w-3 h-3" /> : <Icons.AlertCircle aria-hidden="true" className="w-3 h-3" />}>{s.active ? 'Active' : 'Inactive'}</Tag>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div aria-live="polite" style={{ marginTop: 16 }}>{specStatus ? <Msg>{specStatus}</Msg> : null}</div>
          </Panel>

          {/* Row 5: text */}
          <div data-wf="b-4-0" className="lg:col-span-12">
            <div aria-live="polite" className="flex items-start gap-4" style={{ padding: 24, borderRadius: 24, background: 'color-mix(in srgb, var(--accent) 20%, var(--bg))' }}>
              <Icons.AlertCircle aria-hidden="true" className="w-5 h-5 shrink-0" style={{ marginTop: 2 }} />
              <div className="flex flex-col gap-2">
                <p style={{ margin: 0, fontSize: 15 }}>
                  {doc.active
                    ? 'Deactivating ' + doc.displayName + ' affects ' + plural(doc.future, 'future appointment', 'future appointments') + ', which stay visible to patient and doctor.'
                    : doc.displayName + ' is inactive: ' + plural(doc.future, 'future appointment', 'future appointments') + ' stay visible to patient and doctor, and no new slots can be booked.'}
                </p>
                <p style={{ margin: 0, fontSize: 15 }}>
                  Cannot delete {neuro ? neuro.name : 'Neurology'}: used by {plural(neuroDocs, 'doctor', 'doctors')} and {plural(neuroMaps, 'mapping', 'mappings')}. Deactivate instead.
                </p>
              </div>
            </div>
          </div>

          {/* Row 6 left: catalogue */}
          <Panel wf="b-5-0" labelledby="h-catalogue" className="lg:col-span-8">
            <h2 id="h-catalogue" tabIndex={-1} style={H2}>Disease & symptom catalogue</h2>
            <p style={{ ...MUTED, marginTop: 8 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{terms.length}</span> terms. patients find doctors through these, by plain text matching alone. Seeded entries are yours to edit or delete.
            </p>
            <div role="region" aria-label="Disease and symptom catalogue table, scrollable" tabIndex={0} className="at-scroll overflow-auto" style={{ marginTop: 24, maxHeight: 520 }}>
              <Table className="w-full" style={{ minWidth: 640, borderCollapse: 'collapse' }}>
                <THead>
                  <TR>
                    <TH data-wf="i-5-0-0" scope="col" style={thS}>Term</TH>
                    <TH data-wf="i-5-0-1" scope="col" style={thS}>Type (disease / symptom)</TH>
                    <TH data-wf="i-5-0-2" scope="col" style={thS}>Mapped specializations</TH>
                    <TH data-wf="i-5-0-3" scope="col" style={thS}>Edit / Delete</TH>
                  </TR>
                </THead>
                <TBody>
                  {terms.map((t) => (
                    <TR key={t.id}>
                      <TD style={{ ...tdS, fontWeight: 600 }}>{t.term}</TD>
                      <TD style={tdS}><Tag>{t.type === 'disease' ? 'Disease' : 'Symptom'}</Tag></TD>
                      <TD style={tdS}>
                        <div className="flex flex-wrap gap-1">
                          {t.specs.map((id) => (
                            <span key={id} style={{ fontSize: 13, padding: '2px 10px', borderRadius: 9999, background: 'var(--field)' }}>
                              {specName(id)}{(specs.find((s) => s.id === id) || {}).active === false ? ' (inactive)' : ''}
                            </span>
                          ))}
                        </div>
                      </TD>
                      <TD style={tdS}>
                        {delId === t.id ? (
                          <div className="at-enter flex flex-wrap items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Delete “{t.term}”?</span>
                            <Btn size="sm" onClick={() => deleteTerm(t)}>Yes, delete</Btn>
                            <Btn kind="quiet" size="sm" onClick={() => setDelId(null)}>Keep it</Btn>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Btn kind="quiet" size="sm" onClick={() => editTerm(t)} aria-label={'Edit ' + t.term} icon={<Icons.Edit aria-hidden="true" className="w-4 h-4" />}>Edit</Btn>
                            <Btn kind="quiet" size="sm" onClick={() => setDelId(t.id)} aria-label={'Delete ' + t.term} icon={<Icons.Trash aria-hidden="true" className="w-4 h-4" />}>Delete</Btn>
                          </div>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              {terms.length === 0 ? (
                <div className="at-enter" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ ...H2, fontSize: 20 }}>the catalogue is empty</p>
                  <p style={{ ...MUTED, marginTop: 8 }}>patients searching for a symptom will see “no match found”. Add a first term using the form beside this table.</p>
                </div>
              ) : null}
            </div>
            <div aria-live="polite" style={{ marginTop: 16 }}>{tStatus ? <Msg>{tStatus}</Msg> : null}</div>
          </Panel>

          {/* Row 6 right: term form */}
          <Panel wf="b-5-1" labelledby="h-term" className="lg:col-span-4" arch>
            <h2 id="h-term" style={{ ...H2, textAlign: 'center' }}>Add / edit term</h2>
            <p style={{ ...MUTED, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
              {td.id ? 'changing “' + (terms.find((t) => t.id === td.id) || {}).term + '”' : 'a new word patients might search for'}
            </p>
            <form onSubmit={saveTerm} noValidate className="flex flex-col gap-4">
              <Field id="te-term" label="Term" error={tErr.term}>
                <Input id="te-term" data-wf="i-5-1-0" autoComplete="off" value={td.term} onChange={(e) => setTd({ ...td, term: e.target.value })} aria-invalid={tErr.term ? 'true' : undefined} aria-describedby={tErr.term ? 'te-term-msg' : undefined} placeholder="e.g. Shortness of breath" style={{ ...fieldBase, ...(tErr.term ? errField : {}) }} />
              </Field>
              <Field id="te-type" label="Type">
                <SelectBox id="te-type" wf="i-5-1-1" value={td.type} onChange={(e) => setTd({ ...td, type: e.target.value })}>
                  <option value="disease">Disease</option>
                  <option value="symptom">Symptom</option>
                </SelectBox>
              </Field>
              <SpecPicker idp="te-specs" wf="i-5-1-2" legend="Specializations (at least one)" specs={specs.filter((s) => s.active || td.specs.includes(s.id))} value={td.specs} onToggle={toggleTermSpec} error={tErr.specs} />
              <Btn data-wf="i-5-1-3" type="submit" icon={<Icons.Check aria-hidden="true" className="w-4 h-4" />}>Save term</Btn>
            </form>
          </Panel>

          {/* Row 7 left: settings */}
          <Panel wf="b-6-0" labelledby="h-settings" className="lg:col-span-6" arch>
            <h2 id="h-settings" tabIndex={-1} style={{ ...H2, textAlign: 'center' }}>Clinic settings</h2>
            <p style={{ ...MUTED, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>one timezone and one cutoff, for everyone</p>
            <form onSubmit={saveSettings} noValidate className="flex flex-col gap-4">
              <Field id="cs-tz" label={'Clinic timezone (' + (saved.confirmed ? 'confirmed' : 'not yet confirmed') + ')'} hint={saved.confirmed ? 'Every slot, appointment and schedule is shown in ' + abbr + '.' : 'UTC is the documented default until you confirm a timezone. Choose yours and save.'}>
                <SelectBox id="cs-tz" wf="i-6-0-0" value={sd.tz} onChange={(e) => setSd({ ...sd, tz: e.target.value })} describedBy="cs-tz-msg">
                  {TZ.map((z) => <option key={z.value} value={z.value}>{z.label} ({z.abbr})</option>)}
                </SelectBox>
              </Field>
              <Field id="cs-cutoff" label="Booking cutoff (hours before appointment)" error={sErr.cutoff} hint="Inside this window patients can no longer reschedule or cancel.">
                <Input id="cs-cutoff" data-wf="i-6-0-1" inputMode="numeric" autoComplete="off" value={sd.cutoff} onChange={(e) => setSd({ ...sd, cutoff: e.target.value })} aria-invalid={sErr.cutoff ? 'true' : undefined} aria-describedby="cs-cutoff-msg" style={{ ...fieldBase, fontVariantNumeric: 'tabular-nums', ...(sErr.cutoff ? errField : {}) }} />
              </Field>
              <Btn data-wf="i-6-0-2" type="submit" icon={<Icons.Check aria-hidden="true" className="w-4 h-4" />}>Save settings</Btn>
              <div aria-live="polite">{sStatus ? <Msg>{sStatus}</Msg> : null}</div>
            </form>
          </Panel>

          {/* Row 7 right: audit */}
          <Panel wf="b-6-1" labelledby="h-audit" className="lg:col-span-6">
            <h2 id="h-audit" tabIndex={-1} style={H2}>Audit log (read-only)</h2>
            <p style={{ ...MUTED, marginTop: 8 }}>who opened or changed a consultation record, and when. record ids and actions only, never the clinical content. Entries can’t be edited or deleted.</p>
            <div role="region" aria-label="Audit log table, scrollable" tabIndex={0} className="at-scroll overflow-auto" style={{ marginTop: 24, maxHeight: 520 }}>
              <Table className="w-full" style={{ minWidth: 560, borderCollapse: 'collapse' }}>
                <THead>
                  <TR>
                    <TH data-wf="i-6-1-0" scope="col" style={thS}>Time ({abbr})</TH>
                    <TH data-wf="i-6-1-1" scope="col" style={thS}>Actor</TH>
                    <TH data-wf="i-6-1-2" scope="col" style={thS}>Action</TH>
                    <TH data-wf="i-6-1-3" scope="col" style={thS}>Record ID</TH>
                    <TH data-wf="i-6-1-4" scope="col" style={thS}>Outcome</TH>
                  </TR>
                </THead>
                <TBody>
                  {AUDIT_SEED.map((l) => (
                    <TR key={l.id}>
                      <TD style={{ ...tdS, whiteSpace: 'nowrap' }}>{fmtTime(l.at, saved.tz)}</TD>
                      <TD style={tdS}>
                        <span style={{ fontWeight: 600 }}>{l.actor}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}> · {l.role}</span>
                      </TD>
                      <TD style={tdS}>{l.action}</TD>
                      <TD style={{ ...tdS, whiteSpace: 'nowrap' }}>{l.record}</TD>
                      <TD style={tdS}>
                        {l.outcome === 'allowed'
                          ? <Tag icon={<Icons.CheckCircle aria-hidden="true" className="w-3 h-3" />}>Allowed</Tag>
                          : <Tag tone="warn" icon={<Icons.AlertCircle aria-hidden="true" className="w-3 h-3" />}>Denied</Tag>}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </Panel>

          {/* Row 8: docs */}
          <Panel wf="b-7-0" labelledby="h-docs" className="lg:col-span-12">
            <h2 id="h-docs" tabIndex={-1} style={H2}>Documentation</h2>
            <p style={{ ...MUTED, marginTop: 8 }}>written for clinic staff, so no one needs the build team to get started.</p>
            <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0 }} className="flex flex-col gap-2">
              {DOCS.map((d) => {
                const open = docOpen === d.key;
                return (
                  <li key={d.key} style={{ borderRadius: 24, background: open ? 'var(--panel2)' : 'var(--field)' }}>
                    <button type="button" data-wf={d.wf} aria-expanded={open} aria-controls={'doc-' + d.key} onClick={() => setDocOpen(open ? null : d.key)}
                      className="at-tab flex w-full items-center gap-4" style={{ minHeight: 56, padding: '12px 24px', borderRadius: 24, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)', fontSize: 16 }}>
                      <Icons.FileText aria-hidden="true" className="w-5 h-5 shrink-0" />
                      <span style={{ flex: 1 }}><strong>{d.lead}</strong>{d.rest}</span>
                      <Icons.ChevronDown aria-hidden="true" className="w-5 h-5 shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                    </button>
                    {open ? (
                      <div id={'doc-' + d.key} className="at-enter" style={{ padding: '0 24px 24px 60px' }}>
                        <ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc' }} className="flex flex-col gap-2">
                          {d.points.map((p) => <li key={p} style={{ maxWidth: 680 }}>{p}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
