# QuizApp Local

## Project architecture

QuizApp is a Django monolith backed by PostgreSQL in its documented deployment
configuration. The current user interface is Django templates with JavaScript
and static assets; no React frontend or API application is present in the
repository's main application structure. The primary application is `quiz_app`,
with project configuration in `quiz_system`.

The application uses a shared database and schema. Schools are tenants
represented by `SchoolInformation`; school-owned records generally carry a
`school` foreign key. Tenant selection is based on the authenticated user's
school, not on URL or subdomain routing. Views currently implement much of
their own filtering, so the presence of a school field alone does not guarantee
isolation.

Production configuration must provide `SECRET_KEY` and either `DATABASE_URL`
or explicit PostgreSQL connection settings. Debug mode defaults off; local
development may opt in with `DEBUG=True`, which generates a development-only
secret when none is supplied.

## Main data relationships

- `User` has a role (`admin`, `teacher`, `student`, or `superadmin`), an
  optional `school`, and optional one-to-one profiles for `Teacher` and
  `Student`. The model also has an `is_superadmin` flag, but authorization
  uses the `role` field as its source of truth; the legacy flag does not grant
  cross-school access.
- `Teacher` belongs to a school and may belong to a `Department`; the teacher
  login account is linked by `User.teacher_profile`.
- `Student` belongs to a school and may be associated with a `Form` and
  `LearningArea`; the student login account is linked by
  `User.student_profile`.
- `Form`, `LearningArea`, and `Department` are school structure records.
  `Subject` belongs to a school and may reference a learning area and
  department.
- `AcademicYear` belongs to a school. `Term` belongs to an academic year and
  also stores a school reference.
- `Class` belongs to an academic year and school and may reference a form and
  learning area. `ClassSubject` allocates a subject to a class for an academic
  year.
- `StudentClass` records student-to-class enrollment and has active status,
  school, assignment date, and assigning user. The class carries the academic
  year.
- `TeacherSubjectAssignment` connects teacher, subject, class, and academic
  year, with school, active status, assigning user, and reassignment history.
  `ClassTeacher` separately records class-teacher responsibility.
- `Quiz` belongs to a subject, teacher, school, and optionally an academic
  year and term. Its `classes` many-to-many relation represents quiz
  assignment to classes. `QuizAttempt` and `QuizResponse` store student
  attempts and answers.
- No separate student-homework/assignment model was identified in the current
  model definitions. Teacher-subject allocation and quiz-to-class assignment
  are distinct existing workflows and must not be presented as student
  homework.

The models include `save()` methods that sometimes infer school values from
related objects. These defaults are not substitutes for validating that every
submitted relation belongs to the same school.

## Data-isolation policy

1. A school administrator, teacher, or student must have a valid associated
   school and, for teachers/students, a matching profile. Missing associations
   result in denial or an empty/404-scoped result, never an unrestricted query.
2. School users may access only records in their school and only the academic
   activities their role, profile, class enrollment, and teacher assignments
   permit.
3. Only explicitly authorized superadmins may access across schools. A
   superadmin bypass must be deliberate and must not be inferred from a missing
   school. Cross-school reads may be allowed where a view expressly supports
   them; school-specific writes require an explicit active target school, and
   edits/deletes remain bound to the existing record's school.
4. Apply the same tenant checks to list, detail, create, update, delete, bulk,
   import, export, HTML, and JSON/AJAX operations. Validate submitted foreign
   keys against the current school.
5. Return 404 for cross-school object lookups when disclosing existence is
   unnecessary; use 403 for authenticated users who lack permission to an
   otherwise in-scope operation.
6. Preserve CSRF protection and validate all authorization and input on the
   server.

## Record lifecycle and academic-year rules

- Schools, user identities, student and teacher identities, and school
  structure are enduring records. Deactivate or archive them when they have
  historical academic relationships; do not cascade-delete academic history.
- Academic years and terms are time-bounded school records. Classes,
  enrollments, class-subject allocations, class-teacher responsibilities, and
  teacher-subject allocations are tied to the relevant academic year. Preserve
  prior-year rows when promoting students or reassigning teachers.
- A student should have no more than one active class enrollment at a time in
  the school. A transfer or promotion closes the old active enrollment and
  creates a new year/class enrollment; it does not erase the old enrollment.
- Enforce class capacity on the server in a transaction so concurrent
  enrollment cannot exceed the configured limit. Enrollment creation locks
  the target class, treats repeated assignment to the same class as
  idempotent, and preserves an existing enrollment if a transfer target is
  already full.
- Validate school consistency between all related records. Reject invalid
  foreign keys instead of silently clearing or replacing them.

## Teacher assignment rules

A teacher-subject assignment is the relationship between teacher, subject,
class, academic year, and school. Every relation must belong to the same school,
and the subject must be allocated to that class for that academic year.
Duplicate active assignments are rejected at both validation and database
levels where supported. Reassignment closes/preserves the old assignment and
records who changed it and when; it must not rewrite prior-year responsibility.
Class-teacher responsibility and quiz assignment remain separate relationships.

## Import and export rules

Imports are school-scoped and support validated CSV/XLSX input, bounded file
and row sizes, column mapping, row/field-specific errors, preview before
commit, duplicate checks, transactions, and an error report. Imports must not
invent missing personal information or return a success result for a failed
operation. Exports must match displayed filters, include academic year where
relevant, avoid cross-school disclosure, and neutralize spreadsheet formulas.
Never export credentials, password hashes, or authentication tokens.

Current student CSV/XLSX and teacher CSV imports reject files over 5 MB, more
than 5,000 data rows, or more than 64 columns before writing records. Import
preview-before-commit and downloadable row-error reports remain incomplete
and are tracked in `IMPLEMENTATION_CHECKLIST.md`.

## Quiz behavior

- Starting an attempt requires an authenticated student, an eligible
  enrollment/class assignment, an available quiz, and an available attempt
  slot. Missing class assignments do not grant school-wide access unless an
  explicit policy is added.
- Attempt limits and availability windows are enforced on the server. Answer
  saves stop at expiry and after submission. Starting and submitting attempts
  are safe under repeated/concurrent requests; finalization is atomic.
- Resume uses saved answers. Question and answer-choice order, when
  randomized, is persisted per attempt and remains stable on refresh.
- Scoring is centralized, validates awarded marks against question marks,
  supports configured partial/negative marking without scores below the
  permitted minimum, and grades by answer identity rather than displayed
  position.
- Result, answer-key, explanation, and review data are returned only when
  `show_results_immediately`, `show_correct_answers`, and `allow_review`
  permit it. The same rule applies to pages, APIs, and print views.
- Published quizzes must contain only question types with complete authoring,
  validation, answer, grading, and result workflows. Manual grading is limited
  to authorized staff and appropriate response types and records grader and
  grading time.
- Attempts persist the quiz and question configuration, correct answers, and
  randomized question/choice order at start. Scoring and manual grading use
  those snapshots so later edits do not change historical meaning or results.
  Attempts created before snapshots existed are populated from the current
  configuration when first captured; the original settings cannot be
  reconstructed.

## Current implementation status

This document records intended behavior, not a claim that every rule is
currently implemented. A request middleware now requires authentication and
a valid school/profile identity on application views, and restricts Django
admin access to active staff superadmins. This identity gate does not replace
role-specific authorization or query/object-level school filtering. Shared
object-scoping helpers are now used for the student, class, subject, teacher,
school-structure, enrollment, teacher-assignment, user, and academic-year
management detail operations. Foreign-school optional relations are rejected
instead of silently discarded in student, teacher, and class creation/edit
paths. This work has focused endpoint tests but has not audited every list,
bulk, import/export, quiz, and related-object endpoint. Existing
multi-tenancy audit documents are historical notes and should not be treated
as proof of complete endpoint coverage. The implementation checklist tracks
verified work and outstanding phases.

Student and teacher archive actions now retain their profile and related
academic records, disable the linked account, and deactivate current
enrollments or assignments. Restore re-enables the profile and restores the
account's state from before archiving; it deliberately does not reactivate
historical class or teaching assignments. Other student/teacher lifecycle,
import, and endpoint-audit requirements remain tracked as incomplete in the
checklist.

Class and subject management also archives rather than deletes records.
Archiving a class deactivates current enrollments and teaching assignments;
archiving a subject deactivates its teaching assignments. Quiz and allocation
history remains attached, and restoring a class or subject does not revive
those historical relationships.

Quiz attempts now persist their starting configuration and randomized order;
response scoring supports all exposed question types, and manual grading
records an audit history. Attempt start/resume and submission are guarded
against repeated requests, and expired attempts are submitted before late
answers are rejected. These quiz lifecycle behaviors have focused persistence
and endpoint tests; overall suite status and remaining requirements are in the
implementation checklist.

## Related documents

- [Decision log](./DECISIONS.md)
- [Implementation checklist](./IMPLEMENTATION_CHECKLIST.md)
- [Multi-tenancy analysis](./MULTI_TENANCY_ANALYSIS.md) (historical review)
- [Multi-tenancy audit report](./MULTI_TENANCY_AUDIT_REPORT.md) (historical review)
