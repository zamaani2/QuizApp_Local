import json
import re
import smtplib
from datetime import date
from urllib.parse import urlsplit
from unittest.mock import patch

from django.core import mail
from django.contrib import admin as django_admin
from django.test import RequestFactory, TestCase, override_settings
from django.urls import reverse

from .models import SchoolInformation, Student, Teacher, User


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SITE_URL="https://quiz.example.test",
)
class AccountSetupAndPasswordResetTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.school = SchoolInformation.objects.create(
            name="Account Test School",
            short_name="Account",
            slug="account-test-school",
            address="Test address",
            phone_number="5550100",
        )
        cls.school_admin = User.objects.create_user(
            username="account-test-admin",
            email="account-test-admin@example.test",
            password="Admin-Test-Password-837!",
            full_name="Account Test Admin",
            role="admin",
            school=cls.school,
        )

    def get_reset_link_path(self):
        self.assertEqual(len(mail.outbox), 1)
        match = re.search(r"https?://[^\s]+", mail.outbox[0].body)
        self.assertIsNotNone(match)
        return urlsplit(match.group(0)).path

    def get_valid_confirm_path(self, link_path):
        response = self.client.get(link_path)
        self.assertEqual(response.status_code, 302)
        confirm_path = urlsplit(response.url).path
        response = self.client.get(confirm_path)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["validlink"])
        return confirm_path

    def set_password_from_link(self, confirm_path, password):
        return self.client.post(
            confirm_path,
            {
                "new_password1": password,
                "new_password2": password,
            },
        )

    def create_student(self, email):
        return Student.objects.create(
            admission_number="SETUPST01",
            full_name="Setup Student",
            date_of_birth=date(2010, 1, 1),
            gender="F",
            parent_contact="5550101",
            admission_date=date(2026, 1, 1),
            email=email,
            school=self.school,
        )

    def create_teacher(self, email):
        return Teacher.objects.create(
            full_name="Setup Teacher",
            contact_number="5550102",
            email=email,
            school=self.school,
        )

    def test_student_creation_sends_a_password_setup_link(self):
        with self.captureOnCommitCallbacks(execute=True):
            student = self.create_student("setup-student@example.test")

        user = User.objects.get(student_profile=student)
        self.assertEqual(user.role, "student")
        self.assertEqual(user.school, self.school)
        self.assertTrue(user.has_usable_password())
        self.assertFalse(hasattr(student, "temp_password"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)
        self.assertNotIn("password is", mail.outbox[0].body.lower())
        self.assertNotIn(user.password, mail.outbox[0].body)

    def test_teacher_creation_sends_a_password_setup_link(self):
        with self.captureOnCommitCallbacks(execute=True):
            teacher = self.create_teacher("setup-teacher@example.test")

        user = User.objects.get(teacher_profile=teacher)
        self.assertEqual(user.role, "teacher")
        self.assertEqual(user.school, self.school)
        self.assertTrue(user.has_usable_password())
        self.assertFalse(hasattr(teacher, "temp_password"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)
        self.assertNotIn("password is", mail.outbox[0].body.lower())
        self.assertNotIn(user.password, mail.outbox[0].body)

    def test_admin_created_user_receives_a_setup_link_without_password_input(self):
        self.client.force_login(self.school_admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("quiz_app:user_create"),
                {
                    "username": "setup-user",
                    "email": "setup-user@example.test",
                    "full_name": "Setup User",
                    "role": "teacher",
                },
            )

        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(username="setup-user")
        self.assertEqual(user.role, "teacher")
        self.assertEqual(user.school, self.school)
        self.assertEqual(user.email, "setup-user@example.test")
        self.assertTrue(user.has_usable_password())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)
        self.assertNotIn("0000", mail.outbox[0].body)

    def test_superadmin_created_account_receives_a_setup_link(self):
        superadmin = User.objects.create_user(
            username="setup-superadmin",
            email="setup-superadmin@example.test",
            password="Superadmin-Test-Password-837!",
            full_name="Setup Superadmin",
            role="superadmin",
        )
        self.client.force_login(superadmin)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("quiz_app:superadmin_admin_create"),
                {
                    "username": "setup-school-admin",
                    "email": "setup-school-admin@example.test",
                    "full_name": "Setup School Admin",
                    "school": self.school.pk,
                },
            )

        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(username="setup-school-admin")
        self.assertEqual(user.role, "admin")
        self.assertEqual(user.school, self.school)
        self.assertTrue(user.is_active)
        self.assertTrue(user.has_usable_password())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)

    def test_django_admin_created_account_receives_a_setup_link(self):
        admin_actor = User.objects.create_user(
            username="django-admin-actor",
            email="django-admin-actor@example.test",
            password="Django-Admin-Actor-Password-837!",
            full_name="Django Admin Actor",
            role="superadmin",
            is_staff=True,
            is_superuser=True,
        )
        new_user = User(
            username="django-admin-created",
            email="django-admin-created@example.test",
            full_name="Django Admin Created",
            role="admin",
            school=self.school,
        )
        new_user.set_password("Admin-Entered-Password-837!")
        request = RequestFactory().post("/admin/quiz_app/user/add/")
        request.user = admin_actor

        with self.captureOnCommitCallbacks(execute=True):
            django_admin.site._registry[User].save_model(
                request, new_user, form=None, change=False
            )

        self.assertTrue(User.objects.filter(pk=new_user.pk).exists())
        self.assertEqual(new_user.role, "admin")
        self.assertEqual(new_user.school, self.school)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)
        self.assertNotIn("Admin-Entered-Password-837!", mail.outbox[0].body)

    def test_valid_setup_link_sets_password_and_cannot_be_reused(self):
        with self.captureOnCommitCallbacks(execute=True):
            student = self.create_student("activate-student@example.test")
        user = User.objects.get(student_profile=student)
        link_path = self.get_reset_link_path()
        confirm_path = self.get_valid_confirm_path(link_path)

        response = self.set_password_from_link(
            confirm_path, "New-Student-Password-938!"
        )

        self.assertRedirects(
            response, reverse("quiz_app:password_reset_complete")
        )
        user.refresh_from_db()
        self.assertTrue(user.check_password("New-Student-Password-938!"))

        reused_response = self.client.get(link_path)
        self.assertEqual(reused_response.status_code, 200)
        self.assertFalse(reused_response.context["validlink"])

    def test_expired_setup_link_is_rejected(self):
        with self.captureOnCommitCallbacks(execute=True):
            student = self.create_student("expired-student@example.test")
        link_path = self.get_reset_link_path()

        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            response = self.client.get(link_path)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["validlink"])

    def test_invalid_setup_link_is_rejected(self):
        with self.captureOnCommitCallbacks(execute=True):
            student = self.create_student("invalid-student@example.test")
        link_path = self.get_reset_link_path()
        path_parts = link_path.rstrip("/").split("/")
        invalid_path = "/".join(path_parts[:-1] + ["invalid-token"]) + "/"

        response = self.client.get(invalid_path)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["validlink"])

    def test_password_reset_sends_link_and_updates_existing_account(self):
        user = User.objects.create_user(
            username="reset-existing-user",
            email="reset-existing@example.test",
            password="Old-Existing-Password-845!",
            full_name="Existing User",
            role="student",
            school=self.school,
        )

        response = self.client.post(
            reverse("quiz_app:password_reset"),
            {"email": user.email},
        )

        self.assertRedirects(
            response, reverse("quiz_app:password_reset_done")
        )
        link_path = self.get_reset_link_path()
        confirm_path = self.get_valid_confirm_path(link_path)
        response = self.set_password_from_link(
            confirm_path, "New-Existing-Password-946!"
        )
        self.assertRedirects(
            response, reverse("quiz_app:password_reset_complete")
        )
        user.refresh_from_db()
        self.assertFalse(user.check_password("Old-Existing-Password-845!"))
        self.assertTrue(user.check_password("New-Existing-Password-946!"))

    def test_password_reset_response_does_not_disclose_account_existence(self):
        existing_user = User.objects.create_user(
            username="enumeration-test-user",
            email="enumeration-test@example.test",
            password="Existing-Password-845!",
            full_name="Enumeration Test User",
            role="student",
            school=self.school,
        )

        existing_response = self.client.post(
            reverse("quiz_app:password_reset"),
            {"email": existing_user.email},
        )
        unknown_response = self.client.post(
            reverse("quiz_app:password_reset"),
            {"email": "unknown-account@example.test"},
        )

        self.assertEqual(existing_response.status_code, 302)
        self.assertEqual(unknown_response.status_code, 302)
        self.assertEqual(existing_response.url, unknown_response.url)

    def test_bulk_password_reset_sends_links_without_changing_passwords(self):
        user = User.objects.create_user(
            username="bulk-reset-user",
            email="bulk-reset@example.test",
            password="Bulk-Existing-Password-845!",
            full_name="Bulk Reset User",
            role="student",
            school=self.school,
        )
        original_password_hash = user.password
        self.client.force_login(self.school_admin)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("quiz_app:user_bulk_password_reset"),
                data=json.dumps({"user_ids": [user.pk]}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200, response.content)
        user.refresh_from_db()
        self.assertEqual(user.password, original_password_hash)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("password-reset/", mail.outbox[0].body)

    def test_email_failure_keeps_created_account_and_does_not_log_secrets(self):
        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
            EMAIL_HOST="smtp.example.test",
        ):
            with patch(
                "django.core.mail.backends.smtp.EmailBackend.send_messages",
                side_effect=smtplib.SMTPException(
                    "private-password-reset-token"
                ),
            ):
                with self.assertLogs(
                    "quiz_app.account_security", level="WARNING"
                ) as captured_logs:
                    with self.captureOnCommitCallbacks(execute=True):
                        student = self.create_student(
                            "mail-failure@example.test"
                        )

        user = User.objects.get(student_profile=student)
        self.assertTrue(user.has_usable_password())
        self.assertTrue(user.is_active)
        self.assertTrue(
            any("delivery failed" in line for line in captured_logs.output)
        )
        self.assertNotIn(
            "private-password-reset-token", "\n".join(captured_logs.output)
        )
