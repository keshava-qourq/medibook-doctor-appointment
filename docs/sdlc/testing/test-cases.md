# Tests

> Maintained by QuorQ AI SDLC. Text between `sdlc:auto` markers is regenerated; anything outside them is yours and is kept.

<!-- sdlc:auto:start summary -->
344 tests · Passed 313 · Failed 0 · Skipped 31 · Not run 0

Acceptance criteria covered: 48/129 · passing: 45/129
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
| NFR-003 | [NFR-003] a patient cannot reach the admin console | E2E | Passed | `frontend/e2e/session.spec.ts` |
| NFR-003 | [NFR-003] an unauthenticated visitor to a protected route is sent to sign-in | E2E | Passed | `frontend/e2e/session.spec.ts` |
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

## Sprint 3

### US-002: Sign in, sign out and session expiry

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-005 | test_ac005_each_role_logs_in_and_gets_its_role_specific_landing | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| AC-006, NFR-004 | test_ac006_nfr004_wrong_password_and_unknown_email_are_byte_identical_401 | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| AC-007, NFR-002 | test_ac007_nfr002_logout_revokes_only_the_callers_token | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| AC-008 | test_ac008_each_authenticated_call_slides_the_idle_window_forward | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| AC-008, NFR-002 | test_ac008_nfr002_session_past_idle_window_is_401_and_relogin_is_required | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| AC-009, NFR-002 | test_ac009_nfr002_deactivated_user_token_is_rejected_and_relogin_is_refused | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| NFR-002 | test_nfr002_admin_password_reset_ends_every_session_the_account_holds | Integration | Passed | `backend/tests/integration/test_session_auth_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_session_auth_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_session_auth_acceptance.py` |

### US-005: Patient manages their own profile

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-018 | My Profile routing > [AC-018] /my-profile renders My Profile for a signed-in patient | Unit | Passed | `frontend/src/AppProfileRoute.test.tsx` |
| AC-018 | My Profile routing > [AC-018] /profile renders My Profile for a signed-in patient | Unit | Passed | `frontend/src/AppProfileRoute.test.tsx` |
| AC-018 | Profile > [AC-018] shows an error state when the profile cannot be loaded | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-018 | Profile > [AC-018] shows the loading state then the stored profile with a read-only email | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-019 | Profile > [AC-019] a 422 naming no known field falls back to a general message | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-019 | Profile > [AC-019] saving PATCHes the profile and confirms on screen | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-020 | Profile > [AC-020] a successful password change posts both fields and confirms on screen | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-021 | Profile > [AC-021] a 422 shows the message against current_password and keeps what was typed | Unit | Passed | `frontend/src/screens/Profile.test.tsx` |
| AC-018 | test_ac018_registered_patient_reads_back_exactly_the_registration_fields | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-018 | test_ac018_unauthenticated_profile_read_is_401 | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-019 | test_ac019_a_partial_update_leaves_the_untouched_fields_in_force | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-019 | test_ac019_update_persists_and_is_reflected_on_a_fresh_get_in_a_new_request | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-019 | test_ac019_update_without_a_token_is_401_and_writes_nothing | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-020 | test_ac020_a_new_password_under_eight_characters_is_refused_and_the_old_one_still_works | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-020 | test_ac020_after_a_password_change_the_old_password_fails_and_the_new_one_succeeds | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-020 | test_ac020_password_change_without_a_token_is_401 | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-021 | test_ac021_a_wrong_current_password_is_refused_and_the_original_still_logs_in | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-021 | test_ac021_repeated_wrong_attempts_do_not_change_the_stored_password | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| NFR-001 | test_nfr001_changed_password_is_stored_only_as_a_bcrypt_hash_and_is_in_no_response_body | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| NFR-022 | test_nfr022_a_rejected_password_change_names_the_field_and_keeps_the_saved_password | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| NFR-022 | test_nfr022_invalid_profile_update_is_422_keyed_by_field_and_writes_nothing | Integration | Passed | `backend/tests/integration/test_patient_self_service_acceptance.py` |
| AC-018 | [AC-018] a signed-in patient opens My Profile and sees their stored name, email, phone, date of birth and gender | E2E | Passed | `frontend/e2e/patient-profile-ui.spec.ts` |
| AC-019 | [AC-019] editing name, phone, date of birth and gender and saving shows a confirmation, and re-navigating shows the new values | E2E | Passed | `frontend/e2e/patient-profile-ui.spec.ts` |
| AC-020 | [AC-020] a patient changes their password on screen; the old one no longer signs in and the new one does | E2E | Passed | `frontend/e2e/patient-profile-ui.spec.ts` |
| AC-021, NFR-022 | [AC-021][NFR-022] a wrong current password is rejected inline on current_password, the typed values stay, and the original password still signs in | E2E | Passed | `frontend/e2e/patient-profile-ui.spec.ts` |
| NFR-001 | [NFR-001] a password typed on My Profile is never echoed back by the API or shown on screen | E2E | Passed | `frontend/e2e/patient-profile-ui.spec.ts` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/patient-profile-ui.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/patient-profile-ui.spec.ts` |

### US-009: Seeded disease and symptom catalogue available at launch

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-010 | Admin catalogue > [AC-010] the accounts panel is the live one only, with a single create-account form | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-010 | Admin catalogue > [AC-010] the section tabs still select and the doctor profile form still edits | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-034 | Admin catalogue > [AC-034] a failing catalogue load shows a load error | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-034 | Admin catalogue > [AC-034] lists the catalogue terms the API returns, not sample rows | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-035 | Admin catalogue > [AC-035] editing a term loads it into the form and saves it with PUT | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-037 | Admin catalogue > [AC-037] a duplicate term is reported as already in the catalogue | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-037 | Admin catalogue > [AC-037] adding a term posts it and reloads the catalogue | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-038 | Admin catalogue > [AC-038] a term with no specialization is refused before any request | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-040 | Admin catalogue > [AC-040] a failed delete says nothing was changed | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-040 | Admin catalogue > [AC-040] cancelling a delete leaves the term alone | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-040 | Admin catalogue > [AC-040] deleting a term confirms, calls DELETE and reloads | Unit | Passed | `frontend/src/screens/Admin.test.tsx` |
| AC-034 | test_ac034_every_documented_seed_term_suggests_and_resolves_to_a_specialization | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-034 | test_ac034_suggest_matches_a_seeded_term_case_insensitively_by_substring | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-035 | test_ac035_a_seeded_entry_is_editable_and_deletable_like_any_other | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-035 | test_ac035_catalogue_administration_is_refused_to_a_patient | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-035 | test_ac035_seeded_entry_shows_term_type_and_specializations_to_an_administrator | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-036, NFR-024 | test_ac036_nfr024_reseeding_never_takes_over_an_administrator_created_term | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-036, NFR-024 | test_ac036_nfr024_reseeding_preserves_an_edit_and_never_recreates_a_deleted_term | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| NFR-012 | test_nfr012_unknown_term_returns_the_no_match_response_never_an_invented_match | Integration | Passed | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_seed_catalog_acceptance.py` |
| AC-034 | test_ac034_clean_database_seeding_creates_every_documented_term_and_specialization | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-034 | test_ac034_every_seeded_term_resolves_to_at_least_one_specialization_in_search | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-035 | test_ac035_seeded_entries_expose_term_type_and_specializations_and_accept_put_and_delete | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-036, NFR-024 | test_ac036_nfr024_reseeding_does_not_recreate_a_deleted_seeded_term | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-036, NFR-024 | test_ac036_nfr024_reseeding_leaves_an_administrator_edit_intact | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-036, NFR-024 | test_ac036_nfr024_seeding_never_takes_over_an_administrator_created_term | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-036 | test_ac036_running_the_seeder_twice_produces_no_duplicates | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| — | test_seeding_matches_an_existing_specialization_case_insensitively | Integration | Passed | `backend/tests/unit/test_seed_catalog.py` |
| AC-034 | [AC-034] a patient types a term from the seeded catalogue on the search page and sees it suggested | E2E | Passed | `frontend/e2e/seed-catalog.spec.ts` |
| AC-035 | [AC-035] the administrator reviews the seeded catalogue, then edits one entry and deletes another | E2E | Passed | `frontend/e2e/seed-catalog.spec.ts` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/seed-catalog.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/seed-catalog.spec.ts` |

### US-011: Patient searches by disease, symptom or specialization

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| AC-041 | Find a Doctor > [AC-041] one character queries nothing, two or more show the suggestions returned | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-042, AC-045 | Find a Doctor > [AC-042][AC-045] selecting a suggestion lists the doctors with fee and the payable-at-clinic note | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-043 | Find a Doctor > [AC-043] a no_match resolution shows no match found and can browse the specializations | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-044 | Find a Doctor > [AC-044] a failed search shows an explicit error state | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-044 | Find a Doctor > [AC-044] a no_specialist_available resolution explains the clinic has no specialist | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-046 | Find a Doctor > [AC-046] the doctor-name filter narrows the list, is shown and is clearable | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-047 | Find a Doctor > [AC-047] selecting a doctor opens the profile with specializations, qualifications and fee | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-048 | Find a Doctor > [AC-048] a 404 doctor_unavailable says so and returns the patient to the result list | Unit | Passed | `frontend/src/screens/FindADoctor.test.tsx` |
| AC-041, NFR-012 | test_ac041_nfr012_suggest_is_deterministic_case_insensitive_substring_no_fuzzy | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-042 | test_ac042_search_pages_with_limit_and_offset_and_reports_the_unpaged_total | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-042 | test_ac042_term_mapped_to_two_specializations_returns_active_doctors_from_both | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-043, NFR-012 | test_ac043_nfr012_unknown_term_is_no_match_with_no_invented_result | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-044, NFR-023 | test_ac044_nfr023_term_with_no_active_doctor_is_no_specialist_available | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-045, NFR-013 | test_ac045_nfr013_each_result_carries_name_specializations_qualifications_and_fee | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-045, NFR-013 | test_ac045_nfr013_no_endpoint_in_the_search_journey_exposes_a_payment_surface | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-046 | test_ac046_directory_filters_by_specialization_and_name_and_clears | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-047 | test_ac047_doctor_profile_requires_authentication | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-047 | test_ac047_doctor_profile_shows_specializations_qualifications_and_fee | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-048 | test_ac048_deactivated_and_unknown_doctor_are_identical_404_doctor_unavailable | Integration | Passed | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| NFR-016 | test_nfr016_backups_and_pitr_are_infrastructure | Integration | Skipped | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| NFR-017 | test_nfr017_sizing_is_infrastructure | Integration | Skipped | `backend/tests/integration/test_doctor_directory_acceptance.py` |
| AC-041, NFR-012 | test_ac041_nfr012_suggest_returns_terms_and_specializations_by_substring | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-041 | test_ac041_suggest_is_empty_below_two_characters | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-042 | test_ac042_search_returns_doctor_cards_with_qualifications_and_fee | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-043 | test_ac043_unknown_term_is_no_match_with_no_guessed_alternative | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-044 | test_ac044_term_with_no_active_doctor_is_no_specialist_available | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-046 | test_ac046_list_filters_by_specialization_and_name_and_paginates | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-046 | test_ac046_list_requires_authentication | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-046 | test_ac046_list_returns_active_doctors_only | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-047 | test_ac047_read_one_returns_the_full_card_for_an_active_doctor | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-048 | test_ac048_unknown_non_doctor_and_deactivated_are_identical_404 | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| NFR-013 | test_nfr013_no_doctor_endpoint_exposes_a_payment_field | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| — | test_profile_update_stores_qualifications_and_consultation_fee | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| — | test_specializations_listing_remains_available_to_a_patient | Integration | Passed | `backend/tests/unit/test_doctor_directory.py` |
| AC-041, NFR-012 | [AC-041][NFR-012] one character offers no suggestion, two or more offer the catalogue terms | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-042 | [AC-042] selecting a term mapped to two specializations lists the doctors of both | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-043, NFR-012, NFR-023 | [AC-043][NFR-012][NFR-023] an unknown term shows the no-match message and never an invented doctor | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-044, NFR-023 | [AC-044][NFR-023] a term whose specialization has no active doctor shows the no-specialist message, not a blank page | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-045, NFR-013 | [AC-045][NFR-013] each result shows name, specializations, qualifications and fee, and no payment control exists anywhere | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-046 | [AC-046] filtering by specialization and by doctor name narrows the list, the filters are visible, and clearing restores it | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-047 | [AC-047] selecting a doctor opens that doctor's profile with specializations, qualifications and fee | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| AC-048 | [AC-048] a doctor deactivated after the results load shows 'no longer available' and the patient returns to the list | E2E | Passed | `frontend/e2e/doctor-search.spec.ts` |
| NFR-016 | [NFR-016] clinic data is held in a managed database with automated backups and point-in-time recovery | E2E | Skipped | `frontend/e2e/doctor-search.spec.ts` |
| NFR-017 | [NFR-017] the system is sized for one small clinic (10-50 doctors, a few thousand patients) | E2E | Skipped | `frontend/e2e/doctor-search.spec.ts` |

## Project setup

| Criteria | Test | Level | Result | File |
|---|---|---|---|---|
| — | test_health_reports_ok | Integration | Passed | `backend/tests/integration/test_health.py` |
| — | test_the_openapi_document_builds | Integration | Passed | `backend/tests/integration/test_health.py` |
| — | the app loads | E2E | Passed | `frontend/e2e/example.spec.ts` |
<!-- sdlc:auto:end tests -->
