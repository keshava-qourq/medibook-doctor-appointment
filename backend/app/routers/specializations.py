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
from sqlalchemy import func, inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.auth import current_user, require_role
from app.database import get_db
from app.errors import EmptyBodyHTTPError
from app.models import CatalogTerm, Specialization, User
from app.schemas import (
    CatalogTermCreate,
    CatalogTermListOut,
    CatalogTermOut,
    CatalogTermSpecOut,
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


def _count(db: DBSession, table: str, column: str, spec_id: str) -> int:
    """Count references in a table that may not exist yet (its owning sprint has
    not landed), treating an absent table as zero references."""
    bind = db.get_bind()
    if not inspect(bind).has_table(table):
        return 0
    stmt = text(f"SELECT count(*) FROM {table} WHERE {column} = :sid")  # noqa: S608 -- names are constants
    return int(db.execute(stmt, {"sid": spec_id}).scalar() or 0)


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

    doctors = _count(db, "doctor_specializations", "specialization_id", spec_id)
    mappings = _count(db, "term_specializations", "specialization_id", spec_id)
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
        is_seeded=row.is_seeded,
        specializations=[
            CatalogTermSpecOut(id=s.id, name=s.name, is_active=s.is_active)
            for s in row.specializations
        ],
    )


@admin_router.post("/catalog-terms", status_code=201, response_model=CatalogTermOut)
def create_catalog_term(payload: CatalogTermCreate, db: DBSession = Depends(get_db)):  # noqa: B008
    specs = (
        db.query(Specialization).filter(Specialization.id.in_(payload.specialization_ids)).all()
        if payload.specialization_ids
        else []
    )
    row = CatalogTerm(term=payload.term, entry_type=payload.entry_type, is_seeded=False)
    row.specializations = specs
    db.add(row)
    db.commit()
    db.refresh(row)
    return _term_out(row)


@admin_router.get("/catalog-terms", response_model=CatalogTermListOut)
def list_catalog_terms(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DBSession = Depends(get_db),  # noqa: B008
):
    query = db.query(CatalogTerm)
    total = query.count()
    rows = query.order_by(CatalogTerm.created_at.desc()).offset(offset).limit(limit).all()
    return CatalogTermListOut(items=[_term_out(r) for r in rows], total=total)


__all__ = ["public_router", "admin_router"]
