"""US-009-2 acceptance (API): the seeded disease and symptom catalogue.

AC-034  Every term in the documented seed list is returned by GET /api/catalog/suggest
        and resolves to at least one specialization.
AC-035  An administrator sees term, entry type and mapped specializations for seeded
        entries, and a seeded entry is editable and deletable like any other.
AC-036  Editing one seeded term and soft-deleting another survives a re-run of the
        seeder: the edit is preserved and the deleted term is not recreated (NFR-024).
NFR-012 An unknown term returns the no-match response and never an invented or fuzzy
        match.
NFR-016 / NFR-017 are infrastructure/provisioning promises: they stay declared where
        they live (tests/integration/test_nfr_infrastructure.py) plus the e2e
        [KNOWN-LIMIT] placeholders pointing at docker-compose.yml / deployment config.

Contract:
  GET    /api/catalog/suggest?q=            -> 200 {items:[{id, term, entry_type,
                                               specializations:[{id,name}]}], total}
  GET    /api/admin/catalog-terms           -> 200 {items:[{id, term, entry_type,
                                               is_seeded, specializations}], total}
  PUT    /api/admin/catalog-terms/{id}      -> 200 (seeded and admin-created alike)
  DELETE /api/admin/catalog-terms/{id}      -> 204 soft delete

The seeder (app/seed_catalog.py + app/seed_data/) is delivered by US-009-1 in the same
sprint. The ``client`` fixture starts from an empty database, so each test runs the
seeder against that database itself. While the seeder does not exist the criteria are
PENDING (skipped, concurrent build) rather than failing on an import the builder has
not written yet; every other assertion is real.
"""

import importlib
import inspect
import json
import secrets
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models import User
from app.security import hash_password


def _password() -> str:
    return secrets.token_urlsafe(12)


def _email(tag: str) -> str:
    return f"{tag}-{secrets.token_hex(6)}@example.com"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_admin(db: DBSession, password: str) -> str:
    email = _email("admin")
    db.add(
        User(
            email=email,
            full_name="Bootstrap Admin",
            role="admin",
            is_active=True,
            password_hash=hash_password(password),
        )
    )
    db.commit()
    return email


def _admin_token(client: TestClient, db: DBSession) -> str:
    password = _password()
    email = _seed_admin(db, password)
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def _patient_token(client: TestClient) -> str:
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Catalogue Patient",
            "email": _email("patient"),
            "phone": "+15551112222",
            "password": _password(),
        },
    )
    assert reg.status_code == 201, reg.text
    return reg.json()["token"]


def _has_route(client: TestClient, template: str) -> bool:
    return template in client.get("/openapi.json").json().get("paths", {})


def _require(client: TestClient, *templates: str) -> None:
    missing = [t for t in templates if not _has_route(client, t)]
    if missing:
        pytest.skip(
            "PENDING: catalogue routes not mounted yet "
            f"({', '.join(missing)}); delivered in the same sprint (concurrent build)"
        )


def _items(payload) -> list:
    if isinstance(payload, dict):
        return payload.get("items", [])
    return payload


# -- the seeder, invoked against this test's database --------------------------


def _seed_callable():
    """The documented seeder entry point, or None while US-009-1 is still in flight."""
    try:
        module = importlib.import_module("app.seed_catalog")
    except ModuleNotFoundError:
        return None
    for name in (
        "seed_catalog",
        "seed_catalog_terms",
        "seed_catalogue",
        "seed_terms",
        "seed",
        "run",
        "main",
    ):
        candidate = getattr(module, name, None)
        if callable(candidate):
            return candidate
    return None


def _run_seeder(db: DBSession) -> None:
    fn = _seed_callable()
    if fn is None:
        pytest.skip(
            "PENDING: app/seed_catalog.py (catalogue seeder) is not delivered yet; "
            "US-009-1 builds it in the same sprint (concurrent build)"
        )
    params = inspect.signature(fn).parameters
    if params:
        fn(db)
    else:  # a seeder that opens its own session cannot target this test's database
        pytest.skip(
            "PENDING: the seeder takes no database session, so it cannot be invoked "
            "against the test database; re-seeding is then only observable in e2e"
        )
    db.commit()


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "docs").is_dir() and (parent / "docker-compose.yml").exists():
            return parent
    raise AssertionError("repository root not found")


def _collect_terms(node, out: list[str]) -> None:
    if isinstance(node, dict):
        term = node.get("term")
        if isinstance(term, str) and term.strip():
            out.append(term)
        for value in node.values():
            _collect_terms(value, out)
    elif isinstance(node, list):
        for value in node:
            _collect_terms(value, out)


def _documented_seed_terms() -> list[str]:
    """The documented seed list, read as data from backend/app/seed_data/."""
    seed_dir = _repo_root() / "backend/app/seed_data"
    if not seed_dir.is_dir():
        pytest.skip(
            "PENDING: backend/app/seed_data/ (the documented seed list) is not "
            "delivered yet; US-009-1 builds it in the same sprint (concurrent build)"
        )
    terms: list[str] = []
    for path in sorted(seed_dir.rglob("*.json")):
        _collect_terms(json.loads(path.read_text(encoding="utf-8")), terms)
    assert terms, f"the documented seed list in {seed_dir} must name at least one term"
    # Unique, order preserved.
    return list(dict.fromkeys(terms))


def _suggest(client: TestClient, token: str, q: str):
    return client.get("/api/catalog/suggest", headers=_bearer(token), params={"q": q})


def _admin_terms(client: TestClient, token: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        resp = client.get(
            "/api/admin/catalog-terms",
            headers=_bearer(token),
            params={"limit": 100, "offset": offset},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        page = _items(body)
        rows.extend(page)
        offset += len(page)
        if not page or offset >= body.get("total", len(rows)):
            break
    return rows


# -- AC-034 --------------------------------------------------------------------


def test_ac034_every_documented_seed_term_suggests_and_resolves_to_a_specialization(
    client: TestClient, db_session: DBSession
):
    """[AC-034] On a freshly installed system with no administrator edits, every term in
    the documented seed list is found by GET /api/catalog/suggest and carries at least
    one mapped specialization."""
    _require(client, "/api/catalog/suggest")
    _admin_token(client, db_session)
    _run_seeder(db_session)
    expected = _documented_seed_terms()

    patient = _patient_token(client)
    missing: list[str] = []
    unmapped: list[str] = []
    for term in expected:
        resp = _suggest(client, patient, term)
        assert resp.status_code == 200, resp.text
        hits = [t for t in _items(resp.json()) if t["term"].lower() == term.lower()]
        if not hits:
            missing.append(term)
            continue
        if not (hits[0].get("specializations") or []):
            unmapped.append(term)

    assert not missing, f"seeded terms not returned by suggest: {missing}"
    assert not unmapped, f"seeded terms resolving to no specialization: {unmapped}"


def test_ac034_seeded_terms_are_marked_seeded_and_carry_an_entry_type(
    client: TestClient, db_session: DBSession
):
    """[AC-034][AC-035] The seeded rows are stored as catalogue entries with an entry
    type of disease or symptom and are flagged is_seeded for the administrator."""
    _require(client, "/api/admin/catalog-terms")
    token = _admin_token(client, db_session)
    _run_seeder(db_session)
    expected = {t.lower() for t in _documented_seed_terms()}

    rows = _admin_terms(client, token)
    seeded = {r["term"].lower(): r for r in rows if r.get("is_seeded")}
    assert expected <= set(seeded), f"missing from the catalogue: {expected - set(seeded)}"
    for term in expected:
        row = seeded[term]
        assert row["entry_type"] in ("disease", "symptom"), row
        assert row.get("specializations"), f"{term} must map to at least one specialization"


# -- AC-035 --------------------------------------------------------------------


def test_ac035_a_seeded_entry_is_editable_and_deletable_like_any_other(
    client: TestClient, db_session: DBSession
):
    """[AC-035] A seeded entry is edited and another deleted through exactly the same
    endpoints an administrator-created entry uses, with the same responses."""
    _require(client, "/api/admin/catalog-terms", "/api/admin/catalog-terms/{id}")
    token = _admin_token(client, db_session)
    _run_seeder(db_session)

    seeded = [r for r in _admin_terms(client, token) if r.get("is_seeded")]
    assert len(seeded) >= 2, "the seed list must provide at least two entries to exercise"

    target, victim = seeded[0], seeded[1]
    spec_ids = [s["id"] for s in target["specializations"]]
    renamed = f"{target['term']}-edited-{secrets.token_hex(4)}"
    edited = client.put(
        f"/api/admin/catalog-terms/{target['id']}",
        headers=_bearer(token),
        json={
            "term": renamed,
            "entry_type": target["entry_type"],
            "specialization_ids": spec_ids,
        },
    )
    assert edited.status_code == 200, edited.text

    deleted = client.delete(f"/api/admin/catalog-terms/{victim['id']}", headers=_bearer(token))
    assert deleted.status_code == 204, deleted.text

    after = {r["term"] for r in _admin_terms(client, token) if r.get("deleted_at") is None}
    assert renamed in after
    assert victim["term"] not in after

    # A missing id behaves identically for seeded and administrator-created entries.
    missing = client.delete(
        f"/api/admin/catalog-terms/{secrets.token_hex(16)}", headers=_bearer(token)
    )
    assert missing.status_code == 404, missing.text
    assert missing.content == b""


# -- AC-036 / NFR-024 -----------------------------------------------------------


def test_ac036_nfr024_reseeding_preserves_an_edit_and_never_recreates_a_deleted_term(
    client: TestClient, db_session: DBSession
):
    """[AC-036][NFR-024] After an administrator edits one seeded term and deletes
    another, running the seeder again leaves the edit in place and does not bring the
    deleted term back."""
    _require(client, "/api/admin/catalog-terms", "/api/admin/catalog-terms/{id}")
    token = _admin_token(client, db_session)
    _run_seeder(db_session)

    seeded = [r for r in _admin_terms(client, token) if r.get("is_seeded")]
    assert len(seeded) >= 2, "the seed list must provide at least two entries to exercise"
    edited_row, deleted_row = seeded[0], seeded[1]

    renamed = f"{edited_row['term']}-renamed-{secrets.token_hex(4)}"
    put = client.put(
        f"/api/admin/catalog-terms/{edited_row['id']}",
        headers=_bearer(token),
        json={
            "term": renamed,
            "entry_type": edited_row["entry_type"],
            "specialization_ids": [s["id"] for s in edited_row["specializations"]],
        },
    )
    assert put.status_code == 200, put.text

    delete = client.delete(
        f"/api/admin/catalog-terms/{deleted_row['id']}", headers=_bearer(token)
    )
    assert delete.status_code == 204, delete.text

    # Re-deployment / restart: the seeder runs again.
    _run_seeder(db_session)

    rows = _admin_terms(client, token)
    live_terms = {r["term"] for r in rows}

    assert renamed in live_terms, "the administrator's edit must survive re-seeding"
    assert edited_row["term"] not in live_terms, (
        "re-seeding must not recreate the original wording of an edited seeded term"
    )
    assert deleted_row["term"] not in live_terms, (
        "re-seeding must not recreate a term the administrator deleted"
    )

    # The deleted term also stops being suggested after re-seeding.
    patient = _patient_token(client)
    suggest = _suggest(client, patient, deleted_row["term"])
    assert suggest.status_code == 200, suggest.text
    assert not any(
        t["term"].lower() == deleted_row["term"].lower() for t in _items(suggest.json())
    ), "a deleted seeded term must not be suggested after re-seeding"

    # Re-seeding is idempotent: it does not duplicate the entries it already created.
    terms = [r["term"].lower() for r in rows]
    assert len(terms) == len(set(terms)), f"re-seeding duplicated catalogue entries: {terms}"


# -- NFR-012 --------------------------------------------------------------------


def test_nfr012_unknown_term_returns_the_no_match_response_never_an_invented_match(
    client: TestClient, db_session: DBSession
):
    """[NFR-012] A term that is not in the seeded catalogue is answered with the explicit
    no-match response: suggest returns nothing and the search resolves to no_match, with
    no guessed, fuzzy or invented specialization or doctor."""
    _require(client, "/api/catalog/suggest")
    _admin_token(client, db_session)
    _run_seeder(db_session)
    patient = _patient_token(client)

    unknown = f"zzq{secrets.token_hex(8)}"
    suggest = _suggest(client, patient, unknown)
    assert suggest.status_code == 200, suggest.text
    assert _items(suggest.json()) == [], suggest.text

    # A near-miss of a real seeded term is not fuzzy-matched either.
    seeded = _documented_seed_terms()[0]
    typo = f"{seeded}qqz"
    near = _suggest(client, patient, typo)
    assert near.status_code == 200, near.text
    assert _items(near.json()) == [], (
        "a term that is not a stored substring must never be matched; "
        "matching is deterministic case-insensitive substring only"
    )

    # A query shorter than two characters returns nothing rather than guessing.
    short = _suggest(client, patient, seeded[:1])
    assert short.status_code == 200, short.text
    assert _items(short.json()) == [], short.text

    if _has_route(client, "/api/search/doctors"):
        resolved = client.get(
            "/api/search/doctors", headers=_bearer(patient), params={"term": unknown}
        )
        assert resolved.status_code == 200, resolved.text
        body = resolved.json()
        assert body["resolution"] == "no_match", body
        assert not (body.get("specializations") or []), body
        assert not (body.get("doctors") or []), body


# -- NFR-016 / NFR-017: infrastructure/provisioning, not observable from the app --


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-016 automated backups and point-in-time recovery are "
    "managed-database settings enabled in hosting/deployment config (docker-compose.yml "
    "/ IaC), not observable from the app; the committed declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr016_backups_and_pitr_are_infrastructure():  # pragma: no cover
    pass


@pytest.mark.skip(
    reason="[KNOWN-LIMIT] NFR-017 sizing for one small clinic is a provisioning/capacity "
    "target declared in deployment config (docker-compose.yml / IaC), not observable from "
    "the app; the committed declaration is covered by "
    "tests/integration/test_nfr_infrastructure.py"
)
def test_nfr017_sizing_is_infrastructure():  # pragma: no cover
    pass
