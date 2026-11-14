# API Reference

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start endpoints -->
| Method | Path | Handler | Source | Summary |
|---|---|---|---|---|
| GET | /admin-only | admin_only | `backend/tests/unit/test_auth_core.py:64` | — |
| PUT | /api/admin/doctors/{doctor_id} | update_doctor | `backend/app/routers/doctors.py:32` | — |
| GET | /api/admin/users | list_users | `backend/app/routers/admin_users.py:123` | — |
| POST | /api/admin/users | create_user | `backend/app/routers/admin_users.py:64` | — |
| PATCH | /api/admin/users/{user_id} | update_user | `backend/app/routers/admin_users.py:135` | — |
| POST | /api/admin/users/{user_id}/password | reset_password | `backend/app/routers/admin_users.py:162` | — |
| GET | /api/appointments/{id} | read_appointment | `backend/app/routers/appointments.py:21` | Read one appointment the caller owns; 403 empty body otherwise. |
| POST | /api/auth/login | login | `backend/app/routers/auth.py:101` | Authenticate and open an additional session (AC-005, AC-006, AC-009). |
| POST | /api/auth/logout | logout | `backend/app/routers/auth.py:114` | — |
| GET | /api/auth/me | me | `backend/app/routers/auth.py:134` | The signed-in user's own profile. |
| POST | /api/auth/register | register | `backend/app/routers/auth.py:67` | Create a patient account and open its first session (AC-001). |
| GET | /api/consultations/{id} | read_consultation | `backend/app/routers/appointments.py:29` | Read one consultation the caller owns; 403 empty body otherwise. |
| GET | /api/patients/me | read_me | `backend/app/routers/patients.py:34` | — |
| PATCH | /api/patients/me | update_me | `backend/app/routers/patients.py:39` | — |
| POST | /api/patients/me/password | change_password | `backend/app/routers/patients.py:54` | — |
| GET | /api/search/doctors | search_doctors | `backend/app/routers/search.py:35` | — |
| GET | /health | health | `backend/app/main.py:143` | Liveness probe reporting the configured backing services. |
| GET | /owned-missing | owned_missing | `backend/tests/unit/test_auth_core.py:73` | — |
| GET | /owned/{owner_id} | owned | `backend/tests/unit/test_auth_core.py:68` | — |
| GET | /whoami | whoami | `backend/tests/unit/test_auth_core.py:58` | — |
| GET | /whoami | whoami | `backend/tests/unit/test_auth_idle_timeout.py:55` | — |
<!-- sdlc:auto:end endpoints -->

<!-- sdlc:auto:start drift -->
**Designed but missing:**

- DELETE /api/admin/catalog-terms/{id}
- DELETE /api/admin/specializations/{id}
- DELETE /api/doctors/me/exceptions/{id}
- GET /api/admin/audit-log
- GET /api/admin/catalog-terms
- GET /api/appointments
- GET /api/catalog/suggest
- GET /api/consultations
- GET /api/doctors
- GET /api/doctors/me/exceptions
- GET /api/doctors/me/weekly-availability
- GET /api/doctors/{doctor_id}
- GET /api/doctors/{doctor_id}/availability
- GET /api/settings
- GET /api/specializations
- PATCH /api/admin/specializations/{id}
- PATCH /api/appointments/{id}/status
- POST /api/admin/catalog-terms
- POST /api/admin/specializations
- POST /api/appointments
- POST /api/appointments/{id}/cancel
- POST /api/appointments/{id}/consultation
- POST /api/appointments/{id}/reschedule
- POST /api/doctors/me/exceptions
- PUT /api/admin/catalog-terms/{id}
- PUT /api/admin/settings
- PUT /api/consultations/{id}
- PUT /api/doctors/me/weekly-availability

**Code only:**

- GET /admin-only
- GET /owned-missing
- GET /owned/{owner_id}
- GET /whoami
<!-- sdlc:auto:end drift -->

<!-- sdlc:auto:start source -->
Generated from commit `73e2af9`
<!-- sdlc:auto:end source -->
