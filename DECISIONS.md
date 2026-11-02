# Decision log

## 2026-11-02 — Preserve the existing Django application

**Decision:** Improve the current Django application in place. Keep its models,
views, templates, PostgreSQL deployment, and existing workflows; do not
replace it with a new application or an assumed React/API architecture.

**Reason:** The repository contains a Django application with template and
JavaScript frontends. A separate React frontend/API application was not
identified during initial inspection.

## 2026-11-02 — Shared-schema tenancy remains school-keyed

**Decision:** Retain the existing shared-database/shared-schema design and make
school scope explicit and fail-closed in authorization, lookup, and submitted
relationship validation. A missing school must never widen a query.

**Reason:** `SchoolInformation` is the current tenant entity and school users
are linked to it through `User.school`. Introducing tenant routing or a new
tenant model would be an unrelated architectural replacement.

## 2026-11-02 — Cross-school access is an explicit superadmin capability

**Decision:** Cross-school access must be deliberate and authorized. A user's
missing school is not evidence of superadmin status. The `role="superadmin"`
value is authoritative for application authorization; the `is_superadmin`
boolean is legacy metadata and does not grant cross-school access.

**Reason:** Treating the role and boolean as interchangeable creates
inconsistent authorization. Existing superadmin login and management views
authorize by role.

## Superadmin writes require an explicit school target

**Decision:** Superadmins may read across schools where a view expressly
allows it. School-specific creates and imports must identify an active target
school. Edits and deletes remain scoped to the selected record's existing
school unless a dedicated transfer workflow is implemented.

**Reason:** A superadmin's missing personal school association must not create
tenantless records or turn an ambiguous write into a cross-school operation.

## 2026-11-02 — Production settings fail closed

**Decision:** `DEBUG` defaults off. Production must explicitly configure
`SECRET_KEY` and a database URL or complete PostgreSQL connection settings.
Secure session and CSRF cookies are enabled when debug mode is off. Local
development may opt into debug mode and receive an ephemeral development key.

**Reason:** A committed fallback key, debug-on default, or implicit local
database credentials must not become production configuration.

## 2026-11-02 — Administrator creation requires a chosen password

**Decision:** Superadmin-created school administrators must be given a
password at creation. Do not silently use a shared or predictable default.

**Reason:** Default credentials make every newly created administrator
account immediately guessable.

## 2026-11-02 — Academic history is retained

**Decision:** Use deactivation/archival and year-specific history instead of
deleting students, teachers, classes, subjects, or assignments that have
academic records. Promotions and transfers create new enrollment history;
teacher reassignment does not overwrite prior-year assignments.

**Reason:** Quiz attempts, responses, enrollments, and assignments are
historical records whose interpretation must survive later changes.

**Archive behavior:** Student and teacher archive actions deactivate the
profile and linked login account, and deactivate current enrollments or
assignments without deleting rows. Restore re-enables the profile and restores
the account's pre-archive enabled state; historical enrollments and
assignments remain inactive and require an explicit new assignment.

Class and subject archive actions retain quiz, allocation, enrollment, and
assignment records. Archiving deactivates current enrollments or teaching
assignments; restoring a class or subject does not reactivate those historical
relationships.

## Teacher-subject allocation is unique per class and year

**Decision:** An active teacher-subject assignment must reference a
same-school subject allocation for the selected class and academic year. Only
one active teacher assignment may exist for a school/subject/class/year
combination; deactivated rows remain available as history.

**Reason:** Application-level duplicate checks alone are vulnerable to
concurrent requests, while assignments outside a class subject allocation
cannot represent a valid teaching responsibility.

## Active student enrollment is unique per school

**Decision:** A student may have at most one active class enrollment per
school. Transfers deactivate the prior enrollment and create a new row;
inactive enrollment rows remain as history.

**Reason:** Capacity-aware application checks must also be protected against
concurrent duplicate enrollment writes without deleting transfer history.

## 2026-11-02 — Class capacity and quiz rules are server-enforced

**Decision:** Capacity, eligibility, timing, attempt limits, answer-save
windows, scoring, and result visibility are backend invariants. Use database
constraints and transactions/locking where they can enforce the invariant
reliably; front-end checks remain presentation only.

**Reason:** Browser behavior cannot protect database integrity or prevent
cross-school access and concurrent-request races.

## 2026-11-02 — Separate allocation, quiz, and homework concepts

**Decision:** Keep teacher-subject-class allocation (`TeacherSubjectAssignment`),
class subject allocation (`ClassSubject`), and quiz class assignment
(`Quiz.classes`) distinct. Do not claim student homework exists as a separate
workflow until the current model and views establish it.

**Reason:** These concepts have different authorization and lifecycle rules.

## 2026-11-02 — Student quiz review follows result settings

**Decision:** A submitted attempt always exposes its score summary to its
student. Detailed per-question review is shown only when both
`show_results_immediately` and `allow_review` are enabled. Correct-answer keys
and explanations are shown only when `show_correct_answers` is enabled.
Student print views enforce the same rules; staff result views remain
unrestricted within their existing school/ownership scope.

**Reason:** The application has no separate result-release workflow. Keeping
the score available avoids indefinitely hiding a result while the review and
answer-key settings prevent premature disclosure.

## 2026-11-02 — Quiz attempts retain their configuration

**Decision:** Capture quiz settings, question text and scoring rules, correct
answers, and randomized question/choice order when an attempt starts. Score
and manually grade the attempt against that persisted configuration, and keep
an append-only grading history on each response.

**Reason:** Editing a published quiz must not silently change the meaning or
score of completed work. Existing attempts created before snapshots were
introduced are populated from the current quiz configuration when first
resumed or otherwise captured; their original configuration cannot be
reconstructed.
