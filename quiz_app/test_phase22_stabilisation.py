from pathlib import Path

from django.template.loader import get_template
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from .models import (
    AcademicYear,
    AnswerChoice,
    Class,
    Question,
    Quiz,
    QuizAttempt,
    SchoolInformation,
    Student,
    StudentClass,
    Subject,
    Teacher,
    User,
)


TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
PREVIOUSLY_REPORTED_TEMPLATES = (
    "quiz/question/question_create.html",
    "quiz/question/question_import.html",
    "superadmin/admin_detail.html",
)


class TemplateCompilationTests(SimpleTestCase):
    def test_all_application_templates_compile(self):
        failures = []
        for path in sorted(TEMPLATES_DIR.rglob("*.html")):
            name = path.relative_to(TEMPLATES_DIR).as_posix()
            try:
                get_template(name)
            except Exception as exc:
                failures.append(f"{name}: {type(exc).__name__}: {exc}")
        self.assertFalse(failures, "\n".join(failures))

    def test_previously_reported_templates_compile(self):
        for name in PREVIOUSLY_REPORTED_TEMPLATES:
            get_template(name)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthenticatedWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "Phase22-Test-Password-837!"
        cls.school = SchoolInformation.objects.create(
            name="Phase 22 School",
            short_name="P22",
            slug="phase-22-school",
            address="Test address",
            phone_number="5550100",
        )
        cls.other_school = SchoolInformation.objects.create(
            name="Other Phase 22 School",
            short_name="OP22",
            slug="other-phase-22-school",
            address="Other address",
            phone_number="5550101",
        )
        cls.superadmin = User.objects.create_user(
            username="phase22-superadmin",
            email="phase22-superadmin@example.test",
            password=cls.password,
            full_name="Phase 22 Superadmin",
            role="superadmin",
        )
        cls.admin = User.objects.create_user(
            username="phase22-admin",
            email="phase22-admin@example.test",
            password=cls.password,
            full_name="Phase 22 Admin",
            role="admin",
            school=cls.school,
        )
        cls.academic_year = AcademicYear.objects.create(
            name="2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            school=cls.school,
        )
        cls.class_obj = Class.objects.create(
            name="P22 Class",
            academic_year=cls.academic_year,
            school=cls.school,
        )
        cls.subject = Subject.objects.create(
            subject_name="Phase 22 Subject",
            school=cls.school,
        )
        cls.teacher = Teacher.objects.create(
            full_name="Phase 22 Teacher",
            contact_number="5550110",
            school=cls.school,
        )
        cls.teacher_user = User.objects.get(teacher_profile=cls.teacher)
        cls.teacher_user.set_password(cls.password)
        cls.teacher_user.save(update_fields=["password"])
        cls.student = Student.objects.create(
            admission_number="P22-0001",
            full_name="Phase 22 Student",
            date_of_birth="2010-01-01",
            gender="F",
            parent_contact="5550120",
            admission_date="2026-01-01",
            school=cls.school,
        )
        cls.student_user = User.objects.get(student_profile=cls.student)
        cls.student_user.set_password(cls.password)
        cls.student_user.save(update_fields=["password"])
        StudentClass.objects.create(
            student=cls.student,
            assigned_class=cls.class_obj,
            school=cls.school,
        )
        cls.quiz = Quiz.objects.create(
            title="Phase 22 Quiz",
            slug="phase-22-quiz",
            subject=cls.subject,
            teacher=cls.teacher,
            school=cls.school,
            status="published",
            time_limit=10,
            max_attempts=3,
            show_results_immediately=True,
            allow_review=True,
        )
        cls.quiz.classes.add(cls.class_obj)
        cls.question = Question.objects.create(
            quiz=cls.quiz,
            question_text="What is 2 + 2?",
            question_type="multiple_choice",
            marks=1,
            school=cls.school,
        )
        cls.correct_choice = AnswerChoice.objects.create(
            question=cls.question,
            choice_text="4",
            is_correct=True,
            school=cls.school,
        )
        AnswerChoice.objects.create(
            question=cls.question,
            choice_text="5",
            is_correct=False,
            school=cls.school,
        )

    def _login(self, username):
        response = self.client.post(
            reverse("quiz_app:login"),
            {"username": username, "password": self.password},
        )
        self.assertEqual(response.status_code, 302)
        return response

    def test_extra_js_from_child_templates_is_rendered(self):
        self.client.force_login(self.teacher_user)
        create_page = self.client.get(
            reverse("quiz_app:question_create", args=[self.quiz.pk])
        )
        import_page = self.client.get(
            reverse("quiz_app:question_bulk_import", args=[self.quiz.pk])
        )
        self.assertEqual(create_page.status_code, 200)
        self.assertContains(create_page, "js/question_management.js")
        self.assertContains(create_page, "vendor/bootstrap/5.3.3/js/bootstrap.bundle.min.js")
        self.assertNotContains(create_page, "vendor/popperjs/2.11.8/umd/popper.min.js")
        self.assertContains(create_page, "sweetalert2.all.min.js")
        quiz_detail = self.client.get(reverse("quiz_app:quiz_detail", args=[self.quiz.pk]))
        self.assertEqual(quiz_detail.status_code, 200)
        self.assertContains(quiz_detail, "js/question_management.js")
        self.assertContains(quiz_detail, "delete-question-btn")
        self.assertContains(quiz_detail, "data-delete-url")
        self.assertContains(create_page, 'id="questionForm"')
        self.assertEqual(import_page.status_code, 200)
        self.assertContains(import_page, 'id="importForm"')

        self.client.force_login(self.superadmin)
        detail_page = self.client.get(
            reverse("quiz_app:superadmin_admin_detail", args=[self.admin.pk])
        )
        self.assertEqual(detail_page.status_code, 200)
        self.assertContains(detail_page, "bootstrap.Modal.getOrCreateInstance")
        self.assertNotContains(detail_page, '.modal("show")')
        self.assertNotContains(detail_page, ".modal('show')")

    def test_superadmin_login_dashboard_admin_modal_and_permissions(self):
        login_page = self.client.get(reverse("quiz_app:superadmin_login"))
        self.assertEqual(login_page.status_code, 200)
        login_response = self.client.post(
            reverse("quiz_app:superadmin_login"),
            {"username": self.superadmin.username, "password": self.password},
        )
        self.assertEqual(login_response.status_code, 302)

        dashboard = self.client.get(reverse("quiz_app:superadmin_dashboard"))
        admin_list = self.client.get(reverse("quiz_app:superadmin_admin_list"))
        admin_detail = self.client.get(
            reverse("quiz_app:superadmin_admin_detail", args=[self.admin.pk])
        )
        edit_modal = self.client.get(
            reverse("quiz_app:superadmin_admin_edit", args=[self.admin.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        create_modal = self.client.get(
            reverse("quiz_app:superadmin_admin_create"),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(dashboard.status_code, 200)
        self.assertContains(dashboard, "id=\"app-sidebar\"")
        self.assertEqual(admin_list.status_code, 200)
        self.assertEqual(admin_detail.status_code, 200)
        self.assertContains(admin_detail, "id=\"editAdminBtn\"")
        self.assertEqual(edit_modal.status_code, 200)
        self.assertIn("html", edit_modal.json())
        self.assertIn("adminForm", edit_modal.json()["html"])
        self.assertEqual(create_modal.status_code, 200)

        create_response = self.client.post(
            reverse("quiz_app:superadmin_admin_create"),
            {
                "username": "phase22-created-admin",
                "email": "phase22-created-admin@example.test",
                "full_name": "Created Admin",
                "school": self.school.pk,
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(create_response.status_code, 200, create_response.content)
        created_admin = User.objects.get(username="phase22-created-admin")
        edit_response = self.client.post(
            reverse("quiz_app:superadmin_admin_edit", args=[created_admin.pk]),
            {
                "email": "phase22-created-admin-updated@example.test",
                "full_name": "Updated Admin",
                "school": self.school.pk,
                "is_active": "on",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        created_admin.refresh_from_db()
        self.assertEqual(edit_response.status_code, 200, edit_response.content)
        self.assertEqual(created_admin.full_name, "Updated Admin")

        logout_response = self.client.get(reverse("quiz_app:superadmin_logout"))
        self.assertEqual(logout_response.status_code, 302)

        self.client.force_login(self.admin)
        denied_dashboard = self.client.get(reverse("quiz_app:superadmin_dashboard"))
        denied_detail = self.client.get(
            reverse("quiz_app:superadmin_admin_detail", args=[self.admin.pk])
        )
        self.assertEqual(denied_dashboard.status_code, 302)
        self.assertEqual(denied_detail.status_code, 302)

    def test_school_admin_management_pages_and_student_crud(self):
        self._login(self.admin.username)
        pages = [
            reverse("quiz_app:admin_dashboard"),
            reverse("quiz_app:student_list"),
            reverse("quiz_app:teacher_list"),
            reverse("quiz_app:class_list"),
            reverse("quiz_app:subject_list"),
            reverse("quiz_app:enrollment_list"),
            reverse("quiz_app:quiz_list"),
            reverse("quiz_app:assignment_list"),
        ]
        for url in pages:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, url)
            self.assertContains(response, "id=\"app-sidebar\"")

        create_form = self.client.get(
            reverse("quiz_app:student_create"),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(create_form.status_code, 200)
        self.assertIn("html", create_form.json())

        create_response = self.client.post(
            reverse("quiz_app:student_create"),
            {
                "full_name": "Phase 22 New Student",
                "date_of_birth": "2011-02-02",
                "gender": "M",
                "parent_contact": "5550199",
                "admission_date": "2026-01-02",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(create_response.status_code, 200, create_response.content)
        self.assertTrue(create_response.json()["success"])
        new_student = Student.objects.get(full_name="Phase 22 New Student")

        edit_response = self.client.post(
            reverse("quiz_app:student_edit", args=[new_student.pk]),
            {
                "full_name": "Phase 22 Edited Student",
                "date_of_birth": "2011-02-02",
                "gender": "M",
                "parent_contact": "5550199",
                "admission_date": "2026-01-02",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        new_student.refresh_from_db()
        self.assertEqual(edit_response.status_code, 200, edit_response.content)
        self.assertEqual(new_student.full_name, "Phase 22 Edited Student")

        delete_response = self.client.post(
            reverse("quiz_app:student_delete", args=[new_student.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        new_student.refresh_from_db()
        self.assertEqual(delete_response.status_code, 200, delete_response.content)
        self.assertFalse(new_student.is_active)

        logout_response = self.client.get(reverse("quiz_app:logout"))
        self.assertEqual(logout_response.status_code, 302)

    def test_teacher_question_and_assignment_workflows(self):
        self._login(self.teacher_user.username)
        dashboard = self.client.get(reverse("quiz_app:teacher_dashboard"))
        quiz_list = self.client.get(reverse("quiz_app:quiz_list"))
        quiz_detail = self.client.get(reverse("quiz_app:quiz_detail", args=[self.quiz.pk]))
        create_page = self.client.get(
            reverse("quiz_app:question_create", args=[self.quiz.pk])
        )
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(quiz_list.status_code, 200)
        self.assertEqual(quiz_detail.status_code, 200)
        self.assertEqual(create_page.status_code, 200)

        create_response = self.client.post(
            reverse("quiz_app:question_create", args=[self.quiz.pk]),
            {
                "question_type": "short_answer",
                "question_text": "Name the capital of France.",
                "marks": "2",
                "correct_answer": "Paris",
                "difficulty": "easy",
            },
        )
        self.assertEqual(create_response.status_code, 302)
        question = Question.objects.get(question_text="Name the capital of France.")
        edit_page = self.client.get(
            reverse("quiz_app:question_edit", args=[self.quiz.pk, question.pk])
        )
        self.assertEqual(edit_page.status_code, 200)
        edit_response = self.client.post(
            reverse("quiz_app:question_edit", args=[self.quiz.pk, question.pk]),
            {
                "question_type": "short_answer",
                "question_text": "Name the capital of France.",
                "marks": "3",
                "correct_answer": "Paris",
                "difficulty": "easy",
            },
        )
        question.refresh_from_db()
        self.assertEqual(edit_response.status_code, 302)
        self.assertEqual(question.marks, 3)

        delete_page = self.client.get(
            reverse("quiz_app:question_delete", args=[self.quiz.pk, question.pk])
        )
        self.assertEqual(delete_page.status_code, 405)
        ajax_delete = self.client.post(
            reverse("quiz_app:question_delete", args=[self.quiz.pk, question.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.quiz.refresh_from_db()
        self.assertEqual(ajax_delete.status_code, 200, ajax_delete.content)
        self.assertTrue(ajax_delete.json()["success"])
        self.assertFalse(Question.objects.filter(pk=question.pk).exists())
        self.assertEqual(self.quiz.total_marks, self.question.marks)

        duplicate_delete = self.client.post(
            reverse("quiz_app:question_delete", args=[self.quiz.pk, question.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(duplicate_delete.status_code, 404)

        import_page = self.client.get(
            reverse("quiz_app:question_bulk_import", args=[self.quiz.pk])
        )
        assignments = self.client.get(reverse("quiz_app:quiz_assignment_overview"))
        results = self.client.get(reverse("quiz_app:quiz_results_list"))
        grading = self.client.get(reverse("quiz_app:quiz_grading_list"))
        self.assertEqual(import_page.status_code, 200)
        self.assertEqual(assignments.status_code, 200)
        self.assertEqual(results.status_code, 200)
        self.assertEqual(grading.status_code, 200)

        other_admin_page = self.client.get(
            reverse("quiz_app:superadmin_admin_detail", args=[self.admin.pk])
        )
        self.assertEqual(other_admin_page.status_code, 302)

        logout_response = self.client.get(reverse("quiz_app:logout"))
        self.assertEqual(logout_response.status_code, 302)

    def test_student_complete_quiz_attempt_and_duplicate_submit(self):
        self._login(self.student_user.username)
        dashboard = self.client.get(reverse("quiz_app:student_dashboard"))
        assigned = self.client.get(reverse("quiz_app:student_quiz_list"))
        instructions = self.client.get(
            reverse("quiz_app:student_quiz_detail", args=[self.quiz.pk])
        )
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(assigned.status_code, 200)
        self.assertContains(assigned, self.quiz.title)
        self.assertEqual(instructions.status_code, 200)

        start_response = self.client.get(
            reverse("quiz_app:student_quiz_start", args=[self.quiz.pk])
        )
        self.assertEqual(start_response.status_code, 302)
        attempt = QuizAttempt.objects.get(
            quiz=self.quiz,
            student=self.student,
            is_submitted=False,
        )
        take_page = self.client.get(
            reverse("quiz_app:student_quiz_take", args=[attempt.pk])
        )
        self.assertEqual(take_page.status_code, 200)
        self.assertContains(take_page, "js/quiz_taking.js")
        self.assertContains(take_page, "timeRemainingSeconds")
        self.assertContains(take_page, self.question.question_text)

        save_response = self.client.post(
            reverse("quiz_app:student_quiz_save", args=[attempt.pk]),
            {
                "question_id": self.question.pk,
                "choice_ids": [self.correct_choice.pk],
            },
        )
        self.assertEqual(save_response.status_code, 200, save_response.content)
        self.assertTrue(save_response.json()["success"])

        refresh_page = self.client.get(
            reverse("quiz_app:student_quiz_take", args=[attempt.pk])
        )
        self.assertEqual(refresh_page.status_code, 200)
        self.assertContains(refresh_page, self.question.question_text)

        first_submit = self.client.post(
            reverse("quiz_app:student_quiz_submit", args=[attempt.pk])
        )
        attempt.refresh_from_db()
        submitted_at = attempt.submitted_at
        score = attempt.score
        second_submit = self.client.post(
            reverse("quiz_app:student_quiz_submit", args=[attempt.pk])
        )
        attempt.refresh_from_db()
        self.assertEqual(first_submit.status_code, 302)
        self.assertEqual(second_submit.status_code, 302)
        self.assertTrue(attempt.is_submitted)
        self.assertEqual(attempt.submitted_at, submitted_at)
        self.assertEqual(attempt.score, score)

        result_page = self.client.get(
            reverse("quiz_app:student_quiz_result_detail", args=[attempt.pk])
        )
        self.assertEqual(result_page.status_code, 200)
        self.assertContains(result_page, self.quiz.title)

        logout_response = self.client.get(reverse("quiz_app:logout"))
        self.assertEqual(logout_response.status_code, 302)

    def test_question_delete_requires_csrf_and_blocks_attempt_history(self):
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.teacher_user)
        url = reverse(
            "quiz_app:question_delete", args=[self.quiz.pk, self.question.pk]
        )
        missing_csrf = csrf_client.post(
            url, HTTP_X_REQUESTED_WITH="XMLHttpRequest"
        )
        self.assertEqual(missing_csrf.status_code, 403)
        self.assertTrue(Question.objects.filter(pk=self.question.pk).exists())

        self.client.force_login(self.teacher_user)
        QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            school=self.school,
            attempt_number=1,
        )
        blocked = self.client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(blocked.status_code, 400)
        self.assertFalse(blocked.json()["success"])
        self.assertIn("attempts", blocked.json()["error"].lower())
        self.assertTrue(Question.objects.filter(pk=self.question.pk).exists())

        student_client = Client()
        student_client.force_login(self.student_user)
        denied = student_client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(denied.status_code, 403)


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class BootstrapModalMarkupTests(TestCase):
    def test_admin_form_partial_uses_bootstrap5_dismiss(self):
        template = get_template("superadmin/partials/admin_form.html")
        html = template.render({"admin": None, "schools": []})
        self.assertIn("data-bs-dismiss", html)
        self.assertNotIn("data-dismiss", html)
        self.assertIn("getOrCreateInstance", html)
