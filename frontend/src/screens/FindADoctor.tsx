import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { Button, Card, CardContent, Input, Label, Select } from "@/lib/ui";

export interface SpecRef {
  id: string;
  name: string;
}
export interface DoctorCard {
  id: string;
  full_name: string;
  specializations: SpecRef[];
  qualifications: string | null;
  consultation_fee: number | null;
  is_active?: boolean;
}
interface SuggestItem {
  id: string;
  term: string;
  entry_type: "disease" | "symptom" | "specialization";
  specializations: SpecRef[];
}
interface SuggestOut {
  items: SuggestItem[];
  total: number;
}
interface SearchOut {
  items: DoctorCard[];
  total: number;
  resolution: "matched" | "no_match" | "no_specialist_available";
  specializations: SpecRef[];
}
interface SpecListOut {
  items: Array<{ id: string; name: string; description: string | null }>;
  total: number;
}

export const FEE_NOTE = "The consultation fee is payable at the clinic.";

export default function Screen() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice ?? "";
  const [params, setParams] = useSearchParams();
  const term = params.get("term") ?? "";

  const [query, setQuery] = useState(term);
  const [debounced, setDebounced] = useState("");
  const [specFilter, setSpecFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [browse, setBrowse] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const suggest = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: () => apiFetch<SuggestOut>(`/api/catalog/suggest?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
  });

  const search = useQuery({
    queryKey: ["search-doctors", term],
    queryFn: () =>
      apiFetch<SearchOut>(
        `/api/search/doctors?term=${encodeURIComponent(term)}&limit=100&offset=0`,
      ),
    enabled: term.length > 0,
  });

  const specList = useQuery({
    queryKey: ["specializations"],
    queryFn: () => apiFetch<SpecListOut>("/api/specializations?limit=100&offset=0"),
    enabled: browse,
  });

  const submit = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    setDebounced("");
    setBrowse(false);
    setParams({ term: next });
  };

  const results = search.data?.items;
  const visible = useMemo(
    () =>
      (results ?? []).filter(
        (d) =>
          (!specFilter || d.specializations.some((s) => s.id === specFilter)) &&
          (!nameFilter || d.full_name.toLowerCase().includes(nameFilter.trim().toLowerCase())),
      ),
    [results, specFilter, nameFilter],
  );
  const showSuggestions = debounced.length >= 2 && (suggest.data?.items.length ?? 0) > 0;
  const specName = search.data?.specializations.find((s) => s.id === specFilter)?.name ?? "";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--brand-font-heading)" }}>
        Find a Doctor
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Type a disease, symptom or specialization. {FEE_NOTE}
      </p>

      {notice ? (
        <p role="status" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
        </p>
      ) : null}

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="mb-search">Disease, symptom or specialization</Label>
          <Input
            id="mb-search"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="mb-suggestions"
            aria-autocomplete="list"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. migraine"
          />
        </div>
        <Button type="submit" className="sm:mt-6">
          Search
        </Button>
      </form>

      {showSuggestions ? (
        <ul
          id="mb-suggestions"
          role="listbox"
          aria-label="Suggestions"
          className="mt-3 flex flex-col gap-1"
        >
          {(suggest.data?.items ?? []).map((item) => (
            <li key={item.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm"
                onClick={() => submit(item.term)}
              >
                <span className="font-medium">{item.term}</span>{" "}
                <span className="text-slate-500">({item.entry_type})</span>{" "}
                <span className="text-slate-500">
                  {item.specializations.map((s) => s.name).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {term ? (
        <section aria-label="Search results" className="mt-8">
          {search.isPending ? <p className="text-sm">Loading doctors…</p> : null}

          {search.isError ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              We could not load the doctors for that term. Please try again.
            </p>
          ) : null}

          {search.data?.resolution === "no_match" ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm font-semibold">No match found for “{term}”.</p>
              <p className="text-sm text-slate-600">
                Try a different term, or browse the full list of specializations.
              </p>
              <Button type="button" variant="secondary" onClick={() => setBrowse(true)}>
                Browse all specializations
              </Button>
              {browse ? (
                <div className="w-full">
                  {specList.isPending ? <p className="text-sm">Loading specializations…</p> : null}
                  {specList.isError ? (
                    <p role="alert" className="text-sm font-medium text-red-700">
                      We could not load the specializations. Please try again.
                    </p>
                  ) : null}
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(specList.data?.items ?? []).map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
                          onClick={() => submit(s.name)}
                        >
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {search.data?.resolution === "no_specialist_available" ? (
            <p className="text-sm font-semibold">
              The clinic has no available specialist for that condition.
            </p>
          ) : null}

          {search.data?.resolution === "matched" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="mb-spec">Specialization</Label>
                  <Select
                    id="mb-spec"
                    value={specFilter}
                    onChange={(e) => setSpecFilter(e.target.value)}
                  >
                    <option value="">All specializations</option>
                    {search.data.specializations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="mb-docname">Doctor name</Label>
                  <Input
                    id="mb-docname"
                    value={nameFilter}
                    autoComplete="off"
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSpecFilter("");
                    setNameFilter("");
                  }}
                >
                  Clear filters
                </Button>
              </div>

              {specFilter || nameFilter ? (
                <ul aria-label="Applied filters" className="mt-3 flex flex-wrap gap-2">
                  {specFilter ? (
                    <li>
                      <button
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                        onClick={() => setSpecFilter("")}
                      >
                        {`Specialization: ${specName}`} ✕
                      </button>
                    </li>
                  ) : null}
                  {nameFilter ? (
                    <li>
                      <button
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                        onClick={() => setNameFilter("")}
                      >
                        {`Doctor name: ${nameFilter}`} ✕
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {visible.length === 0 ? (
                <p className="mt-4 text-sm font-semibold">
                  No doctor matches these filters. Clear a filter to see more.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {visible.map((d) => (
                    <li key={d.id}>
                      <Card>
                        <CardContent className="p-5">
                          <button
                            type="button"
                            className="text-left text-base font-semibold underline"
                            onClick={() =>
                              navigate(`/doctors/${d.id}`, {
                                state: { from: `${location.pathname}${location.search}` },
                              })
                            }
                          >
                            {d.full_name}
                          </button>
                          <div>
                            <p className="text-sm text-slate-600">
                              {d.specializations.map((s) => s.name).join(", ")}
                            </p>
                            <p className="text-sm text-slate-600">
                              {d.qualifications ?? "Qualifications not recorded"}
                            </p>
                            <p className="text-sm text-slate-600">
                              {d.consultation_fee === null
                                ? "Consultation fee not recorded"
                                : `Consultation fee: ${d.consultation_fee}`}
                            </p>
                            <p className="text-xs text-slate-500">{FEE_NOTE}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
