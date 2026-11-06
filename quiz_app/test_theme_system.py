from pathlib import Path

from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from .models import (
    AcademicYear,
    Class,
    SchoolInformation,
    Student,
    StudentClass,
    Teacher,
    User,
)


APP_DIR = Path(__file__).resolve().parent
THEMES = ("academic", "green", "purple", "red")
THEME_BODY_CLASSES = {
    "academic": "academic-pro-theme-page",
    "green": "green-theme-page",
    "purple": "purple-theme-page",
    "red": "red-theme-page",
}
THEME_COLORS = {
    "academic": "#1e40af",
    "green": "#047857",
    "purple": "#7c3aed",
    "red": "#dc2626",
}


class AccentThemeAssetTests(SimpleTestCase):
    def test_design_system_defines_only_the_four_accent_themes(self):
        css = (APP_DIR / "static" / "css" / "app-ui.css").read_text(encoding="utf-8")
        js_boot = (APP_DIR / "templates" / "partials" / "_theme_boot.html").read_text(
            encoding="utf-8"
        )
        base = (APP_DIR / "templates" / "base.html").read_text(encoding="utf-8")

        themed_canvas = {
            "academic": "--app-bg: #f1f5fb",
            "green": "--app-bg: #f1faf4",
            "purple": "--app-bg: #f7f4fe",
            "red": "--app-bg: #fff5f5",
        }
        for theme in THEMES:
            self.assertIn(f'html[data-app-theme="{theme}"]', css)
            self.assertIn(THEME_BODY_CLASSES[theme], css)
            self.assertIn(THEME_COLORS[theme], css)
            self.assertIn(themed_canvas[theme], css)
            self.assertIn(f'data-theme="{theme}"', base)

        self.assertIn("preferredTheme", js_boot)
        self.assertIn("preferredTheme", base)
        self.assertIn("['academic', 'green', 'purple', 'red']", js_boot)
        self.assertIn("['academic', 'green', 'purple', 'red']", base)

        self.assertNotIn("data-bs-theme-value", base)
        self.assertNotRegex(
            base.lower(),
            r"dark mode|light mode|system mode|appearance switching",
        )
        self.assertNotIn("prefers-color-scheme", css)

    def test_legacy_theme_selectors_remain_available(self):
        css = (APP_DIR / "static" / "css" / "app-ui.css").read_text(encoding="utf-8")
        for selector in (
            ".theme-option",
            ".theme-color-dot.academic",
            ".theme-color-dot.green",
            ".theme-color-dot.purple",
            ".theme-color-dot.red",
            ".btn-primary",
            ".modal-content",
            ".dropdown-menu",
            ".progress-bar",
            "--app-content-wash",
        ):
            self.assertIn(selector, css)

    def test_authenticated_shell_uses_visible_theme_accents(self):
        styles = (APP_DIR / "templates" / "partials" / "_styles.html").read_text(
            encoding="utf-8"
        )
        boot = (APP_DIR / "templates" / "partials" / "_theme_boot.html").read_text(
            encoding="utf-8"
        )
        theme_files = {
            "academic": "academic_pro_theme.css",
            "green": "green_theme.css",
            "purple": "purple_theme.css",
            "red": "red_theme.css",
        }
        for theme, filename in theme_files.items():
            self.assertIn(f"css/{filename}", styles)
            self.assertIn(THEME_BODY_CLASSES[theme], boot)
            self.assertIn(f".{THEME_BODY_CLASSES[theme]} .app-header", (
                APP_DIR / "static" / "css" / filename
            ).read_text(encoding="utf-8"))

    def test_theme_styles_override_shared_content_component_defaults(self):
        theme_files = {
            "academic": "academic_pro_theme.css",
            "green": "green_theme.css",
            "purple": "purple_theme.css",
            "red": "red_theme.css",
        }
        content_rules = (
            ".app-content {",
            ".app-content .card-header {",
            ".app-content .btn-primary {",
            ".app-content .table > thead > tr > th {",
            ".app-content .form-control,",
        )

        for theme, filename in theme_files.items():
            css = (APP_DIR / "static" / "css" / filename).read_text(
                encoding="utf-8"
            )
            theme_class = THEME_BODY_CLASSES[theme]
            for rule in content_rules:
                marker = f".{theme_class} {rule}"
                rule_start = css.rfind(marker)
                self.assertNotEqual(rule_start, -1, f"{filename} missing {marker}")
                rule_end = css.index("}", rule_start)
                self.assertIn(
                    "!important",
                    css[rule_start:rule_end],
                    f"{filename} {marker} must override shared component styles",
                )


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AccentThemePageTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "Theme-System-Password-837!"
        cls.school = SchoolInformation.objects.create(
            name="Theme School",
            short_name="THM",
            slug="theme-school",
            address="Theme address",
            phone_number="5550300",
        )
        cls.superadmin = User.objects.create_user(
            username="theme-superadmin",
            email="theme-superadmin@example.test",
            password=cls.password,
            full_name="Theme Superadmin",
            role="superadmin",
        )
        cls.admin = User.objects.create_user(
            username="theme-admin",
            email="theme-admin@example.test",
            password=cls.password,
            full_name="Theme Admin",
            role="admin",
            school=cls.school,
        )
        academic_year = AcademicYear.objects.create(
            name="2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            school=cls.school,
        )
        class_obj = Class.objects.create(
            name="Theme Class",
            academic_year=academic_year,
            school=cls.school,
        )
        teacher = Teacher.objects.create(
            full_name="Theme Teacher",
            contact_number="5550310",
            school=cls.school,
        )
        cls.teacher_user = User.objects.get(teacher_profile=teacher)
        cls.teacher_user.set_password(cls.password)
        cls.teacher_user.save(update_fields=["password"])
        student = Student.objects.create(
            admission_number="TH-0001",
            full_name="Theme Student",
            date_of_birth="2010-01-01",
            gender="F",
            parent_contact="5550320",
            admission_date="2026-01-01",
            school=cls.school,
        )
        cls.student_user = User.objects.get(student_profile=student)
        cls.student_user.set_password(cls.password)
        cls.student_user.save(update_fields=["password"])
        StudentClass.objects.create(
            student=student,
            assigned_class=class_obj,
            school=cls.school,
        )

    def _assert_theme_picker(self, response):
        content = response.content.decode()
        self.assertContains(response, 'data-app-theme="academic"')
        self.assertContains(response, "preferredTheme")
        self.assertContains(response, 'class="app-theme-trigger"')
        for theme in THEMES:
            self.assertIn(f'data-theme="{theme}"', content)
        self.assertNotIn("data-bs-theme-value", content)
        self.assertNotIn("prefers-color-scheme", content)

    def test_login_pages_boot_saved_accent_theme(self):
        login = self.client.get(reverse("quiz_app:login"))
        superadmin_login = self.client.get(reverse("quiz_app:superadmin_login"))
        reset = self.client.get(reverse("quiz_app:password_reset"))
        self.assertEqual(login.status_code, 200)
        self.assertEqual(superadmin_login.status_code, 200)
        self.assertEqual(reset.status_code, 200)
        theme_stylesheets = (
            "academic_pro_theme.css",
            "green_theme.css",
            "purple_theme.css",
            "red_theme.css",
        )
        for response in (login, superadmin_login, reset):
            self.assertContains(response, "preferredTheme")
            self.assertContains(response, 'data-app-theme="academic"')
            self.assertContains(response, "css/app-ui.css")
            for stylesheet in theme_stylesheets:
                self.assertContains(response, f"css/{stylesheet}")

    def test_role_dashboards_keep_the_four_accent_options(self):
        cases = (
            (self.superadmin, reverse("quiz_app:superadmin_dashboard")),
            (self.admin, reverse("quiz_app:admin_dashboard")),
            (self.teacher_user, reverse("quiz_app:teacher_dashboard")),
            (self.student_user, reverse("quiz_app:student_dashboard")),
        )
        for user, url in cases:
            with self.subTest(role=user.role):
                self.client.force_login(user)
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self._assert_theme_picker(response)
                self.client.logout()
