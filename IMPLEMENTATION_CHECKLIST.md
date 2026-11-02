# Implementation checklist

This checklist is intentionally phase-ordered. A box is checked only after
the behavior has been implemented and verified; documentation alone does not
count as completion.

## Phase 1 — Documentation and data security

- [x] Record the existing architecture, model relationships, intended
  isolation policy, and affected business rules in `PROJECT.md`.
- [x] Record architectural and business-rule decisions in `DECISIONS.md`.
- [x] Define `role="superadmin"` as the authorization source; the legacy
  `is_superadmin` flag does not grant cross-school access.
- [x] Make production configuration fail closed for missing secrets/database
  settings and enable secure session/CSRF cookies outside debug mode.
- [x] Enforce authentication and valid school/profile identity centrally for
  application views; restrict Django admin to staff superadmins.
- [x] Use the fail-closed scoped-object helper for selected student, class,
  subject, teacher, school-structure, enrollment, teacher-assignment, user,
  and academic-record detail/edit/delete routes.
- [x] Reject invalid foreign-school form, learning-area, department, and
  school academic-year/term selections in the modified create/edit workflows.
- [x] Add HTTP tests for cross-school reads and invalid relationship
  submissions in the covered management endpoints.
- [x] Scope quiz result, print, export, and grading workflows to the user's
  school; retain teacher ownership limits while allowing school admins without
  teacher profiles.
- [x] Require a student to have a current same-school class assignment to the
  quiz before viewing or starting it, and ignore cross-school class records.
- [x] Reject invalid or foreign-school class and term selections when creating
  or editing quizzes instead of silently dropping them.
- [x] Allow school admins to manage questions, imports, and quiz-class
  assignments across their school without a teacher profile; keep teachers
  restricted to their own quizzes.
- [x] Reject mixed/foreign quiz question and class IDs in bulk deletion,
  reordering, and unassignment operations.
- [x] Scope dashboard attempt and grading aggregates by attempt, quiz,
  student, and question school associations.
- [x] Require active target schools for superadmin-created students,
  teachers, classes, subjects, academic years, forms, learning areas,
  departments, terms (via the selected academic year), and student/teacher
  imports; use the existing record or selected parent class as the target for
  supported edits and relationship writes.
- [x] Restrict user role creation to authorized roles and require school
  association for non-superadmin accounts; scope bulk deletion and password
  reset requests to one explicit target school for superadmins.
- [x] Apply fail-closed query/object-level school scoping and role
  authorization to the audited HTML, JSON/AJAX, bulk, import, and export
  endpoint families, including school-consistency filters on student quiz
  results and grading responses.
- [x] Validate submitted foreign keys and relationships against the current
  school, including class/academic-year, enrollment, and teacher-assignment
  relationships.
- [x] Add endpoint-level tests for cross-school access and missing school
  associations on the audited tenant-sensitive endpoint families.
- [ ] Complete an inventory audit of remaining list, bulk, import/export,
  quiz, and related-object endpoints; add tests for any uncovered behavior.

## Phase 2 — School management (in progress)

- [x] Validate student school/form/learning-area relationships; paginate
  lists, prefetch current enrollment data, and track profile audit timestamps.
- [x] Validate teacher school/department relationships; paginate lists,
  optimize department access, and track profile audit timestamps.
- [x] Archive and restore student/teacher profiles without deleting their
  academic records; disable linked accounts and deactivate current
  enrollments/assignments while preserving the account's prior enabled state.
- [ ] Complete historical-protection and consistency review for all student
  and teacher edit/import/delete workflows.
- [x] Enforce positive class capacity and same-school class relationships;
  lock enrollment creation and preserve existing enrollment on failed
  capacity checks.
- [x] Archive and restore classes without deleting history; deactivation
  closes current enrollments and teaching assignments, and restore leaves
  historical relationships inactive.
- [x] Validate subject relationships and archive/restore subjects without
  deleting quiz/allocation history; deactivation closes current teaching
  assignments and restore does not revive them.
- [x] Enforce teacher-subject assignment school/year/allocation validation,
  active uniqueness at the database, reassignment history, and accurate
  partial bulk outcomes.
- [x] Enforce active enrollment uniqueness per school, capacity-safe locked
  enrollment creation, idempotent repeat requests, and history-preserving
  transfers.
- [ ] Define and test any required explicit promotion workflow.

## Phase 3 — Import and export

- [ ] Validated CSV/XLSX student and teacher imports with previews, bounded
  input, row-level errors, transactions, and downloadable error reports.
- [ ] School-scoped CSV/XLSX exports, matching filters and academic year,
  efficient for large datasets and protected against formula injection.
- [ ] Downloadable import templates.

## Phase 4 — Assignments

- [ ] Audit existing allocation and quiz-assignment workflows.
- [ ] Establish whether a separate student-homework workflow exists; implement
  only in a compatible, school-scoped way.
- [ ] Test ownership, visibility, dates, submissions, grading, and unauthorized
  access for applicable workflows.

## Phase 5 — Quiz engine

- [x] Attempt authorization, limits, and safe start/resume.
- [x] Complete server-side timing and atomic/idempotent submission across all
  entry points.
- [x] Enforce quiz expiration on answer-save requests and atomically submit an
  expired attempt before rejecting the late save.
- [x] Apply quiz result/review/answer-key visibility settings to student
  result and print views.
- [x] Complete workflows for every question type exposed to published quizzes.
- [x] Centralized multiple-answer, partial, and negative scoring.
- [x] Per-attempt stable question and answer randomization.
- [x] Consistent result/review/answer-key visibility enforcement.
- [x] Manual-grading authorization and audit history.
- [x] Historical quiz/question configuration snapshots.

## Phase 6 — Testing and stabilization

- [ ] Add meaningful endpoint and persistence tests for all changed behaviors.
- [x] Apply migrations in the isolated test database.
- [x] Run focused tests, then the full automated suite (98 tests passed).
- [ ] Review query performance, regressions, and migration reversibility.
- [ ] Update documentation and report incomplete or unverified requirements.
