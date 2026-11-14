"""Medical specializations: admin CRUD with case-insensitive uniqueness, a
reference-counting delete guard and soft deactivation (US-006-1).

The public listing (any authenticated role) reports active specializations;
the create/update/delete surface is admin-only. A specialization referenced by
a doctor or a disease/term mapping is never hard-deleted: deletion is refused
409 `in_use` with the reference counts, and deactivation via PATCH is offered
instead so existing appointments keep resolving it (NFR-026).
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import Table, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import (
    CatalogTerm,
    Specialization,
    User,
    doctor_specializations,
    term_specializations,
)
from app.schemas import (
    CatalogSuggestItem,
    CatalogSuggestOut,
    CatalogTermCreate,
    CatalogTermListOut,
    CatalogTermOut,
    CatalogTermSpecOut,
    CatalogTermUpdate,
    SpecializationCreate,
    SpecializationListOut,
    SpecializationOut,
    SpecializationUpdate,
)

public_router = APIRouter(prefix="/api", tags=["specializations"])
admin_router = APIRouter(
    prefix="/api/admin",
    tags=["specializations"],
    dependencies=[Depends(require_role("admin"))],
)


def _to_out(row: Specialization) -> SpecializationOut:
    return SpecializationOut(
        id=row.id, name=row.name, description=row.description, is_active=row.is_active
    )


def _duplicate(db: DBSession, name: str, exclude_id: str | None = None) -> bool:
    """Case-insensitive name collision check (citext on Postgres, func.lower on
    SQLite), excluding the row being updated."""
    query = db.query(Specialization).filter(func.lower(Specialization.name) == name.lower())
    if exclude_id is not None:
        query = query.filter(Specialization.id != exclude_id)
    return query.first() is not None


def _count(db: DBSession, table: Table, spec_id: str) -> int:
    """Count rows in an association table referencing this specialization."""
    stmt = select(func.count()).select_from(table).where(table.c.specialization_id == spec_id)
    return int(db.execute(stmt).scalar() or 0)


@public_router.get("/specializations", response_model=SpecializationListOut)
def list_specializations(
    active: bool | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
):
    query = db.query(Specialization)
    # Non-admin callers (patients, doctors) see only active specializations; an
    # explicit `active` filter still applies. Admins see every row by default so a
    # deactivated specialization remains viewable to them (NFR-026).
    if active is None and user.role != "admin":
        active = True
    if active is not None:
        query = query.filter(Specialization.is_active.is_(active))
    total = query.count()
    rows = query.order_by(Specialization.name.asc()).offset(offset).limit(limit).all()
    return SpecializationListOut(items=[_to_out(r) for r in rows], total=total)


@admin_router.post("/specializations", status_code=201, response_model=SpecializationOut)
def create_specialization(payload: SpecializationCreate, db: DBSession = Depends(get_db)):  # noqa: B008
    if _duplicate(db, payload.name):
        return JSONResponse(status_code=409, content={"code": "duplicate_name"})

    row = Specialization(name=payload.name, description=payload.description, is_active=True)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "duplicate_name"})
    db.refresh(row)
    return _to_out(row)


@admin_router.patch("/specializations/{id}", response_model=SpecializationOut)
def update_specialization(
    id: str,  # noqa: A002 -- matches the {id} path in the API contract
    payload: SpecializationUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
):
    spec_id = id
    row = db.get(Specialization, spec_id)
    if row is None:
        raise EmptyBodyHTTPError(404)

    fields = payload.model_dump(exclude_unset=True)
    if "name" in fields and fields["name"] is not None:
        if _duplicate(db, fields["name"], exclude_id=spec_id):
            return JSONResponse(status_code=409, content={"code": "duplicate_name"})
        row.name = fields["name"]
    if "description" in fields:
        row.description = fields["description"]
    if "is_active" in fields and fields["is_active"] is not None:
        row.is_active = fields["is_active"]

    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "duplicate_name"})
    db.refresh(row)
    return _to_out(row)


@admin_router.delete("/specializations/{id}", status_code=204)
def delete_specialization(id: str, db: DBSession = Depends(get_db)):  # noqa: A002, B008
    spec_id = id
    row = db.get(Specialization, spec_id)
    if row is None:
        raise EmptyBodyHTTPError(404)

    doctors = _count(db, doctor_specializations, spec_id)
    mappings = _count(db, term_specializations, spec_id)
    if doctors or mappings:
        return JSONResponse(
            status_code=409,
            content={
                "code": "in_use",
                "doctors": doctors,
                "mappings": mappings,
                "doctor_count": doctors,
                "mapping_count": mappings,
                "suggestion": "deactivate",
            },
        )

    db.delete(row)
    db.commit()
    return Response(status_code=204)


def _term_out(row: CatalogTerm) -> CatalogTermOut:
    return CatalogTermOut(
        id=row.id,
        term=row.term,
        entry_type=row.entry_type,
        kind=row.entry_type,
        specialization_ids=[s.id for s in row.specializations],
        is_seeded=row.is_seeded,
        specializations=[
            CatalogTermSpecOut(id=s.id, name=s.name, is_active=s.is_active)
            for s in row.specializations
        ],
    )


def _active_specs(db: DBSession, ids: list[str]) -> list[Specialization]:
    """Resolve the given ids to active specializations only; a term links only to
    active specializations."""
    return (
        db.query(Specialization)
        .filter(Specialization.id.in_(ids), Specialization.is_active.is_(True))
        .all()
    )


def _duplicate_term(db: DBSession, term: str, exclude_id: str | None = None) -> bool:
    query = db.query(CatalogTerm).filter(
        func.lower(CatalogTerm.term) == term.lower(),
        CatalogTerm.is_deleted.is_(False),
    )
    if exclude_id is not None:
        query = query.filter(CatalogTerm.id != exclude_id)
    return query.first() is not None


@admin_router.post("/catalog-terms", status_code=201, response_model=CatalogTermOut)
def create_catalog_term(payload: CatalogTermCreate, db: DBSession = Depends(get_db)):  # noqa: B008
    if _duplicate_term(db, payload.term):
        return JSONResponse(status_code=409, content={"code": "duplicate_term"})

    row = CatalogTerm(term=payload.term, entry_type=payload.entry_type, is_seeded=False)
    row.specializations = _active_specs(db, payload.specialization_ids)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "duplicate_term"})
    db.refresh(row)
    return _term_out(row)


@admin_router.get("/catalog-terms", response_model=CatalogTermListOut)
def list_catalog_terms(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DBSession = Depends(get_db),  # noqa: B008
):
    query = db.query(CatalogTerm).filter(CatalogTerm.is_deleted.is_(False))
    total = query.count()
    rows = query.order_by(CatalogTerm.created_at.desc()).offset(offset).limit(limit).all()
    return CatalogTermListOut(items=[_term_out(r) for r in rows], total=total)


@admin_router.put("/catalog-terms/{id}", response_model=CatalogTermOut)
def update_catalog_term(
    id: str,  # noqa: A002 -- matches the {id} path in the API contract
    payload: CatalogTermUpdate,
    db: DBSession = Depends(get_db),  # noqa: B008
):
    row = db.get(CatalogTerm, id)
    if row is None or row.is_deleted:
        raise EmptyBodyHTTPError(404)

    fields = payload.model_dump(exclude_unset=True)
    if "term" in fields and fields["term"] is not None:
        if _duplicate_term(db, fields["term"], exclude_id=id):
            return JSONResponse(status_code=409, content={"code": "duplicate_term"})
        row.term = fields["term"]
    if "entry_type" in fields and fields["entry_type"] is not None:
        row.entry_type = fields["entry_type"]
    if "specialization_ids" in fields and fields["specialization_ids"] is not None:
        row.specializations = _active_specs(db, fields["specialization_ids"])

    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=409, content={"code": "duplicate_term"})
    db.refresh(row)
    return _term_out(row)


@admin_router.delete("/catalog-terms/{id}", status_code=204)
def delete_catalog_term(id: str, db: DBSession = Depends(get_db)):  # noqa: A002, B008
    row = db.get(CatalogTerm, id)
    if row is None or row.is_deleted:
        raise EmptyBodyHTTPError(404)
    # Soft-delete: the row stays so already-booked appointments that reference it
    # are untouched (NFR-026), but it stops resolving and stops appearing in suggest.
    row.is_deleted = True
    db.add(row)
    db.commit()
    return Response(status_code=204)


@public_router.get("/catalog/suggest", response_model=CatalogSuggestOut)
def suggest_catalog_terms(
    q: str = Query(default=""),
    user: User = Depends(current_user),  # noqa: B008 -- enforces the 401 contract
    db: DBSession = Depends(get_db),  # noqa: B008
):
    """Deterministic case-insensitive substring match over non-deleted terms; an
    empty list for a query shorter than two characters, no fuzzy or ML ranking
    (NFR-012)."""
    needle = q.strip()
    if len(needle) < 2:
        return CatalogSuggestOut(items=[], total=0)
    rows = (
        db.query(CatalogTerm)
        .filter(
            CatalogTerm.is_deleted.is_(False),
            func.lower(CatalogTerm.term).like(f"%{needle.lower()}%"),
        )
        .order_by(CatalogTerm.term.asc())
        .all()
    )
    items = [
        CatalogSuggestItem(
            id=r.id,
            term=r.term,
            entry_type=r.entry_type,
            kind=r.entry_type,
            specializations=[
                CatalogTermSpecOut(id=s.id, name=s.name, is_active=s.is_active)
                for s in r.specializations
                if s.is_active
            ],
        )
        for r in rows
    ]
    # Specializations are suggestible entries in their own right (AC-041): same
    # deterministic case-insensitive substring over the stored rows.
    specs = (
        db.query(Specialization)
        .filter(
            Specialization.is_active.is_(True),
            func.lower(Specialization.name).like(f"%{needle.lower()}%"),
        )
        .order_by(Specialization.name.asc())
        .all()
    )
    items.extend(
        CatalogSuggestItem(
            id=s.id,
            term=s.name,
            entry_type="specialization",
            kind="specialization",
            specializations=[CatalogTermSpecOut(id=s.id, name=s.name, is_active=True)],
        )
        for s in specs
    )
    return CatalogSuggestOut(items=items, total=len(items))


__all__ = ["public_router", "admin_router"]
