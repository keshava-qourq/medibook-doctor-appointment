# Tests

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start summary -->
231 tests · Passed 209 · Failed 0 · Skipped 22 · Not run 0

Acceptance criteria covered: 37/129 · passing: 32/129
<!-- sdlc:auto:end summary -->

<!-- sdlc:auto:start tests -->
## Sprint 1

### US-001: Patient self-registration with email and password

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-005 | auth wiring > [AC-005] sign-in stores the token and goes to the landing from the API | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-006 | auth wiring > [AC-006] a failed sign-in shows the API message and stores no token | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-007 | auth wiring > [AC-007] sign out calls logout, clears the token and returns to sign-in | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-008 | auth wiring > [AC-008] a 401 from the API clears the token and routes to sign-in | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-014 | auth wiring > [AC-014] a patient is redirected away from the admin console | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-017 | auth wiring > [AC-017] an unauthenticated visitor to a protected route is sent to sign-in | Unit | Passed | `frontend/src/App.test.tsx` |
| AC-010 | AdminUsers > [AC-010] a 403 shows an access message | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-010 | AdminUsers > [AC-010] deactivate toggle sends PATCH | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-010 | AdminUsers > [AC-010] lists users and shows the initial password once after create | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-011 | AdminUsers > [AC-011] reset password confirms sessions are invalid | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-012 | AdminUsers > [AC-012] 409 shows inline message and keeps typed values | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-012 | AdminUsers > [AC-012] 422 field errors render inline | Unit | Passed | `frontend/src/screens/AdminUsers.test.tsx` |
| AC-001 | Register > [AC-001] stores the token and navigates to the landing path | Unit | Passed | `frontend/src/screens/Register.test.tsx` |
| AC-002 | Register > [AC-002] shows email already registered on 409 and keeps the form | Unit | Passed | `frontend/src/screens/Register.test.tsx` |
| AC-003 | Register > [AC-003] flags empty, malformed and short fields client-side without calling the API | Unit | Passed | `frontend/src/screens/Register.test.tsx` |
| AC-003 | Register > [AC-003] shows server 422 field errors inline and preserves values | Unit | Passed | `frontend/src/screens/Register.test.tsx` |
| AC-001 | SignIn register tab > [AC-001] register tab calls the API, stores the token and navigates to the landing | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-002 | SignIn register tab > [AC-002] register tab shows email already registered on 409 and does not navigate | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-003 | SignIn register tab > [AC-003] register tab flags invalid fields client-side without calling the API | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-003 | SignIn register tab > [AC-003] register tab shows server 422 field errors inline and preserves values | Unit | Passed | `frontend/src/screens/SignIn.test.tsx` |
| AC-010 | test_ac010_accepts_contract_initial_password_field | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-010 | test_ac010_creates_active_account_hashed_password_and_echoes_initial_password[admin] | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-010 | test_ac010_creates_active_account_hashed_password_and_echoes_initial_password[doctor] | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-011 | test_ac011_accepts_contract_new_password_field | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-011 | test_ac011_new_password_replaces_old_and_revokes_every_session | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-011 | test_ac011_password_reset_missing_user_is_404_empty_body_and_weak_is_422 | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-011 | test_ac011_weak_reset_422_is_keyed_by_field_name_and_writes_nothing | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-012 | test_ac012_duplicate_email_case_insensitive_is_409_and_creates_nothing | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-013 | test_ac013_non_admin_caller_gets_403_empty_body_and_creates_nothing | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| AC-013 | test_ac013_unauthenticated_caller_gets_401 | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| — | test_ac_list_users_paginates_and_never_returns_passwords | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| — | test_ac_list_users_rejects_non_admin_with_403_empty_body | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| — | test_ac_patch_deactivation_revokes_all_sessions_and_returns_user | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| — | test_ac_patch_missing_user_returns_404_empty_body | Integration | Passed | `backend/tests/unit/test_admin_users.py` |
| — | test_ac_deactivated_user_rejected_401 | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_expired_session_rejected_401_no_www_authenticate | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_hashing_round_trip_verifies_correct_and_rejects_wrong | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_idle_window_slides_forward_on_each_authenticated_call | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_malformed_or_missing_token_rejected_401 | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_ownership_guard_allows_owner | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_ownership_guard_rejects_nonexistent_resource_same_as_other_owner | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_ownership_guard_rejects_other_owner_with_empty_body | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_require_role_allows_matching_role | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_require_role_rejects_mismatch_with_empty_body | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_revoked_session_rejected_401 | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_seed_startup_users_creates_admin_and_patient_when_configured | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_seed_startup_users_idempotent_and_seeds_nothing_when_unset | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_session_stores_only_token_hash_not_raw_token | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| — | test_ac_weak_password_rejected_under_eight_chars | Integration | Passed | `backend/tests/unit/test_auth_core.py` |
| AC-001, AC-002 | test_ac001_ac002_register_then_duplicate_case_insensitive | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| AC-003 | test_ac003_invalid_fields_listed_by_name | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| AC-005 | test_ac005_login_landing_is_role_specific | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| AC-006, AC-007 | test_ac006_ac007_login_generic_failure_and_logout_revokes_one | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| AC-009 | test_ac009_inactive_login_refused | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| — | test_ac_me_returns_profile_for_valid_token_and_401_without | Integration | Passed | `backend/tests/unit/test_auth_endpoints.py` |
| AC-001 | [AC-001] registers a new patient and lands on the doctor search screen | E2E | Passed | `frontend/e2e/registration.spec.ts` |
| AC-002 | [AC-002] duplicate email registration shows the already-registered message and creates no second account | E2E | Passed | `frontend/e2e/registration.spec.ts` |
| AC-003, NFR-022 | [AC-003][NFR-022] invalid registration input is flagged inline per field and preserves typed values | E2E | Passed | `frontend/e2e/registration.spec.ts` |
| AC-004, NFR-014 | [AC-004][NFR-014] a rejected registration leaves no usable account, so the same email can be newly registered once the details are valid | E2E | Passed | `frontend/e2e/registration.spec.ts` |
| AC-007 | [AC-007] sign-out ends the session and the back button does not show cached protected content | E2E | Skipped | `frontend/e2e/session.spec.ts` |
| AC-009 | [AC-009] a deactivated account is forced back to sign-in and refused re-login with an inactive message | E2E | Skipped | `frontend/e2e/session.spec.ts` |
| NFR-002 | [NFR-002] an administrator password reset revokes the user's current session | E2E | Skipped | `frontend/e2e/session.spec.ts` |
| NFR-003 | [NFR-003] a patient cannot reach the admin console | E2E | Skipped | `frontend/e2e/session.spec.ts` |
| NFR-003 | [NFR-003] an unauthenticated visitor to a protected route is sent to sign-in | E2E | Skipped | `frontend/e2e/session.spec.ts` |
| AC-005 | [AC-005] admin sign-in reaches the admin dashboard | E2E | Passed | `frontend/e2e/sign-in.spec.ts` |
| AC-005 | [AC-005] doctor sign-in reaches their schedule | E2E | Passed | `frontend/e2e/sign-in.spec.ts` |
| AC-005 | [AC-005] patient sign-in reaches the doctor search screen | E2E | Passed | `frontend/e2e/sign-in.spec.ts` |
| AC-006, NFR-004 | [AC-006][NFR-004] a wrong password shows one generic message and creates no session | E2E | Passed | `frontend/e2e/sign-in.spec.ts` |
| — | [seed] the seeded admin and smoke patient can sign in with their fixed credentials | E2E | Passed | `frontend/e2e/sign-in.spec.ts` |

### US-002: Sign in, sign out and session expiry

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-008 | test_ac008_last_seen_and_expires_slide_forward_on_each_authenticated_call | Integration | Passed | `backend/tests/unit/test_auth_idle_timeout.py` |
| AC-008 | test_ac008_request_after_idle_timeout_rejected_401_requires_relogin | Integration | Passed | `backend/tests/unit/test_auth_idle_timeout.py` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/nfr-infrastructure.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/nfr-infrastructure.spec.ts` |
| AC-007, NFR-002 | [AC-007][NFR-002] sign-out ends the session and the back button does not show cached protected content | E2E | Passed | `frontend/e2e/session-lifecycle.spec.ts` |
| AC-008, NFR-002 | [AC-008][NFR-002] a signed-in session ends after the configured period of inactivity | E2E | Skipped | `frontend/e2e/session-lifecycle.spec.ts` |
| AC-009, NFR-002 | [AC-009][NFR-002] a deactivated account is forced back to sign-in and refused re-login as inactive | E2E | Passed | `frontend/e2e/session-lifecycle.spec.ts` |
| NFR-002 | [NFR-002] an administrator password reset revokes the user's current session | E2E | Passed | `frontend/e2e/session-lifecycle.spec.ts` |

### US-003: Administrator creates doctor and administrator accounts

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-010 | test_ac010_admin_can_create_another_admin | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-010 | test_ac010_admin_creates_doctor_password_echoed_once_and_doctor_can_sign_in | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-011 | test_ac011_reissued_password_replaces_old_and_revokes_sessions | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-011 | test_ac011_weak_reissued_password_is_rejected | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-012 | test_ac012_duplicate_email_case_insensitive_is_409_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-013 | test_ac013_non_admin_create_is_403_empty_body_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| AC-013 | test_ac013_unauthenticated_create_is_401_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-001 | test_nfr001_admin_issued_password_stored_only_as_bcrypt_hash | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-001 | test_nfr001_reissued_password_stored_only_as_bcrypt_hash | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-001 | test_nfr001_self_registration_password_stored_only_as_bcrypt_hash | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-002 | test_nfr002_deactivation_revokes_sessions_and_blocks_further_action | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-022 | test_nfr022_invalid_create_is_422_lists_offending_fields_and_writes_nothing | Integration | Passed | `backend/tests/integration/test_admin_user_acceptance.py` |
| NFR-016 | test_nfr016_clinic_database_declares_automated_backups_and_pitr | Integration | Passed | `backend/tests/integration/test_nfr_infrastructure.py` |
| NFR-017 | test_nfr017_deployment_is_sized_for_one_small_clinic | Integration | Passed | `backend/tests/integration/test_nfr_infrastructure.py` |

### US-004: Role-based access enforcement across every screen and API call

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-014, AC-016 | test_ac014_ac016_role_and_ownership_failures_are_identical_403_empty_bodies | Integration | Passed | `backend/tests/integration/test_role_ownership_acceptance.py` |
| AC-014 | test_ac014_patient_calling_admin_api_is_403_empty_body | Integration | Passed | `backend/tests/integration/test_role_ownership_acceptance.py` |
| AC-015 | test_ac015_patient_cannot_read_another_patients_record_is_403_empty_body | Integration | Passed | `backend/tests/integration/test_role_ownership_acceptance.py` |
| AC-016 | test_ac016_doctor_cannot_read_another_doctors_record_is_403_empty_body | Integration | Passed | `backend/tests/integration/test_role_ownership_acceptance.py` |
| AC-017 | test_ac017_no_token_api_call_is_401_with_detail_body | Integration | Passed | `backend/tests/integration/test_role_ownership_acceptance.py` |
| AC-014, NFR-003 | [AC-014][NFR-003] a doctor visiting the admin URL directly is denied the admin screen | E2E | Passed | `frontend/e2e/role-access.spec.ts` |
| AC-014, NFR-003 | [AC-014][NFR-003] a patient visiting a doctor URL directly is denied the doctor screen | E2E | Passed | `frontend/e2e/role-access.spec.ts` |
| AC-014, NFR-003 | [AC-014][NFR-003] a patient visiting an admin URL directly is denied the admin screen | E2E | Passed | `frontend/e2e/role-access.spec.ts` |
| AC-017 | [AC-017] a no-token API call returns 401 and does not leak data | E2E | Passed | `frontend/e2e/role-access.spec.ts` |
| AC-017, NFR-003 | [AC-017][NFR-003] an unauthenticated visitor to a protected route is redirected to sign-in | E2E | Passed | `frontend/e2e/role-access.spec.ts` |

## Sprint 2

### US-005: Patient manages their own profile

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-018 | test_ac018_patient_reads_own_profile_fields | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-018 | test_ac018_reading_profile_without_a_token_is_401 | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-019 | test_ac019_update_profile_persists_and_is_reflected_on_fresh_get | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-020 | test_ac020_password_change_succeeds_old_fails_new_logs_in | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-020 | test_ac020_weak_new_password_is_rejected_422_and_original_still_logs_in | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-021 | test_ac021_wrong_current_password_rejected_and_original_still_logs_in | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| NFR-001 | test_nfr001_changed_password_stored_only_as_bcrypt_hash | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| NFR-022 | test_nfr022_invalid_profile_update_is_422_keyed_by_field_and_writes_nothing | Integration | Passed | `backend/tests/integration/test_patient_profile_acceptance.py` |
| AC-018 | test_ac018_get_me_returns_profile_fields | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-018 | test_ac018_get_me_without_token_is_401 | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-019 | test_ac019_patch_me_does_not_mutate_email | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-019 | test_ac019_patch_me_updates_fields_and_persists | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-020 | test_ac020_new_hash_is_bcrypt_and_not_plaintext | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-020 | test_ac020_password_change_with_correct_current_replaces_hash | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-021 | test_ac021_wrong_current_password_is_422_field_and_writes_nothing | Integration | Passed | `backend/tests/unit/test_patients.py` |
| NFR-022 | test_nfr022_invalid_patch_lists_offending_field_and_writes_nothing | Integration | Passed | `backend/tests/unit/test_patients.py` |
| — | test_non_patient_role_is_403_empty_body | Integration | Passed | `backend/tests/unit/test_patients.py` |
| — | test_weak_new_password_is_422_weak_password | Integration | Passed | `backend/tests/unit/test_patients.py` |
| AC-018 | [AC-018] a registered, signed-in patient reads their stored profile fields | E2E | Passed | `frontend/e2e/patient-profile.spec.ts` |
| AC-019 | [AC-019] updating name/phone/dob/gender persists and is reflected on a fresh GET | E2E | Passed | `frontend/e2e/patient-profile.spec.ts` |
| AC-020 | [AC-020] changing password with correct current + valid new succeeds; old fails, new logs in | E2E | Passed | `frontend/e2e/patient-profile.spec.ts` |
| AC-021 | [AC-021] a wrong current password is rejected and the original password still logs in | E2E | Passed | `frontend/e2e/patient-profile.spec.ts` |

### US-006: Manage the clinic's specializations

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-022 | test_ac022_admin_creates_specialization_and_it_appears_in_the_list | Integration | Passed | `backend/tests/integration/test_specialization_acceptance.py` |
| AC-023 | test_ac023_duplicate_name_case_insensitive_is_409_and_creates_nothing | Integration | Passed | `backend/tests/integration/test_specialization_acceptance.py` |
| AC-024 | test_ac024_delete_referenced_is_refused_with_counts_then_deactivation_succeeds | Integration | Passed | `backend/tests/integration/test_specialization_acceptance.py` |
| AC-025 | test_ac025_deactivated_drops_from_active_listing_but_references_remain_viewable | Integration | Passed | `backend/tests/integration/test_specialization_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_specialization_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_specialization_acceptance.py` |
| NFR-026 | test_nfr026_deactivated_specialization_and_its_references_are_preserved_not_deleted | Integration | Passed | `backend/tests/integration/test_specialization_acceptance.py` |
| AC-022 | test_ac022_create_saves_and_appears_in_listing | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-022 | test_ac022_create_without_description_saves | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-023 | test_ac023_case_insensitive_duplicate_is_409_and_writes_nothing | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-024 | test_ac024_catalog_term_maps_specialization_and_is_listed | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-024 | test_ac024_delete_missing_is_404_empty_body | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-024 | test_ac024_delete_referenced_is_409_with_counts_and_deactivation_allowed | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-024 | test_ac024_delete_unreferenced_is_204 | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-025 | test_ac025_deactivated_excluded_from_active_listing | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-025 | test_ac025_mapping_survives_specialization_deactivation | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_catalog_terms_require_admin_role | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_create_requires_admin_role | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_list_returns_items_total_and_paginates | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_listing_requires_authentication | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_name_stored_as_given | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_patch_missing_is_404_empty_body | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| — | test_patch_rename_to_existing_is_409 | Integration | Passed | `backend/tests/unit/test_specializations.py` |
| AC-022 | [AC-022] an admin creates a specialization and it appears in the list | E2E | Passed | `frontend/e2e/specializations.spec.ts` |
| AC-023 | [AC-023] a duplicate name (case-insensitive) is rejected 409 duplicate_name and no second row is written | E2E | Passed | `frontend/e2e/specializations.spec.ts` |
| AC-024, NFR-026 | [AC-024][NFR-026] deleting a referenced specialization is refused with counts, and deactivation succeeds instead | E2E | Passed | `frontend/e2e/specializations.spec.ts` |
| AC-025, NFR-026 | [AC-025][NFR-026] a deactivated specialization drops from active listing while prior references remain viewable | E2E | Passed | `frontend/e2e/specializations.spec.ts` |

### US-008: Configure clinic timezone and booking cutoff

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-030 | test_ac030_admin_saves_timezone_and_get_reflects_it_confirmed | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| AC-030 | test_ac030_non_admin_cannot_write_settings_is_403_empty_body | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| AC-031 | test_ac031_cutoff_change_is_returned_immediately | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| AC-032 | test_ac032_invalid_cutoff_is_422_and_prior_value_unchanged | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| AC-033 | test_ac033_default_state_is_utc_unconfirmed | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_settings_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_settings_acceptance.py` |
| NFR-020 | test_nfr020_timezone_is_labelled_in_the_settings_payload | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| NFR-022 | test_nfr022_invalid_settings_save_is_422_keyed_by_field_and_writes_nothing | Integration | Passed | `backend/tests/integration/test_settings_acceptance.py` |
| AC-030 | test_ac030_put_valid_timezone_saves_confirms_and_is_read_back | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-030 | test_ac030_unknown_timezone_is_422_and_nothing_written | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-031 | test_ac031_booking_cutoff_takes_effect_immediately | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-032 | test_ac032_negative_cutoff_is_422_and_previous_cutoff_stays | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-032 | test_ac032_non_numeric_cutoff_is_422_and_previous_cutoff_stays | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-033 | test_ac033_defaults_to_utc_unconfirmed_before_any_save | Integration | Passed | `backend/tests/unit/test_settings.py` |
| — | test_get_settings_requires_authentication | Integration | Passed | `backend/tests/unit/test_settings.py` |
| — | test_put_settings_requires_admin_role | Integration | Passed | `backend/tests/unit/test_settings.py` |
| — | test_put_settings_requires_authentication | Integration | Passed | `backend/tests/unit/test_settings.py` |
| AC-030 | [AC-030] an admin saves a timezone and GET /api/settings reflects it with timezone_confirmed=true | E2E | Passed | `frontend/e2e/clinic-settings.spec.ts` |
| AC-031 | [AC-031] changing booking_cutoff_hours returns the new value immediately | E2E | Passed | `frontend/e2e/clinic-settings.spec.ts` |
| AC-032, NFR-022 | [AC-032][NFR-022] a negative or non-numeric cutoff is rejected 422 and the prior value is unchanged | E2E | Passed | `frontend/e2e/clinic-settings.spec.ts` |
| AC-033 | [AC-033] the default state before any save is timezone=UTC with timezone_confirmed=false | E2E | Passed | `frontend/e2e/clinic-settings.spec.ts` |

### US-010: Administrator edits the disease-to-specialization mapping

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-037 | test_ac037_new_term_resolves_to_its_linked_specializations | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-038 | test_ac038_editing_a_term_to_remove_all_specializations_is_rejected | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-038 | test_ac038_term_without_specialization_is_rejected_422_specialization_required | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-039 | test_ac039_term_mapped_to_two_specializations_returns_doctors_from_both | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-040 | test_ac040_deleted_term_disappears_from_suggest_and_no_longer_resolves | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-040, NFR-026 | test_ac040_nfr026_deleting_a_term_is_soft_and_history_remains_viewable | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| NFR-012 | test_nfr012_suggest_is_deterministic_substring_not_fuzzy | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| NFR-012 | test_nfr012_unknown_term_resolves_to_no_match_never_invented | Integration | Passed | `backend/tests/integration/test_catalog_search_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_catalog_search_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_catalog_search_acceptance.py` |
| AC-037 | test_ac037_create_saves_and_resolves_to_specializations | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| AC-038 | test_ac038_empty_specialization_list_is_422_keyed_on_field | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| AC-040 | test_ac040_delete_missing_is_404_empty_body | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| AC-040 | test_ac040_delete_soft_deletes_and_term_stops_resolving_and_suggesting | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_catalog_terms_require_admin_role | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_create_links_only_active_specializations | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_duplicate_term_case_insensitive_is_409 | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_list_returns_items_total_and_paginates | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_put_missing_is_404_empty_body | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_put_updates_specializations_and_empty_list_is_422 | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_suggest_matches_case_insensitive_substring | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_suggest_requires_authentication | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| — | test_suggest_returns_empty_for_short_query | Integration | Passed | `backend/tests/unit/test_catalog.py` |
| AC-039 | test_ac039_linking_doctor_lets_search_resolve_to_it | Integration | Passed | `backend/tests/unit/test_doctors.py` |
| — | test_relinking_doctor_replaces_prior_specializations | Integration | Passed | `backend/tests/unit/test_doctors.py` |
| — | test_update_missing_doctor_is_404_empty_body | Integration | Passed | `backend/tests/unit/test_doctors.py` |
| — | test_update_requires_admin_role | Integration | Passed | `backend/tests/unit/test_doctors.py` |
| AC-039 | test_ac039_term_mapped_to_two_specializations_returns_doctors_from_both | Integration | Passed | `backend/tests/unit/test_search.py` |
| AC-040 | test_ac040_deleted_term_no_longer_resolves | Integration | Passed | `backend/tests/unit/test_search.py` |
| — | test_deactivated_specialization_is_excluded_from_results | Integration | Passed | `backend/tests/unit/test_search.py` |
| — | test_inactive_doctor_is_excluded_from_results | Integration | Passed | `backend/tests/unit/test_search.py` |
| NFR-012 | test_nfr012_unknown_term_resolves_to_no_match | Integration | Passed | `backend/tests/unit/test_search.py` |
| — | test_results_paginated_items_total | Integration | Passed | `backend/tests/unit/test_search.py` |
| — | test_search_requires_authentication | Integration | Passed | `backend/tests/unit/test_search.py` |
| AC-037 | [AC-037] an admin adds a term linked to active specializations and a patient search immediately resolves to them | E2E | Passed | `frontend/e2e/catalog-search.spec.ts` |
| AC-038, NFR-022 | [AC-038][NFR-022] saving a term with no specialization is rejected with the required-specialization message | E2E | Passed | `frontend/e2e/catalog-search.spec.ts` |
| AC-039 | [AC-039] a term mapped to two specializations returns active doctors from both | E2E | Passed | `frontend/e2e/catalog-search.spec.ts` |
| AC-040, NFR-026 | [AC-040][NFR-026] a deleted term disappears from suggest and no longer resolves, while prior references are untouched | E2E | Passed | `frontend/e2e/catalog-search.spec.ts` |
| NFR-012 | [NFR-012] resolution is deterministic text matching: a misspelling is not fuzzy-matched and an unknown term is never invented | E2E | Passed | `frontend/e2e/catalog-search.spec.ts` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/catalog-search.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/catalog-search.spec.ts` |

### US-031: Health data protected in transit and at rest

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-122, NFR-005 | test_ac122_nfr005_deployment_declares_tls_in_transit_with_http_redirected_to_https | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-123, NFR-006 | test_ac123_nfr006_deployment_declares_encryption_at_rest_for_the_clinic_database | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-124, NFR-001 | test_ac124_nfr001_stored_user_records_hold_only_bcrypt_hashes_for_every_path | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-124 | test_ac124_no_read_endpoint_returns_password_material | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-125, NFR-007 | test_ac125_nfr007_a_server_side_failure_does_not_echo_the_request_credentials | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-125, NFR-007 | test_ac125_nfr007_clinical_content_never_appears_in_an_error_or_log | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-125, NFR-007 | test_ac125_nfr007_triggered_errors_leak_no_password_or_token_in_body_or_logs | Integration | Passed | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_health_data_protection_acceptance.py` |
| AC-122, NFR-005 | [AC-122][NFR-005] all application traffic travels over TLS and an unencrypted request is redirected to HTTPS | E2E | Skipped | `frontend/e2e/health-data-protection.spec.ts` |
| AC-123, NFR-006 | [AC-123][NFR-006] patient, appointment and consultation data is held in a database with encryption at rest enabled | E2E | Skipped | `frontend/e2e/health-data-protection.spec.ts` |
| AC-125, NFR-007 | [AC-125][NFR-007] a failed sign-in shows a generic message on screen and never echoes the password | E2E | Passed | `frontend/e2e/health-data-protection.spec.ts` |
| AC-125, NFR-007 | [AC-125][NFR-007] a refused API call returns no credential or clinical content in its body | E2E | Passed | `frontend/e2e/health-data-protection.spec.ts` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/health-data-protection.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/health-data-protection.spec.ts` |

## Project setup

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_health_reports_ok | Integration | Passed | `backend/tests/integration/test_health.py` |
| — | test_the_openapi_document_builds | Integration | Passed | `backend/tests/integration/test_health.py` |
| — | the app loads | E2E | Passed | `frontend/e2e/example.spec.ts` |
<!-- sdlc:auto:end tests -->
