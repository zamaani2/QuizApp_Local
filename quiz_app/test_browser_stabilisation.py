"""Optional Playwright browser checks.

These tests are skipped unless PLAYWRIGHT_E2E=1 so default Django discovery
stays free of browser dependencies. They exercise authenticated shell behaviour
that the Django test client cannot verify: sidebar open/close, themes, and
viewport overflow.
"""

import os
import re
from unittest import skipUnless

# Playwright's sync API uses an event loop on this thread. Django ORM calls
# in LiveServer tests must still run synchronously.
os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test import override_settings
from django.urls import reverse

from pathlib import Path

from .models import (
    AcademicYear,
    Class,
    Question,
    Quiz,
    SchoolInformation,
    Student,
    StudentClass,
    Subject,
    Teacher,
    User,
)

PLAYWRIGHT_ENABLED = os.environ.get("PLAYWRIGHT_E2E", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
VIEWPORTS = (
    {"width": 320, "height": 720},
    {"width": 375, "height": 812},
    {"width": 425, "height": 900},
    {"width": 768, "height": 1024},
    {"width": 1024, "height": 768},
    {"width": 1366, "height": 768},
    {"width": 1920, "height": 1080},
)
THEMES = ("academic", "green", "purple", "red")


def _playwright_available():
    if not PLAYWRIGHT_ENABLED:
        return False
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        return False
    return True


@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["localhost", "127.0.0.1", "testserver"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
@skipUnless(_playwright_available(), "Set PLAYWRIGHT_E2E=1 with Playwright installed")
class AuthenticatedBrowserShellTests(StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from playwright.sync_api import sync_playwright

        cls._playwright = sync_playwright().start()
        cls.browser = cls._playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls._playwright.stop()
        super().tearDownClass()

    def setUp(self):
        self.password = "Phase22-Browser-Password-837!"
        self.school = SchoolInformation.objects.create(
            name="Browser Test School",
            short_name="BTS",
            slug="browser-test-school",
            address="Browser address",
            phone_number="5550200",
        )
        self.superadmin = User.objects.create_user(
            username="browser-superadmin",
            email="browser-superadmin@example.test",
            password=self.password,
            full_name="Browser Superadmin",
            role="superadmin",
        )
        self.admin = User.objects.create_user(
            username="browser-admin",
            email="browser-admin@example.test",
            password=self.password,
            full_name="Browser Admin",
            role="admin",
            school=self.school,
        )
        self.teacher = Teacher.objects.create(
            full_name="Browser Teacher",
            contact_number="5550210",
            school=self.school,
        )
        self.teacher_user = User.objects.get(teacher_profile=self.teacher)
        self.teacher_user.set_password(self.password)
        self.teacher_user.save(update_fields=["password"])
        self.student = Student.objects.create(
            admission_number="BR-0001",
            full_name="Browser Student",
            date_of_birth="2010-01-01",
            gender="F",
            parent_contact="5550220",
            admission_date="2026-01-01",
            school=self.school,
        )
        self.student_user = User.objects.get(student_profile=self.student)
        self.student_user.set_password(self.password)
        self.student_user.save(update_fields=["password"])
        academic_year = AcademicYear.objects.create(
            name="2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            school=self.school,
        )
        class_obj = Class.objects.create(
            name="Browser Class",
            academic_year=academic_year,
            school=self.school,
        )
        StudentClass.objects.create(
            student=self.student,
            assigned_class=class_obj,
            school=self.school,
        )
        self.subject = Subject.objects.create(
            subject_name="Browser Subject",
            school=self.school,
        )
        self.quiz = Quiz.objects.create(
            title="Browser Quiz",
            slug="browser-quiz",
            subject=self.subject,
            teacher=self.teacher,
            school=self.school,
            status="published",
        )
        self.question = Question.objects.create(
            quiz=self.quiz,
            question_text="Browser deletion question",
            question_type="short_answer",
            marks=1,
            school=self.school,
        )
        self.screenshot_dir = Path(
            os.environ.get("PLAYWRIGHT_SCREENSHOT_DIR", "artifacts/playwright")
        )
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    def _login(self, page, username, login_url, dashboard_url):
        page.goto(f"{self.live_server_url}{login_url}")
        page.fill("#id_username", username)
        page.fill("#id_password", self.password)
        page.click("#loginBtn")
        page.wait_for_url(re.compile(re.escape(dashboard_url)), timeout=15000)

    def _collect_page_errors(self, page):
        console_errors = []
        failed_assets = []

        def on_console(message):
            if message.type == "error":
                console_errors.append(message.text)

        def on_pageerror(error):
            console_errors.append(str(error))

        def on_response(response):
            url = response.url
            if response.status >= 400 and any(
                part in url
                for part in ("/static/", "/css/", "/js/", "bootstrap", "sweetalert")
            ):
                failed_assets.append(f"{response.status} {url}")

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)
        page.on("response", on_response)
        return console_errors, failed_assets

    def _dismiss_sweetalert(self, page):
        popup = page.locator(".swal2-container.swal2-backdrop-show")
        if popup.count():
            confirm = page.locator(".swal2-confirm")
            if confirm.count():
                confirm.click()
            popup.wait_for(state="hidden", timeout=5000)

    def _assert_shell(self, page, failures, role_name):
        from playwright.sync_api import expect

        self._dismiss_sweetalert(page)
        expect(page.locator("#app-sidebar")).to_be_visible()
        expect(page.locator(".app-theme-trigger")).to_be_visible()

        page.locator(".app-user-trigger").click()
        expect(page.locator(".user-menu-dropdown")).to_be_visible()
        page.keyboard.press("Escape")

        for theme in THEMES:
            page.locator(".app-theme-trigger").click()
            page.locator(f'.theme-option[data-theme="{theme}"]').click()
            actual = page.evaluate(
                "() => document.documentElement.getAttribute('data-app-theme')"
            )
            if actual != theme:
                failures.append(f"{role_name}: theme {theme} was not applied, got {actual}")

        for viewport in VIEWPORTS:
            page.set_viewport_size(viewport)
            page.wait_for_timeout(250)
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"
            )
            if overflow:
                failures.append(
                    f"{role_name}: horizontal overflow at {viewport['width']}px"
                )

            toggle = page.locator(".app-sidebar-toggle")
            sidebar = page.locator("#app-sidebar")
            if viewport["width"] < 992:
                expect(toggle).to_be_visible()
                if not sidebar.evaluate("el => el.classList.contains('is-open')"):
                    toggle.click()
                expect(sidebar).to_have_class(re.compile(r"\bis-open\b"))
                expect(page.locator("body")).to_have_class(re.compile(r"\bsidebar-open\b"))
                expect(page.locator(".app-sidebar-backdrop")).to_be_visible()
                real_link = page.locator('.sidebar-menu a.nav-link[href]:not([href="#"])').first
                expect(real_link).to_be_visible()
                real_link.click()
                page.wait_for_timeout(300)
                expect(page.locator("#app-sidebar")).to_be_visible()
                if page.locator("#app-sidebar").evaluate(
                    "el => el.classList.contains('is-open')"
                ):
                    page.locator(".app-sidebar-toggle").click()
            else:
                expect(sidebar).to_be_visible()
                expect(toggle).to_be_hidden()

    def test_authenticated_shells_for_all_roles(self):
        from playwright.sync_api import expect

        failures = []
        role_cases = (
            (
                "superadmin",
                self.superadmin.username,
                reverse("quiz_app:superadmin_login"),
                reverse("quiz_app:superadmin_dashboard"),
            ),
            (
                "admin",
                self.admin.username,
                reverse("quiz_app:login"),
                reverse("quiz_app:admin_dashboard"),
            ),
            (
                "teacher",
                self.teacher_user.username,
                reverse("quiz_app:login"),
                reverse("quiz_app:teacher_dashboard"),
            ),
            (
                "student",
                self.student_user.username,
                reverse("quiz_app:login"),
                reverse("quiz_app:student_dashboard"),
            ),
        )

        for role_name, username, login_url, dashboard_url in role_cases:
            context = self.browser.new_context()
            page = context.new_page()
            console_errors, failed_assets = self._collect_page_errors(page)
            try:
                self._login(page, username, login_url, dashboard_url)
                expect(page).to_have_url(re.compile(re.escape(dashboard_url)))
                self._assert_shell(page, failures, role_name)
                if console_errors:
                    failures.append(
                        f"{role_name} console errors: " + "; ".join(console_errors)
                    )
                if failed_assets:
                    failures.append(
                        f"{role_name} failed assets: " + "; ".join(failed_assets)
                    )
            except Exception as exc:
                failures.append(f"{role_name}: {type(exc).__name__}: {exc}")
            finally:
                context.close()

        self.assertFalse(failures, "\n".join(failures))

    def _save_screenshot(self, page, name):
        try:
            page.screenshot(
                path=str(self.screenshot_dir / f"{name}.png"),
                full_page=True,
            )
        except Exception:
            pass

    def test_admin_student_management_modal(self):
        from playwright.sync_api import expect

        context = self.browser.new_context()
        page = context.new_page()
        console_errors, failed_assets = self._collect_page_errors(page)
        try:
            self._login(
                page,
                self.admin.username,
                reverse("quiz_app:login"),
                reverse("quiz_app:admin_dashboard"),
            )
            self._dismiss_sweetalert(page)
            page.goto(f"{self.live_server_url}{reverse('quiz_app:student_list')}")
            self._dismiss_sweetalert(page)
            page.locator("#addStudentBtn").click()
            modal = page.locator("#studentFormModal")
            expect(modal).to_be_visible(timeout=15000)
            expect(modal).to_have_class(re.compile(r"\bshow\b"))
            expect(page.locator("#studentForm")).to_be_visible()
            page.locator("#studentFormModal [data-bs-dismiss='modal']").first.click()
            expect(modal).to_be_hidden(timeout=10000)
            self.assertFalse(console_errors, "; ".join(console_errors))
            self.assertFalse(failed_assets, "; ".join(failed_assets))
        except Exception:
            self._save_screenshot(page, "admin-student-modal-failure")
            raise
        finally:
            context.close()

    def test_teacher_question_delete_confirmation(self):
        from playwright.sync_api import expect

        context = self.browser.new_context()
        page = context.new_page()
        console_errors, failed_assets = self._collect_page_errors(page)
        try:
            self._login(
                page,
                self.teacher_user.username,
                reverse("quiz_app:login"),
                reverse("quiz_app:teacher_dashboard"),
            )
            self._dismiss_sweetalert(page)
            page.goto(
                f"{self.live_server_url}{reverse('quiz_app:quiz_detail', args=[self.quiz.pk])}"
            )
            self._dismiss_sweetalert(page)
            expect(page.locator(".delete-question-btn")).to_be_visible()
            page.locator(".delete-question-btn").click()
            confirm = page.locator(".swal2-popup.swal2-modal")
            expect(confirm).to_be_visible(timeout=10000)
            expect(confirm).to_contain_text("Are you sure?")
            page.locator(".swal2-cancel").click()
            expect(confirm).to_be_hidden(timeout=10000)
            self.assertTrue(Question.objects.filter(pk=self.question.pk).exists())

            page.locator(".delete-question-btn").click()
            expect(page.locator(".swal2-popup.swal2-modal")).to_be_visible()
            page.locator(".swal2-confirm").click()
            page.wait_for_function(
                "() => !document.querySelector('.delete-question-btn')",
                timeout=15000,
            )
            self.assertFalse(Question.objects.filter(pk=self.question.pk).exists())
            self.assertFalse(console_errors, "; ".join(console_errors))
            self.assertFalse(failed_assets, "; ".join(failed_assets))
        except Exception:
            self._save_screenshot(page, "teacher-question-delete-failure")
            raise
        finally:
            context.close()
