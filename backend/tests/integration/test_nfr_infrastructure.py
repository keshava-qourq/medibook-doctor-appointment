"""Provisioning NFRs that no application request can observe.

NFR-016 (automated backups + point-in-time recovery for clinic data) and
NFR-017 (sizing for one small clinic: ~10-50 doctors, a few thousand patients)
are infrastructure/provisioning requirements. There is no API behaviour that can
assert them, so they are verified where they actually live: the deployment
architecture/config declarations committed to the repository. These tests fail
if that declaration is removed or weakened.
"""

import re
from pathlib import Path


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "docs").is_dir() and (parent / "docker-compose.yml").exists():
            return parent
    raise AssertionError("repository root (with docs/ and docker-compose.yml) not found")


def _read(rel: str) -> str:
    path = _repo_root() / rel
    assert path.exists(), f"expected provisioning file is missing: {rel}"
    return path.read_text(encoding="utf-8")


# -- NFR-016: automated backups and point-in-time recovery for clinic data -----


def test_nfr016_clinic_database_declares_automated_backups_and_pitr():
    """[NFR-016] The managed clinic database is declared with automated backups and
    point-in-time recovery enabled, so records can be restored after a failure."""
    guide = _read("docs/sdlc/deployment/deployment-guide.md").lower()
    assert "automated backups" in guide
    assert "point-in-time recovery" in guide
    # It is the clinic database (managed PostgreSQL) that carries this guarantee.
    assert "postgresql" in guide


# -- NFR-017: sized for one small clinic in daily use --------------------------


def test_nfr017_deployment_is_sized_for_one_small_clinic():
    """[NFR-017] The system's target operating scale (roughly 10-50 doctors and a few
    thousand registered patients) is declared in the committed requirements."""
    requirements = _read("docs/sdlc/requirements/README.md").lower()
    # Accept either hyphen or en-dash between the doctor bounds.
    assert re.search(r"10\s*[-–]\s*50\s*doctors", requirements), (
        "sizing target (10-50 doctors) must be declared"
    )
    assert "few thousand" in requirements and "patient" in requirements, (
        "sizing target (a few thousand registered patients) must be declared"
    )
