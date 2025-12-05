# Create your models here.
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import random
import string
from datetime import date
from django.db.models import Q
from django.db.models.signals import post_save, pre_delete, post_delete
from django.dispatch import receiver
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.urls import reverse
import secrets
import logging
from django.apps import apps

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, Count, Avg
import json


def generate_unique_id(entity_type=None, length=5):
    """
    Generate a unique numeric ID based on entity type.

    Parameters:
    entity_type (str): Type of entity ('student', 'teacher', 'class', etc.)
    length (int): Length of the random part of the ID

    Returns:
    str: A unique ID with appropriate prefix and format
    """
    # Get current date components for potential use in IDs
    from datetime import datetime

    current_year = datetime.now().year
    year_short = str(current_year)[-2:]  # Last two digits of year

    # Generate random numeric component
    random_part = "".join(random.choices(string.digits, k=length))

    # Format based on entity type
    if entity_type == "student":
        return f"ST-{year_short}{random_part}"
    elif entity_type == "teacher":
        return f"TE-{random_part}"
    elif entity_type == "class":
        return f"CL-{random_part}"
    elif entity_type == "subject":
        return f"SB-{random_part}"
    elif entity_type == "assignment":
        return f"AS-{random_part}"
    elif entity_type == "assessment":
        return f"EV-{random_part}"
    elif entity_type == "class_subject":
        return f"CS-{random_part}"
    else:
        # Default format for other types
        return "".join(random.choices(string.digits, k=length))


def generate_secure_password(length=12):
    """Generate a secure password with minimum requirements."""
    # Define character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special_chars = "!@#$%^&*"

    # Ensure at least one character from each set
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special_chars),
    ]

    # Fill the rest with random characters from all sets
    all_chars = lowercase + uppercase + digits + special_chars
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))

    # Shuffle the password characters
    password_list = list(password)
    secrets.SystemRandom().shuffle(password_list)

    return "".join(password_list)


def send_user_credentials_email(user, password):
    """
    Send email with login credentials to the user.
    """
    try:
        # Get school information
        school_info = SchoolInformation.get_active()

        # Build the login URL
        login_url = f"{settings.SITE_URL}{reverse('login')}"

        # Prepare context for email template
        context = {
            "user": user,
            "password": password,
            "school_name": (
                school_info.name if school_info else "School Management System"
            ),
            "school_address": school_info.address if school_info else "",
            "login_url": login_url,
        }

        # Render email template
        email_html = render_to_string("emails/user_credentials.html", context)

        # Send email
        send_mail(
            subject=f'Your {context["school_name"]} Account Credentials',
            message=f"Your username is {user.username} and password is {password}. Please login at {login_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=email_html,
            fail_silently=False,
        )

        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False


class User(AbstractUser):
    ROLES = (
        ("admin", "Administrator"),
        ("teacher", "Teacher"),
        ("student", "Student"),
        ("superadmin", "Super Administrator"),
    )
    role = models.CharField(max_length=20, choices=ROLES)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    # Nullable foreign keys to Teacher and Student
    teacher_profile = models.OneToOneField(
        "Teacher", on_delete=models.SET_NULL, null=True, blank=True
    )
    student_profile = models.OneToOneField(
        "Student", on_delete=models.SET_NULL, null=True, blank=True
    )
    # School association for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )

    # For super admin users who manage multiple schools
    is_superadmin = models.BooleanField(default=False)

    # Last login tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_active = models.DateTimeField(null=True, blank=True)

    # Add related_name to resolve conflicts
    groups = models.ManyToManyField(
        "auth.Group", related_name="quiz_center_users", blank=True
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission", related_name="quiz_center_users", blank=True
    )

    def __str__(self):
        if self.role == "teacher" and self.teacher_profile:
            return f"{self.teacher_profile.full_name} ({self.get_role_display()})"
        elif self.role == "student" and self.student_profile:
            return f"{self.student_profile.full_name} ({self.get_role_display()})"
        return f"{self.username} ({self.get_role_display()})"

    def is_school_admin(self):
        """Check if user is a school administrator"""
        return self.role == "admin" and self.school is not None

    def get_administered_schools(self):
        """Get schools administered by this user"""
        if self.is_superadmin:
            return SchoolInformation.objects.all()
        elif self.is_school_admin():
            return SchoolInformation.objects.filter(pk=self.school.pk)
        return SchoolInformation.objects.none()

    def update_last_login(self, ip_address):
        """Update last login information"""
        self.last_login_ip = ip_address
        self.last_active = timezone.now()
        self.save(update_fields=["last_login_ip", "last_active"])

    @classmethod
    def get_by_email_or_username(cls, identifier):
        """Get user by email or username"""
        try:
            # First try to find by username
            return cls.objects.get(username=identifier)
        except cls.DoesNotExist:
            try:
                # Then try by email
                return cls.objects.get(email=identifier)
            except cls.DoesNotExist:
                return None


class AcademicYear(models.Model):
    name = models.CharField(max_length=20)  # e.g., "2024/2025"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="academic_years",
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["is_current"]),
            models.Index(fields=["school", "is_current"]),
        ]
        # Ensure academic years are unique per school
        unique_together = ["name", "school"]

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Start date must be before end date.")

    def save(self, *args, **kwargs):
        # If marked as current, make sure only one academic year is current per school
        if self.is_current:
            AcademicYear.objects.filter(school=self.school, is_current=True).exclude(
                pk=self.pk
            ).update(is_current=False)
        super().save(*args, **kwargs)

    def get_duration(self):
        return (self.end_date - self.start_date).days

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.name} ({school_name})"


class Term(models.Model):
    TERMS = ((1, "First Term"), (2, "Second Term"), (3, "Third Term"))

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    term_number = models.SmallIntegerField(choices=TERMS)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    # School is referenced through academic_year, but add a direct link for queries
    school = models.ForeignKey(
        "SchoolInformation", on_delete=models.CASCADE, related_name="terms", null=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["academic_year", "term_number"], name="unique_term"
            )
        ]
        indexes = [
            models.Index(fields=["is_current"]),
            models.Index(fields=["academic_year", "is_current"]),
            models.Index(fields=["school", "is_current"]),
        ]

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError("Start date must be before end date.")

        # Make sure term belongs to the same school as its academic year
        if (
            self.academic_year
            and self.school
            and self.academic_year.school != self.school
        ):
            raise ValidationError(
                "Term's school must match its academic year's school."
            )

    def save(self, *args, **kwargs):
        # Set school from academic year if not explicitly provided
        if self.academic_year and not self.school:
            self.school = self.academic_year.school

        # If marked as current, ensure only one term is current per school
        if self.is_current:
            Term.objects.filter(school=self.school, is_current=True).exclude(
                pk=self.pk
            ).update(is_current=False)
        super().save(*args, **kwargs)

    def get_duration(self):
        return (self.end_date - self.start_date).days

    def __str__(self):
        return f"{self.academic_year} - {self.get_term_number_display()}"


class Form(models.Model):
    """Model to represent the different forms/grade levels in the school system."""

    form_number = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=50)  # e.g., "SHS 1", "SHS 2", "SHS 3"
    description = models.TextField(blank=True, null=True)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="forms",
        null=True,
    )

    class Meta:
        ordering = ["form_number"]
        indexes = [
            models.Index(fields=["form_number"]),
            models.Index(fields=["school", "form_number"]),
        ]
        # Ensure form numbers are unique per school
        unique_together = ["form_number", "school"]

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.name} ({school_name})"


class LearningArea(models.Model):
    """Model to represent different learning areas/programs offered."""

    code = models.CharField(max_length=30)  # e.g., "general_arts"
    name = models.CharField(max_length=100)  # e.g., "General Arts"
    description = models.TextField(blank=True, null=True)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="learning_areas",
        null=True,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["school", "code"]),
        ]
        # Ensure codes are unique per school
        unique_together = ["code", "school"]

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.name} ({school_name})"


class Department(models.Model):
    """Model to represent different departments within the school."""

    name = models.CharField(max_length=100)  # e.g., "Mathematics Department"
    code = models.CharField(max_length=10)  # e.g., "MATH"
    description = models.TextField(blank=True, null=True)
    head_of_department = models.ForeignKey(
        "Teacher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_department",
    )
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="departments",
        null=True,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["school", "code"]),
        ]
        # Ensure codes are unique per school
        unique_together = ["code", "school"]

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.name} ({school_name})"


class Teacher(models.Model):
    GENDER_CHOICES = (
        ("M", "Male"),
        ("F", "Female"),
    )

    full_name = models.CharField(max_length=100)
    staff_id = models.CharField(max_length=10, unique=True, editable=False)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    gender = models.CharField(
        max_length=1, choices=GENDER_CHOICES, blank=True, null=True
    )
    contact_number = models.CharField(max_length=15)
    email = models.EmailField(max_length=100, blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/teachers/", null=True, blank=True
    )
    skip_user_creation = models.BooleanField(
        default=False, editable=False
    )  # Flag to skip automatic user creation
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="teachers",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["staff_id"]),
            models.Index(fields=["school"]),
            models.Index(fields=["department"]),
        ]

    def save(self, *args, **kwargs):
        if not self.staff_id:
            self.staff_id = generate_unique_id(entity_type="teacher", length=6)

        # Ensure teacher gets same school as its department if provided
        if not self.school and self.department and self.department.school:
            self.school = self.department.school

        super().save(*args, **kwargs)

    def get_assigned_classes(self, academic_year=None, term=None):
        query = self.teachersubjectassignment_set.filter(is_active=True)
        if academic_year:
            query = query.filter(academic_year=academic_year)
        if term:
            query = query.filter(term=term)
        return query

    def can_enter_scores(self, class_obj, subject):
        return self.teachersubjectassignment_set.filter(
            class_assigned=class_obj, subject=subject, is_active=True
        ).exists()

    def total_assigned_classes(self):
        return self.teachersubjectassignment_set.filter(is_active=True).count()

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.full_name} ({self.staff_id}) - {school_name}"


class Student(models.Model):
    GENDER_CHOICES = (
        ("M", "Male"),
        ("F", "Female"),
    )

    admission_number = models.CharField(max_length=10, unique=True)
    full_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    parent_contact = models.CharField(max_length=15)
    admission_date = models.DateField()
    profile_picture = models.ImageField(
        upload_to="profile_pictures/students/", null=True, blank=True
    )
    form = models.ForeignKey(Form, on_delete=models.SET_NULL, null=True, blank=True)
    learning_area = models.ForeignKey(
        LearningArea, on_delete=models.SET_NULL, null=True, blank=True
    )
    email = models.EmailField(max_length=100, blank=True, null=True)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="students",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["admission_number"]),
            models.Index(fields=["learning_area"]),
            models.Index(fields=["form"]),
            models.Index(fields=["school"]),
        ]

    def save(self, *args, **kwargs):
        if not self.admission_number:
            self.admission_number = generate_unique_id(entity_type="student", length=5)

        # Ensure student gets same school as its form or learning area if provided
        if not self.school:
            if self.form and self.form.school:
                self.school = self.form.school
            elif self.learning_area and self.learning_area.school:
                self.school = self.learning_area.school

        super().save(*args, **kwargs)

    def get_current_class(self):
        current_class = self.studentclass_set.filter(is_active=True).first()
        return current_class.assigned_class if current_class else None

    def get_class_history(self):
        return self.studentclass_set.all().order_by("-date_assigned")

    @property
    def current_form(self):
        current_class = self.get_current_class()
        return current_class.form if current_class else self.form

    @property
    def current_learning_area(self):
        current_class = self.get_current_class()
        return current_class.learning_area if current_class else self.learning_area

    def calculate_age(self):
        today = date.today()
        return (
            today.year
            - self.date_of_birth.year
            - (
                (today.month, today.day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.full_name} ({self.admission_number}) - {school_name}"

    # Add this method to the Student model class
    def debug_get_current_class(self):
        """Debug method to diagnose issues with get_current_class"""
        logger = logging.getLogger(__name__)

        logger.info(
            f"Debugging get_current_class for student: {self.full_name} (ID: {self.id})"
        )

        # Check if StudentClass model exists
        try:
            logger.info("StudentClass model exists")
        except LookupError:
            logger.error("StudentClass model does not exist")
            return None

        # Get all class assignments for this student
        all_assignments = StudentClass.objects.filter(student=self)
        logger.info(f"Total class assignments found: {all_assignments.count()}")

        # Get active class assignments
        active_assignments = all_assignments.filter(is_active=True)
        logger.info(f"Active class assignments found: {active_assignments.count()}")

        # Log details of each assignment
        for idx, assignment in enumerate(all_assignments):
            logger.info(f"Assignment {idx+1}:")
            logger.info(
                f"  - Class: {assignment.assigned_class.name if assignment.assigned_class else 'None'}"
            )
            logger.info(f"  - Active: {assignment.is_active}")
            logger.info(f"  - Date Assigned: {assignment.date_assigned}")
            logger.info(
                f"  - School: {assignment.school.name if assignment.school else 'None'}"
            )

        # Get the current class using the original method
        current_class = self.get_current_class()
        if current_class:
            logger.info(
                f"Current class found: {current_class.name} (ID: {current_class.id})"
            )
        else:
            logger.info("No current class found")

        return current_class


class Class(models.Model):
    class_id = models.CharField(max_length=10, unique=True, editable=False)
    name = models.CharField(max_length=20)  # e.g., "1Science", "2Art1"
    form = models.ForeignKey(Form, on_delete=models.SET_NULL, null=True)
    learning_area = models.ForeignKey(
        LearningArea, on_delete=models.SET_NULL, null=True
    )
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    maximum_students = models.SmallIntegerField(default=40)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="classes",
        null=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "academic_year"], name="unique_class_name_academic_year"
            )
        ]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["form"]),
            models.Index(fields=["learning_area"]),
            models.Index(fields=["academic_year"]),
            models.Index(fields=["school"]),
        ]

    def save(self, *args, **kwargs):
        if not self.class_id:
            self.class_id = generate_unique_id("CLS")

        # Ensure class gets same school as its form, learning area, or academic year
        if not self.school:
            if self.form and self.form.school:
                self.school = self.form.school
            elif self.learning_area and self.learning_area.school:
                self.school = self.learning_area.school
            elif self.academic_year and self.academic_year.school:
                self.school = self.academic_year.school

        super().save(*args, **kwargs)

    def get_current_student_count(self):
        return StudentClass.objects.filter(assigned_class=self, is_active=True).count()

    def is_class_full(self):
        return self.get_current_student_count() >= self.maximum_students

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.name} ({school_name})"


class ClassTeacher(models.Model):
    """
    Tracks the assignment of teachers to classes with history and status.
    Similar to TeacherSubjectAssignment but specifically for class teacher role.
    """

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    date_assigned = models.DateField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="class_teachers",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["teacher", "is_active"]),
            models.Index(fields=["class_assigned", "academic_year", "is_active"]),
            models.Index(fields=["academic_year", "is_active"]),
            models.Index(fields=["school", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.is_active:
            existing = ClassTeacher.objects.filter(
                class_assigned=self.class_assigned,
                academic_year=self.academic_year,
                is_active=True,
                school=self.school,  # Add school filter for multi-tenancy
            ).exclude(pk=self.pk)

            if existing.exists():
                raise ValidationError(
                    f"There is already an active class teacher for {self.class_assigned} "
                    f"for {self.academic_year}."
                )

    def save(self, *args, **kwargs):
        # Ensure class teacher assignment gets school from teacher, class, or academic year
        if not self.school:
            if self.teacher and self.teacher.school:
                self.school = self.teacher.school
            elif self.class_assigned and self.class_assigned.school:
                self.school = self.class_assigned.school
            elif self.academic_year and self.academic_year.school:
                self.school = self.academic_year.school

        super().save(*args, **kwargs)

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.teacher.full_name} - Class Teacher for {self.class_assigned.name} ({school_name})"


class StudentClass(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    assigned_class = models.ForeignKey(Class, on_delete=models.CASCADE)
    date_assigned = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="student_classes",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["student", "is_active"]),
            models.Index(fields=["assigned_class", "is_active"]),
            models.Index(fields=["student", "assigned_class", "is_active"]),
            models.Index(fields=["school", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.is_active:
            existing = StudentClass.objects.filter(
                student=self.student, is_active=True, school=self.school
            ).exclude(pk=self.pk)

            if existing.exists():
                raise ValidationError(
                    f"Student {self.student} is already assigned to an active class in this school."
                )

    def save(self, *args, **kwargs):
        # Ensure student class gets school from student, assigned class, or assigned_by
        if not self.school:
            if self.student and self.student.school:
                self.school = self.student.school
            elif self.assigned_class and self.assigned_class.school:
                self.school = self.assigned_class.school
            elif self.assigned_by and self.assigned_by.school:
                self.school = self.assigned_by.school

        super().save(*args, **kwargs)

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.student} - {self.assigned_class} ({school_name})"


class Subject(models.Model):
    subject_code = models.CharField(max_length=10, unique=True, editable=False)
    subject_name = models.CharField(max_length=100)
    learning_area = models.ForeignKey(
        LearningArea, on_delete=models.SET_NULL, null=True
    )  # Changed to ForeignKey
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, null=True, blank=True
    )
    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="subjects",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["learning_area"]),
            models.Index(fields=["department"]),
            models.Index(fields=["school"]),
        ]
        # Ensure subject codes are unique per school
        unique_together = ["subject_code", "school"]

    def save(self, *args, **kwargs):
        if not self.subject_code:
            self.subject_code = generate_unique_id(entity_type="subject", length=5)

        # Ensure subject gets same school as its department or learning area if provided
        if not self.school:
            if self.department and self.department.school:
                self.school = self.department.school
            elif self.learning_area and self.learning_area.school:
                self.school = self.learning_area.school

        super().save(*args, **kwargs)

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return f"{self.subject_code} - {self.subject_name} ({school_name})"


class TeacherSubjectAssignment(models.Model):
    assignment_id = models.CharField(max_length=10, unique=True, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    date_assigned = models.DateField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)

    # Add new fields for tracking assignment history
    last_modified = models.DateTimeField(auto_now=True)
    previous_teacher = models.ForeignKey(
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="previous_assignments",
    )
    assignment_history = models.JSONField(default=list, blank=True)

    # Add school relationship for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="teacher_subject_assignments",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["teacher", "is_active"]),
            models.Index(fields=["class_assigned", "subject", "is_active"]),
            models.Index(fields=["academic_year", "is_active"]),
            models.Index(
                fields=["subject", "class_assigned", "academic_year", "is_active"]
            ),
            models.Index(fields=["school", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.is_active:
            existing = TeacherSubjectAssignment.objects.filter(
                subject=self.subject,
                class_assigned=self.class_assigned,
                academic_year=self.academic_year,
                is_active=True,
                school=self.school,  # Add school filter for multi-tenancy
            ).exclude(pk=self.pk)

            if existing.exists():
                raise ValidationError(
                    f"There is already an active assignment for {self.subject} in {self.class_assigned} "
                    f"for {self.academic_year}."
                )

    def save(self, *args, **kwargs):
        if not self.assignment_id:
            self.assignment_id = generate_unique_id(entity_type="assignment", length=5)

        # Ensure assignment gets school from teacher, subject, class, or academic year
        if not self.school:
            if self.teacher and self.teacher.school:
                self.school = self.teacher.school
            elif self.subject and self.subject.school:
                self.school = self.subject.school
            elif self.class_assigned and self.class_assigned.school:
                self.school = self.class_assigned.school
            elif self.academic_year and self.academic_year.school:
                self.school = self.academic_year.school

        # Track assignment history when a teacher is changed
        if self.pk:  # If this is an update
            try:
                old_instance = TeacherSubjectAssignment.objects.get(pk=self.pk)
                if old_instance.teacher != self.teacher:
                    self.previous_teacher = old_instance.teacher

                    # Add to assignment history
                    history_entry = {
                        "date": date.today().isoformat(),
                        "previous_teacher_id": old_instance.teacher.staff_id,
                        "previous_teacher_name": old_instance.teacher.full_name,
                        "new_teacher_id": self.teacher.staff_id,
                        "new_teacher_name": self.teacher.full_name,
                        "action": "reassigned",
                    }

                    if isinstance(self.assignment_history, list):
                        self.assignment_history.append(history_entry)
                    else:
                        self.assignment_history = [history_entry]
            except TeacherSubjectAssignment.DoesNotExist:
                pass

        super().save(*args, **kwargs)

    @classmethod
    def get_teacher_workload(cls, teacher_id, academic_year=None, school=None):
        """
        Get a summary of a teacher's workload

        Args:
            teacher_id: The ID of the teacher
            academic_year: Optional academic year filter
            school: Optional school filter for multi-tenancy

        Returns:
            dict: Summary of teacher's workload
        """
        query = cls.objects.filter(teacher__staff_id=teacher_id, is_active=True)

        if academic_year:
            query = query.filter(academic_year=academic_year)

        if school:
            query = query.filter(school=school)

        # Group by class and count subjects
        class_summary = {}
        for assignment in query:
            class_name = assignment.class_assigned.name
            if class_name not in class_summary:
                class_summary[class_name] = {
                    "class_id": assignment.class_assigned.id,
                    "subjects": [],
                }

            class_summary[class_name]["subjects"].append(
                {
                    "subject_id": assignment.subject.id,
                    "subject_name": assignment.subject.subject_name,
                    "assignment_id": assignment.assignment_id,
                }
            )

        return {
            "total_classes": len(class_summary),
            "total_subjects": query.count(),
            "class_details": class_summary,
        }

    def __str__(self):
        school_name = self.school.name if self.school else "Unknown"
        return (
            f"{self.teacher} - {self.subject} - {self.class_assigned} ({school_name})"
        )


class ClassSubject(models.Model):
    class_subject_id = models.CharField(max_length=10, unique=True, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    class_name = models.ForeignKey(Class, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    # Add direct school field for multi-tenancy
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="class_subjects",
        null=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["subject", "class_name", "academic_year"],
                name="unique_class_subject",
            )
        ]
        indexes = [
            models.Index(fields=["subject"]),
            models.Index(fields=["class_name"]),
            models.Index(fields=["academic_year"]),
            models.Index(fields=["school"]),
        ]

    def save(self, *args, **kwargs):
        if not self.class_subject_id:
            self.class_subject_id = generate_unique_id("CS")

        # Automatically set school from related models if not provided
        if not self.school:
            if self.class_name and self.class_name.school:
                self.school = self.class_name.school
            elif self.subject and self.subject.school:
                self.school = self.subject.school

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.subject.subject_name} in {self.class_name.name} ({self.academic_year.name})"


class SchoolAuthoritySignature(models.Model):
    """
    Model to store signatures of different school authorities that can appear on reports.
    """

    AUTHORITY_TYPES = (
        ("headmaster", "Headmaster/Principal"),
        ("academic_head", "Academic Headmaster"),
        ("deputy_head", "Deputy Headmaster"),
        ("exam_officer", "Examination Officer"),
        ("other", "Other Authority"),
    )

    authority_type = models.CharField(max_length=20, choices=AUTHORITY_TYPES)
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=100)
    signature = models.ImageField(upload_to="static/signatures/")
    is_active = models.BooleanField(default=True)
    custom_title = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Custom title if 'Other Authority' is selected",
    )

    # Link to school information
    school = models.ForeignKey(
        "SchoolInformation",
        on_delete=models.CASCADE,
        related_name="authority_signatures",
    )

    # Metadata
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("school", "authority_type")
        verbose_name = "School Authority Signature"
        verbose_name_plural = "School Authority Signatures"

    def clean(self):
        if self.authority_type == "other" and not self.custom_title:
            raise ValidationError(
                "Custom title is required when 'Other Authority' is selected."
            )

    def display_title(self):
        """Return the appropriate title to display."""
        if self.authority_type == "other":
            return self.custom_title
        return self.get_authority_type_display()

    def __str__(self):
        return f"{self.name} - {self.display_title()}"


class SchoolInformation(models.Model):
    """
    Model to store school information that can be used in reports and official documents.
    Modified to support multiple schools in a multi-tenant architecture.
    """

    name = models.CharField(max_length=100)
    short_name = models.CharField(
        max_length=20, help_text="Abbreviation or short name of the school"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-friendly version of the school name, used in subdomains",
        default="default-school",  # Add a default value
    )
    address = models.TextField()
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)

    # School identifiers
    school_code = models.CharField(
        max_length=20, blank=True, null=True, help_text="Official school code/ID"
    )

    # Visual elements
    logo = models.ImageField(upload_to="static/school_image/", blank=True, null=True)
    school_stamp = models.ImageField(
        upload_to="static/school_image/", blank=True, null=True
    )

    # Report card elements
    report_header = models.TextField(
        blank=True, null=True, help_text="Custom header text for reports"
    )
    report_footer = models.TextField(
        blank=True, null=True, help_text="Custom footer text for reports"
    )

    # School motto and vision
    motto = models.CharField(max_length=200, blank=True, null=True)
    vision = models.TextField(blank=True, null=True)
    mission = models.TextField(blank=True, null=True)

    # System settings
    grading_system_description = models.TextField(
        blank=True,
        null=True,
        help_text="Description of the grading system to appear on reports",
    )

    # Current Term and Academic Year Settings
    current_academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_for_school",
    )
    current_term = models.ForeignKey(
        Term,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_for_school",
    )

    # Active flag (now indicates if the school is active, not singleton pattern)
    is_active = models.BooleanField(default=True)

    # Metadata
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_school_info"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="updated_school_info"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "School Information"
        verbose_name_plural = "School Information"

    def save(self, *args, **kwargs):
        """
        Update the active status of related academic year and term records.
        """
        # Generate slug if not provided
        if not self.slug:
            self.slug = slugify(self.name)

        # Save the object first
        super().save(*args, **kwargs)

        # Update current academic year status
        if self.current_academic_year:
            # Turn off is_current for all other academic years for this school
            AcademicYear.objects.filter(
                school=self,
                is_current=True,
            ).exclude(
                pk=self.current_academic_year.pk
            ).update(is_current=False)

            # Set the selected academic year as current
            AcademicYear.objects.filter(pk=self.current_academic_year.pk).update(
                is_current=True
            )

        # Update current term status
        if self.current_term:
            # Turn off is_current for all terms for this school
            Term.objects.filter(
                school=self,
                is_current=True,
            ).exclude(
                pk=self.current_term.pk
            ).update(is_current=False)

            # Set the selected term as current
            Term.objects.filter(pk=self.current_term.pk).update(is_current=True)

    def get_signature(self, authority_type):
        """Get the active signature for a specific authority type."""
        try:
            return self.authority_signatures.get(
                authority_type=authority_type, is_active=True
            )
        except SchoolAuthoritySignature.DoesNotExist:
            return None

    @property
    def headmaster_signature(self):
        """Convenience method to get the headmaster's signature."""
        return self.get_signature("headmaster")

    @property
    def academic_head_signature(self):
        """Convenience method to get the academic headmaster's signature."""
        return self.get_signature("academic_head")

    @classmethod
    def get_active(cls):
        """
        Get the active school information record.
        This method is maintained for backward compatibility.
        In multi-tenant context, it should be called with a school parameter.
        """
        try:
            return cls.objects.filter(is_active=True).first()
        except cls.DoesNotExist:
            # Return the most recently updated record if no active record exists
            return cls.objects.order_by("-last_updated").first()

    @classmethod
    def get_school_by_slug(cls, slug):
        """Get a school by its slug."""
        try:
            return cls.objects.get(slug=slug, is_active=True)
        except cls.DoesNotExist:
            return None

    @classmethod
    def get_current_academic_year(cls, school=None):
        """Get the current academic year for a specific school."""
        if school:
            # First check if the school has a current academic year set directly
            if school.current_academic_year:
                return school.current_academic_year

            # If not, look for an academic year marked as current for this school
            current_year = AcademicYear.objects.filter(
                school=school, is_current=True
            ).first()
            if current_year:
                return current_year

        # For superadmins or if no school-specific year is found
        if not school:
            # Return any academic year marked as current (for superadmins)
            return AcademicYear.objects.filter(is_current=True).first()

        # If we get here, there's no current academic year for this school
        return None

    @classmethod
    def get_current_term(cls, school=None):
        """Get the current term for a specific school."""
        if school:
            if school.current_term:
                return school.current_term
        # Fallback to the term marked as current
        return Term.objects.filter(is_current=True).first()

    def __str__(self):
        return self.name


# Helper functions for easy access to current settings
def get_current_academic_year():
    """Helper function to get the current academic year."""
    return SchoolInformation.get_current_academic_year()


def get_current_term():
    """Helper function to get the current term."""
    return SchoolInformation.get_current_term()


@receiver(post_save, sender=Student)
def create_student_user(sender, instance, created, **kwargs):
    """
    Create a user account for a newly created student.

    This function creates a user account when a new student is created,
    with username based on admission number and a secure random password.
    The credentials are sent to the student via email.
    """
    if created:
        # Check if a user already exists for this student
        if User.objects.filter(student_profile=instance).exists():
            return  # User already exists, don't create another one

        # Use admission number as username
        username = instance.admission_number

        # Check if a user with this username already exists
        if User.objects.filter(username=username).exists():
            # Append a random string to ensure uniqueness
            raise ValidationError(
                "A user with this admission number already exists. Please use a different admission number."
            )

        # Generate secure password
        password = generate_secure_password()

        # Create user account with school field set from student
        user = User.objects.create(
            username=username,
            email=instance.email
            or f"{instance.admission_number}@example.com",  # Use email if available or generate one
            full_name=instance.full_name,
            role="student",
            password=make_password(password),
            student_profile=instance,
            school=instance.school,  # Set the school from the student instance
        )

        # Store the plain password temporarily for sending to the student
        instance.temp_password = password

        # Send credentials via email if student has email
        if instance.email:
            send_user_credentials_email(user, password)


@receiver(pre_delete, sender=Student)
def delete_student_user(sender, instance, **kwargs):
    """
    Delete associated user account when a student is deleted.

    This signal handler ensures that when a student record is deleted,
    the corresponding user account is also deleted to maintain data integrity.
    """
    # Find and delete the associated user account
    User.objects.filter(student_profile=instance).delete()


@receiver(post_save, sender=Teacher)
def create_teacher_user(sender, instance, created, **kwargs):
    """
    Create a user account for a newly created teacher.

    This function creates a user account when a new teacher is created,
    with username based on staff_id and a secure random password.
    The credentials are sent to the teacher via email.
    """
    if created and not instance.skip_user_creation:
        # Check if a user already exists for this teacher
        if User.objects.filter(teacher_profile=instance).exists():
            return  # User already exists, don't create another one

        # Use staff_id as username
        username = instance.staff_id

        # Check if a user with this username already exists
        if User.objects.filter(username=username).exists():
            # Raise error if username already exists
            raise ValidationError(
                "A user with this staff ID already exists. Please use a different staff ID."
            )

        # Generate secure password
        password = generate_secure_password()

        # Create user account
        user = User.objects.create(
            username=username,
            email=instance.email
            or f"{instance.staff_id}@example.com",  # Use email if available or generate one
            full_name=instance.full_name,
            role="teacher",
            password=make_password(password),
            teacher_profile=instance,
            school=instance.school,  # Set the school from the teacher instance
        )

        # Store the plain password temporarily for sending to the teacher
        instance.temp_password = password

        # Send credentials via email if teacher has email
        if instance.email:
            send_user_credentials_email(user, password)


@receiver(pre_delete, sender=Teacher)
def delete_teacher_user(sender, instance, **kwargs):
    """
    Delete associated user account when a teacher is deleted.

    This signal handler ensures that when a teacher record is deleted,
    the corresponding user account is also deleted to maintain data integrity.
    """
    # Find and delete the associated user account
    User.objects.filter(teacher_profile=instance).delete()


# Add model for centralized OAuth credentials storage
class OAuthCredentialStore(models.Model):
    """Store OAuth credentials for service accounts"""

    service_name = models.CharField(max_length=100, unique=True)
    client_id = models.CharField(max_length=255)
    client_secret = models.CharField(max_length=255)
    refresh_token = models.TextField()
    access_token = models.TextField(blank=True, null=True)
    token_uri = models.CharField(
        max_length=255, default="https://oauth2.googleapis.com/token"
    )
    scopes = models.JSONField(default=list)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.service_name} - {self.email}"

    @classmethod
    def get_email_credentials(cls):
        """Get credentials for email service"""
        return cls.objects.filter(service_name="gmail", is_active=True).first()


# Add these models at the end of the file, before any closing comments
class QuizCategory(models.Model):
    """Categories for organizing quizzes"""

    name = models.CharField(
        max_length=100, help_text="Category name (e.g., 'Midterm Exam', 'Practice Quiz')"
    )
    description = models.TextField(
        blank=True, null=True, help_text="Detailed description of the category"
    )
    color = models.CharField(
        max_length=7,
        default="#3B82F6",
        help_text="Hex color code for UI display (e.g., #3B82F6)",
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Icon class name for UI (e.g., 'fa-book', 'bi-book')",
    )
    is_active = models.BooleanField(
        default=True, help_text="Whether this category is currently active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quiz_categories",
        help_text="School this category belongs to",
    )

    class Meta:
        verbose_name = "Quiz Category"
        verbose_name_plural = "Quiz Categories"
        unique_together = [["name", "school"]]
        ordering = ["name"]
        indexes = [
            models.Index(fields=["school", "is_active"]),
            models.Index(fields=["name", "school"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.school.name}"

    def get_quiz_count(self):
        """Get the count of active quizzes in this category"""
        return Quiz.objects.filter(category=self, is_active=True, status="published").count()

    def get_published_quiz_count(self):
        """Get the count of published quizzes in this category"""
        return Quiz.objects.filter(
            category=self, is_active=True, status="published"
        ).count()


class Quiz(models.Model):
    """Main quiz model with comprehensive features for quiz management"""

    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    quiz_id = models.CharField(
        max_length=15, unique=True, editable=False, help_text="Unique quiz identifier"
    )
    title = models.CharField(
        max_length=200, help_text="Quiz title (e.g., 'Mathematics Midterm Exam')"
    )
    description = models.TextField(
        blank=True, null=True, help_text="Detailed description of the quiz"
    )
    instructions = models.TextField(
        blank=True,
        null=True,
        help_text="Instructions for students taking the quiz",
    )
    slug = models.SlugField(
        max_length=220, unique=True, blank=True, help_text="URL-friendly identifier"
    )

    # Relationships
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="quizzes",
        help_text="Subject this quiz belongs to",
    )
    category = models.ForeignKey(
        QuizCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
        help_text="Category for organizing quizzes",
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="created_quizzes",
        help_text="Teacher who created this quiz",
    )
    classes = models.ManyToManyField(
        Class,
        related_name="assigned_quizzes",
        blank=True,
        help_text="Classes assigned to take this quiz",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
        help_text="Academic year this quiz belongs to",
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
        help_text="Term this quiz belongs to",
    )

    # Quiz settings
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default="medium",
        help_text="Overall difficulty level of the quiz",
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="draft",
        help_text="Current status of the quiz",
    )
    time_limit = models.PositiveIntegerField(
        help_text="Time limit in minutes (0 for unlimited)", default=60
    )
    total_marks = models.PositiveIntegerField(
        default=0, help_text="Total marks for the quiz (auto-calculated)"
    )
    passing_marks = models.PositiveIntegerField(
        default=0, help_text="Minimum marks required to pass"
    )

    # Availability settings
    available_from = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when quiz becomes available",
    )
    available_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when quiz becomes unavailable",
    )
    max_attempts = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of attempts allowed per student",
    )

    # Quiz behavior
    randomize_questions = models.BooleanField(
        default=False, help_text="Randomize question order for each attempt"
    )
    randomize_answers = models.BooleanField(
        default=False, help_text="Randomize answer choices order"
    )
    show_results_immediately = models.BooleanField(
        default=True, help_text="Show results immediately after submission"
    )
    show_correct_answers = models.BooleanField(
        default=True, help_text="Show correct answers after completion"
    )
    allow_review = models.BooleanField(
        default=True, help_text="Allow students to review their answers"
    )
    require_password = models.BooleanField(
        default=False, help_text="Require password to access quiz"
    )
    quiz_password = models.CharField(
        max_length=100, blank=True, null=True, help_text="Password to access quiz"
    )

    # Metadata
    is_active = models.BooleanField(
        default=True, help_text="Whether this quiz is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Multi-tenancy
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quizzes",
        help_text="School this quiz belongs to",
    )

    class Meta:
        verbose_name = "Quiz"
        verbose_name_plural = "Quizzes"
        indexes = [
            models.Index(fields=["subject", "status"]),
            models.Index(fields=["teacher", "status"]),
            models.Index(fields=["school", "status"]),
            models.Index(fields=["academic_year", "term", "status"]),
            models.Index(fields=["available_from", "available_until"]),
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(passing_marks__lte=models.F("total_marks")),
                name="passing_marks_not_exceed_total",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.quiz_id:
            self.quiz_id = generate_unique_id("QZ", length=8)

        if not self.slug:
            base_slug = slugify(self.title)
            self.slug = f"{base_slug}-{self.quiz_id}"[:220]

        # Set school from subject if not provided
        if not self.school and self.subject:
            self.school = self.subject.school

        # Set academic_year and term from school if not provided
        if not self.academic_year and self.school:
            self.academic_year = self.school.current_academic_year
        if not self.term and self.school:
            self.term = self.school.current_term

        # Ensure term belongs to academic_year
        if self.term and self.academic_year:
            if self.term.academic_year != self.academic_year:
                self.term = None

        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        # Validate availability dates
        if self.available_from and self.available_until:
            if self.available_from >= self.available_until:
                errors["available_until"] = ValidationError(
                    "Available until date must be after available from date"
                )

        # Validate passing marks
        if self.passing_marks > self.total_marks:
            errors["passing_marks"] = ValidationError(
                "Passing marks cannot exceed total marks"
            )

        # Validate password requirement
        if self.require_password and not self.quiz_password:
            errors["quiz_password"] = ValidationError(
                "Password is required when 'Require password' is enabled"
            )

        # Validate time limit
        if self.time_limit < 0:
            errors["time_limit"] = ValidationError("Time limit cannot be negative")

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.title} - {self.subject.subject_name}"

    def is_available(self, student=None):
        """Check if quiz is currently available for a student"""
        now = timezone.now()

        # Check status
        if self.status != "published" or not self.is_active:
            return False, "Quiz is not published or active"

        # Check availability dates
        if self.available_from and now < self.available_from:
            return False, f"Quiz will be available from {self.available_from}"

        if self.available_until and now > self.available_until:
            return False, f"Quiz was available until {self.available_until}"

        # Check if student has exceeded max attempts
        if student:
            attempts_count = self.attempts.filter(student=student).count()
            if attempts_count >= self.max_attempts:
                return False, f"Maximum attempts ({self.max_attempts}) reached"

        return True, "Quiz is available"

    def can_student_attempt(self, student):
        """Check if a student can attempt this quiz"""
        is_avail, message = self.is_available(student)
        if not is_avail:
            return False, message

        # Check if student is in assigned classes
        if self.classes.exists():
            student_class = student.get_current_class()
            if not student_class or student_class not in self.classes.all():
                return False, "Student is not assigned to this quiz"

        return True, "Student can attempt this quiz"

    def get_question_count(self):
        """Get the total number of questions in this quiz"""
        return self.questions.count()

    def calculate_total_marks(self):
        """Calculate total marks from all questions"""
        total = self.questions.aggregate(total=Sum("marks"))["total"] or 0
        if self.total_marks != total:
            self.total_marks = total
            self.save(update_fields=["total_marks"])
        return total

    def get_completion_rate(self):
        """Get percentage of students who completed the quiz"""
        total_attempts = self.attempts.count()
        if total_attempts == 0:
            return 0
        completed_attempts = self.attempts.filter(is_completed=True).count()
        return round((completed_attempts / total_attempts) * 100, 2)

    def get_average_score(self):
        """Get average score for completed attempts"""
        result = (
            self.attempts.filter(is_completed=True).aggregate(avg_score=Avg("score"))
        )
        return round(result["avg_score"] or 0, 2)

    def get_participation_count(self):
        """Get the number of unique students who attempted this quiz"""
        return self.attempts.values("student").distinct().count()

    def get_best_score(self, student):
        """Get the best score for a specific student"""
        best_attempt = (
            self.attempts.filter(student=student, is_completed=True)
            .order_by("-score")
            .first()
        )
        return best_attempt.score if best_attempt else None

    def verify_password(self, password):
        """Verify quiz password"""
        if not self.require_password:
            return True
        return self.quiz_password == password


class Question(models.Model):
    """Individual questions within a quiz with comprehensive features"""

    QUESTION_TYPES = [
        ("multiple_choice", "Multiple Choice"),
        ("true_false", "True/False"),
        ("short_answer", "Short Answer"),
        ("essay", "Essay"),
        ("fill_blank", "Fill in the Blank"),
        ("matching", "Matching"),
        ("ordering", "Ordering"),
    ]

    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    question_id = models.CharField(
        max_length=15, unique=True, editable=False, help_text="Unique question identifier"
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
        help_text="Quiz this question belongs to",
    )
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        help_text="Type of question (multiple choice, essay, etc.)",
    )
    question_text = models.TextField(help_text="The question text/content")
    explanation = models.TextField(
        blank=True,
        null=True,
        help_text="Explanation shown after answering (for feedback)",
    )
    correct_answer_text = models.TextField(
        blank=True,
        null=True,
        help_text="Correct answer for short answer/fill in blank questions (can be multiple answers separated by semicolons)",
    )

    # Scoring
    marks = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Marks awarded for correct answer",
    )
    negative_marks = models.FloatField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Marks deducted for wrong answer (negative marking)",
    )
    partial_credit = models.BooleanField(
        default=False, help_text="Allow partial credit for partially correct answers"
    )

    # Question settings
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default="medium",
        help_text="Difficulty level of this question",
    )
    is_required = models.BooleanField(
        default=True, help_text="Whether this question is required to answer"
    )
    order = models.PositiveIntegerField(
        default=0, help_text="Display order within the quiz"
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for categorizing questions (e.g., ['algebra', 'geometry'])",
    )

    # Media
    image = models.ImageField(
        upload_to="quiz_questions/",
        blank=True,
        null=True,
        help_text="Image associated with the question",
    )
    audio_file = models.FileField(
        upload_to="quiz_questions/audio/",
        blank=True,
        null=True,
        help_text="Audio file for the question (if applicable)",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Multi-tenancy (inherited from quiz)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quiz_questions",
        help_text="School this question belongs to",
    )

    class Meta:
        verbose_name = "Question"
        verbose_name_plural = "Questions"
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["quiz", "order"]),
            models.Index(fields=["question_type"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["school"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(marks__gte=1), name="question_marks_at_least_one"
            ),
            models.CheckConstraint(
                check=models.Q(negative_marks__gte=0),
                name="negative_marks_non_negative",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.question_id:
            self.question_id = generate_unique_id("QU", length=8)

        # Set school from quiz
        if not self.school and self.quiz:
            self.school = self.quiz.school

        # Auto-set order if not provided
        if self.order == 0 and self.quiz:
            max_order = (
                Question.objects.filter(quiz=self.quiz).aggregate(
                    max_order=models.Max("order")
                )["max_order"]
                or 0
            )
            self.order = max_order + 1

        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        # Validate answer choices for multiple choice and true/false
        if self.question_type in ["multiple_choice", "true_false"]:
            answer_choices = self.answer_choices.all()
            if answer_choices.count() < 2:
                errors["question_type"] = ValidationError(
                    f"{self.get_question_type_display()} questions must have at least 2 answer choices"
                )
            correct_choices = answer_choices.filter(is_correct=True).count()
            if correct_choices == 0:
                errors["answer_choices"] = ValidationError(
                    "At least one answer choice must be marked as correct"
                )

        # Validate correct_answer_text for text-based questions
        if self.question_type in ["short_answer", "fill_blank"]:
            if not self.correct_answer_text:
                errors["correct_answer_text"] = ValidationError(
                    f"{self.get_question_type_display()} questions require a correct answer text"
                )

        # Validate marks
        if self.marks < 1:
            errors["marks"] = ValidationError("Marks must be at least 1")

        if self.negative_marks < 0:
            errors["negative_marks"] = ValidationError(
                "Negative marks cannot be negative"
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."

    def get_correct_answer(self):
        """Get the correct answer(s) for this question"""
        if self.question_type in ["multiple_choice", "true_false"]:
            return self.answer_choices.filter(is_correct=True)
        elif self.question_type in ["short_answer", "fill_blank"]:
            # Return list of possible correct answers
            if self.correct_answer_text:
                return [
                    ans.strip()
                    for ans in self.correct_answer_text.split(";")
                    if ans.strip()
                ]
        return None

    def get_answer_choices(self):
        """Get all answer choices for multiple choice questions, ordered"""
        return self.answer_choices.all().order_by("order")

    def has_multiple_correct_answers(self):
        """Check if question has multiple correct answers"""
        if self.question_type in ["multiple_choice", "true_false"]:
            return self.answer_choices.filter(is_correct=True).count() > 1
        elif self.question_type in ["short_answer", "fill_blank"]:
            if self.correct_answer_text:
                answers = [
                    ans.strip()
                    for ans in self.correct_answer_text.split(";")
                    if ans.strip()
                ]
                return len(answers) > 1
        return False

    def get_answer_count(self):
        """Get the number of answer choices"""
        return self.answer_choices.count()

    def is_valid(self):
        """Check if question is valid (has required components)"""
        if self.question_type in ["multiple_choice", "true_false"]:
            return (
                self.answer_choices.count() >= 2
                and self.answer_choices.filter(is_correct=True).exists()
            )
        elif self.question_type in ["short_answer", "fill_blank"]:
            return bool(self.correct_answer_text and self.correct_answer_text.strip())
        return True  # Essay questions don't need validation


class AnswerChoice(models.Model):
    """Answer choices for multiple choice and true/false questions"""

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answer_choices",
        help_text="Question this answer choice belongs to",
    )
    choice_text = models.CharField(
        max_length=500, help_text="The text content of this answer choice"
    )
    is_correct = models.BooleanField(
        default=False, help_text="Whether this is the correct answer"
    )
    order = models.PositiveIntegerField(
        default=0, help_text="Display order of this choice"
    )
    explanation = models.TextField(
        blank=True,
        null=True,
        help_text="Explanation for why this choice is correct/incorrect",
    )
    partial_credit = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Partial credit (0.0 to 1.0) if this choice is selected (for partial credit questions)",
    )

    # Multi-tenancy (inherited from question)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="answer_choices",
        help_text="School this answer choice belongs to",
    )

    class Meta:
        verbose_name = "Answer Choice"
        verbose_name_plural = "Answer Choices"
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["question", "order"]),
            models.Index(fields=["question", "is_correct"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(partial_credit__gte=0.0, partial_credit__lte=1.0),
                name="partial_credit_range",
            ),
        ]

    def save(self, *args, **kwargs):
        # Set school from question
        if not self.school and self.question:
            self.school = self.question.school

        # Auto-set order if not provided
        if self.order == 0 and self.question:
            max_order = (
                AnswerChoice.objects.filter(question=self.question).aggregate(
                    max_order=models.Max("order")
                )["max_order"]
                or 0
            )
            self.order = max_order + 1

        super().save(*args, **kwargs)

    def clean(self):
        if not self.choice_text or not self.choice_text.strip():
            raise ValidationError("Answer choice text cannot be empty")

        if self.partial_credit < 0 or self.partial_credit > 1:
            raise ValidationError("Partial credit must be between 0.0 and 1.0")

    def __str__(self):
        correct_indicator = "✓" if self.is_correct else "✗"
        return f"{correct_indicator} {self.choice_text[:30]}..."


class QuizAttempt(models.Model):
    """Track individual student attempts at quizzes with comprehensive tracking"""

    attempt_id = models.CharField(
        max_length=15, unique=True, editable=False, help_text="Unique attempt identifier"
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts",
        help_text="Quiz being attempted",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        help_text="Student making this attempt",
    )

    # Attempt details
    attempt_number = models.PositiveIntegerField(
        default=1, help_text="Attempt number for this student (1st, 2nd, etc.)"
    )
    started_at = models.DateTimeField(
        auto_now_add=True, help_text="When the attempt was started"
    )
    completed_at = models.DateTimeField(
        null=True, blank=True, help_text="When the attempt was completed"
    )
    submitted_at = models.DateTimeField(
        null=True, blank=True, help_text="When the attempt was submitted"
    )

    # Academic context
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quiz_attempts",
        help_text="Academic year when attempt was made",
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quiz_attempts",
        help_text="Term when attempt was made",
    )

    # Scoring
    score = models.FloatField(
        default=0, validators=[MinValueValidator(0)], help_text="Total score achieved"
    )
    percentage = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage score (0-100)",
    )
    total_questions = models.PositiveIntegerField(
        default=0, help_text="Total number of questions in the quiz"
    )
    correct_answers = models.PositiveIntegerField(
        default=0, help_text="Number of correct answers"
    )
    wrong_answers = models.PositiveIntegerField(
        default=0, help_text="Number of wrong answers"
    )
    unanswered = models.PositiveIntegerField(
        default=0, help_text="Number of unanswered questions"
    )

    # Status
    is_completed = models.BooleanField(
        default=False, help_text="Whether the attempt is completed"
    )
    is_submitted = models.BooleanField(
        default=False, help_text="Whether the attempt has been submitted"
    )
    time_taken = models.DurationField(
        null=True, blank=True, help_text="Total time taken for the attempt"
    )
    needs_grading = models.BooleanField(
        default=False, help_text="Whether manual grading is required (for essay questions)"
    )
    is_graded = models.BooleanField(
        default=False, help_text="Whether all questions have been graded"
    )

    # Additional data
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, help_text="IP address of the student"
    )
    user_agent = models.TextField(
        blank=True, null=True, help_text="Browser user agent string"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Notes or comments about this attempt (for teachers)",
    )

    # Multi-tenancy (inherited from quiz)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        help_text="School this attempt belongs to",
    )

    class Meta:
        verbose_name = "Quiz Attempt"
        verbose_name_plural = "Quiz Attempts"
        unique_together = [["quiz", "student", "attempt_number"]]
        indexes = [
            models.Index(fields=["quiz", "student"]),
            models.Index(fields=["student", "started_at"]),
            models.Index(fields=["quiz", "is_completed"]),
            models.Index(fields=["school", "started_at"]),
            models.Index(fields=["academic_year", "term"]),
            models.Index(fields=["is_submitted", "needs_grading"]),
        ]
        ordering = ["-started_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(score__gte=0), name="attempt_score_non_negative"
            ),
            models.CheckConstraint(
                check=models.Q(percentage__gte=0, percentage__lte=100),
                name="percentage_range",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.attempt_id:
            self.attempt_id = generate_unique_id("AT", length=8)

        # Set school from quiz
        if not self.school and self.quiz:
            self.school = self.quiz.school

        # Set academic_year and term from quiz if not provided
        if not self.academic_year and self.quiz:
            self.academic_year = self.quiz.academic_year
        if not self.term and self.quiz:
            self.term = self.quiz.term

        # Calculate time taken if completed
        if self.completed_at and not self.time_taken:
            self.time_taken = self.completed_at - self.started_at

        # Auto-set attempt number if not provided (only if explicitly 1 or not set)
        # Note: This is a fallback. The view should always set attempt_number correctly.
        if self.attempt_number == 1 and self.quiz and self.student and self.pk is None:
            from django.db.models import Max
            max_attempt = QuizAttempt.objects.filter(
                quiz=self.quiz, 
                student=self.student,
                school=self.school
            ).aggregate(max_attempt=Max('attempt_number'))['max_attempt']
            self.attempt_number = (max_attempt + 1) if max_attempt else 1

        super().save(*args, **kwargs)

    def clean(self):
        if self.completed_at and self.started_at:
            if self.completed_at < self.started_at:
                raise ValidationError(
                    "Completed at cannot be before started at"
                )

        if self.submitted_at and self.started_at:
            if self.submitted_at < self.started_at:
                raise ValidationError(
                    "Submitted at cannot be before started at"
                )

    def __str__(self):
        return f"{self.student.full_name} - {self.quiz.title} (Attempt {self.attempt_number})"

    def calculate_score(self):
        """Calculate and update the score for this attempt"""
        responses = self.responses.all()
        total_score = 0
        correct_count = 0
        wrong_count = 0
        needs_grading = False

        for response in responses:
            # Check if response needs manual grading
            if response.question.question_type == "essay" and not response.is_graded:
                needs_grading = True
                continue

            # Calculate score based on marks awarded
            if response.marks_awarded > 0:
                total_score += response.marks_awarded
                if response.is_correct:
                    correct_count += 1
            elif response.marks_awarded < 0:
                total_score += response.marks_awarded  # Negative marks
                wrong_count += 1
            else:
                wrong_count += 1

        self.score = max(0, total_score)  # Ensure score doesn't go negative
        self.total_questions = self.quiz.get_question_count()
        self.correct_answers = correct_count
        self.wrong_answers = wrong_count
        self.unanswered = self.total_questions - self.responses.count()
        self.percentage = (
            round((self.score / self.quiz.total_marks * 100), 2)
            if self.quiz.total_marks > 0
            else 0
        )
        self.needs_grading = needs_grading

        self.save(
            update_fields=[
                "score",
                "percentage",
                "total_questions",
                "correct_answers",
                "wrong_answers",
                "unanswered",
                "needs_grading",
            ]
        )

        return self.score

    def get_grade(self):
        """Get letter grade based on percentage"""
        if self.percentage >= 90:
            return "A+"
        elif self.percentage >= 80:
            return "A"
        elif self.percentage >= 70:
            return "B"
        elif self.percentage >= 60:
            return "C"
        elif self.percentage >= 50:
            return "D"
        else:
            return "F"

    def is_passed(self):
        """Check if student passed the quiz"""
        return self.score >= self.quiz.passing_marks

    def get_time_remaining(self):
        """Get remaining time for the quiz"""
        if self.is_completed or self.quiz.time_limit == 0:
            return timezone.timedelta(0)

        time_limit = timezone.timedelta(minutes=self.quiz.time_limit)
        elapsed = timezone.now() - self.started_at
        remaining = time_limit - elapsed

        return remaining if remaining > timezone.timedelta(0) else timezone.timedelta(0)

    def get_duration_minutes(self):
        """Get the duration of the attempt in minutes"""
        if not self.time_taken:
            return None
        return round(self.time_taken.total_seconds() / 60, 2)

    def is_time_expired(self):
        """Check if time limit has been exceeded"""
        if self.quiz.time_limit == 0:
            return False
        return self.get_time_remaining() <= timezone.timedelta(0)

    def submit(self):
        """Submit the attempt"""
        if not self.is_submitted:
            self.is_submitted = True
            self.submitted_at = timezone.now()
            if not self.is_completed:
                self.is_completed = True
                self.completed_at = timezone.now()
            self.calculate_score()
            self.save()

    def get_progress_percentage(self):
        """Get the percentage of questions answered"""
        if self.total_questions == 0:
            return 0
        answered = self.responses.count()
        return round((answered / self.total_questions) * 100, 2)


class QuizResponse(models.Model):
    """Individual responses to quiz questions with comprehensive scoring"""

    response_id = models.CharField(
        max_length=15, unique=True, editable=False, help_text="Unique response identifier"
    )
    attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name="responses",
        help_text="Quiz attempt this response belongs to",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="responses",
        help_text="Question being answered",
    )

    # Response data
    selected_choice = models.ForeignKey(
        AnswerChoice,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Selected answer choice (for multiple choice/true-false)",
    )
    selected_choices = models.ManyToManyField(
        AnswerChoice,
        blank=True,
        related_name="responses",
        help_text="Multiple selected choices (for questions with multiple correct answers)",
    )
    text_answer = models.TextField(
        blank=True, null=True, help_text="Text answer (for short answer/essay questions)"
    )
    is_correct = models.BooleanField(
        default=False, help_text="Whether the response is correct"
    )

    # Scoring
    marks_awarded = models.FloatField(
        default=0, help_text="Marks awarded for this response"
    )
    is_graded = models.BooleanField(
        default=False, help_text="Whether this response has been manually graded"
    )
    graded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="graded_responses",
        help_text="Teacher who graded this response",
    )
    graded_at = models.DateTimeField(
        null=True, blank=True, help_text="When this response was graded"
    )
    grading_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Notes or feedback from the grader",
    )

    # Metadata
    answered_at = models.DateTimeField(
        auto_now_add=True, help_text="When the response was submitted"
    )
    updated_at = models.DateTimeField(
        auto_now=True, help_text="When the response was last updated"
    )

    # Multi-tenancy (inherited from attempt)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quiz_responses",
        help_text="School this response belongs to",
    )

    class Meta:
        verbose_name = "Quiz Response"
        verbose_name_plural = "Quiz Responses"
        unique_together = [["attempt", "question"]]
        indexes = [
            models.Index(fields=["attempt", "question"]),
            models.Index(fields=["question", "is_correct"]),
            models.Index(fields=["is_graded", "is_correct"]),
            models.Index(fields=["school", "answered_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(marks_awarded__gte=-100),
                name="marks_awarded_reasonable",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.response_id:
            self.response_id = generate_unique_id("RS", length=8)

        # Set school from attempt
        if not self.school and self.attempt:
            self.school = self.attempt.school

        # Auto-check correctness and calculate marks (unless manually graded)
        if not self.is_graded or self.question.question_type != "essay":
            self.check_correctness()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attempt.student.full_name} - Q{self.question.order}"

    def check_correctness(self):
        """Check if the response is correct and calculate marks"""
        # Skip auto-calculation for essay questions that have been manually graded
        if self.question.question_type == "essay" and self.is_graded:
            return

        if self.question.question_type in ["multiple_choice", "true_false"]:
            if self.selected_choice:
                self.is_correct = self.selected_choice.is_correct
                if self.is_correct:
                    # Check for partial credit
                    if self.question.partial_credit and self.selected_choice.partial_credit > 0:
                        self.marks_awarded = (
                            self.question.marks * self.selected_choice.partial_credit
                        )
                    else:
                        self.marks_awarded = self.question.marks
                else:
                    self.marks_awarded = -self.question.negative_marks
            else:
                self.is_correct = False
                self.marks_awarded = 0

        elif self.question.question_type in ["short_answer", "fill_blank"]:
            # For text answers, check against correct answer(s)
            correct_answers = self.question.get_correct_answer()
            if self.text_answer and correct_answers:
                # Check if answer matches any of the correct answers
                student_answer = self.text_answer.strip().lower()
                is_match = any(
                    student_answer == ans.strip().lower() for ans in correct_answers
                )
                self.is_correct = is_match
                if self.is_correct:
                    self.marks_awarded = self.question.marks
                else:
                    self.marks_awarded = -self.question.negative_marks
            else:
                self.is_correct = False
                self.marks_awarded = 0

        elif self.question.question_type == "essay":
            # Essay questions require manual grading
            self.is_correct = False
            self.marks_awarded = 0
            # Note: needs_grading is tracked on QuizAttempt, not QuizResponse

    def grade(self, marks, grader, notes=None):
        """Manually grade this response (for essay questions)"""
        max_marks = self.question.marks
        self.marks_awarded = min(max(0, marks), max_marks)  # Clamp between 0 and max
        self.is_correct = self.marks_awarded >= (max_marks * 0.5)  # 50% threshold
        self.is_graded = True
        self.graded_by = grader
        self.graded_at = timezone.now()
        if notes:
            self.grading_notes = notes
        self.save()


class QuizAnalytics(models.Model):
    """Store comprehensive analytics data for quizzes"""

    quiz = models.OneToOneField(
        Quiz,
        on_delete=models.CASCADE,
        related_name="analytics",
        help_text="Quiz these analytics belong to",
    )

    # Participation metrics
    total_attempts = models.PositiveIntegerField(
        default=0, help_text="Total number of attempts"
    )
    completed_attempts = models.PositiveIntegerField(
        default=0, help_text="Number of completed attempts"
    )
    unique_students = models.PositiveIntegerField(
        default=0, help_text="Number of unique students who attempted"
    )
    average_score = models.FloatField(
        default=0, help_text="Average score across all completed attempts"
    )
    highest_score = models.FloatField(
        default=0, help_text="Highest score achieved"
    )
    lowest_score = models.FloatField(
        default=0, help_text="Lowest score achieved"
    )
    median_score = models.FloatField(
        default=0, help_text="Median score"
    )
    pass_rate = models.FloatField(
        default=0, help_text="Percentage of students who passed"
    )

    # Time metrics
    average_time_taken = models.DurationField(
        null=True, blank=True, help_text="Average time taken to complete"
    )
    fastest_completion = models.DurationField(
        null=True, blank=True, help_text="Fastest completion time"
    )
    slowest_completion = models.DurationField(
        null=True, blank=True, help_text="Slowest completion time"
    )

    # Grade distribution
    grade_distribution = models.JSONField(
        default=dict,
        blank=True,
        help_text="Distribution of grades (A+, A, B, C, D, F)",
    )

    # Question analytics
    question_analytics = models.JSONField(
        default=dict, blank=True, help_text="Detailed analytics per question"
    )

    # Performance trends
    performance_trends = models.JSONField(
        default=list,
        blank=True,
        help_text="Performance trends over time (for charts)",
    )

    # Last updated
    last_calculated = models.DateTimeField(
        auto_now=True, help_text="When analytics were last calculated"
    )

    # Multi-tenancy (inherited from quiz)
    school = models.ForeignKey(
        SchoolInformation,
        on_delete=models.CASCADE,
        related_name="quiz_analytics",
        help_text="School these analytics belong to",
    )

    class Meta:
        verbose_name = "Quiz Analytics"
        verbose_name_plural = "Quiz Analytics"
        indexes = [
            models.Index(fields=["quiz"]),
            models.Index(fields=["school", "last_calculated"]),
        ]

    def save(self, *args, **kwargs):
        # Set school from quiz
        if not self.school and self.quiz:
            self.school = self.quiz.school

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Analytics for {self.quiz.title}"

    def calculate_analytics(self):
        """Calculate and update comprehensive analytics data"""
        attempts = self.quiz.attempts.all()
        completed_attempts = attempts.filter(is_completed=True)

        self.total_attempts = attempts.count()
        self.completed_attempts = completed_attempts.count()
        self.unique_students = attempts.values("student").distinct().count()

        # Reset analytics if no completed attempts
        if self.completed_attempts == 0:
            self.average_score = 0
            self.highest_score = 0
            self.lowest_score = 0
            self.median_score = 0
            self.pass_rate = 0
            self.average_time_taken = None
            self.fastest_completion = None
            self.slowest_completion = None
            self.grade_distribution = {}
            self.question_analytics = {}
            self.performance_trends = []
            self.save()
            return

        # Calculate scores
        scores = list(completed_attempts.values_list("score", flat=True))
        if scores:
            scores_sorted = sorted(scores)
            self.average_score = round(sum(scores) / len(scores), 2)
            self.highest_score = max(scores)
            self.lowest_score = min(scores)
            # Calculate median
            n = len(scores_sorted)
            if n % 2 == 0:
                self.median_score = round(
                    (scores_sorted[n // 2 - 1] + scores_sorted[n // 2]) / 2, 2
                )
            else:
                self.median_score = round(scores_sorted[n // 2], 2)

            # Calculate pass rate
            passing_count = sum(
                1 for score in scores if score >= self.quiz.passing_marks
            )
            self.pass_rate = round((passing_count / len(scores)) * 100, 2)

        # Calculate time metrics
        time_taken_list = [a.time_taken for a in completed_attempts if a.time_taken]
        if time_taken_list:
            total_seconds = sum(td.total_seconds() for td in time_taken_list)
            avg_seconds = total_seconds / len(time_taken_list)
            self.average_time_taken = timezone.timedelta(seconds=avg_seconds)
            self.fastest_completion = min(time_taken_list)
            self.slowest_completion = max(time_taken_list)

        # Calculate grade distribution
        grade_counts = {"A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        for attempt in completed_attempts:
            grade = attempt.get_grade()
            if grade in grade_counts:
                grade_counts[grade] += 1
        self.grade_distribution = grade_counts

        # Calculate question-wise analytics
        question_stats = {}
        for question in self.quiz.questions.all():
            responses = QuizResponse.objects.filter(
                question=question, attempt__is_completed=True
            )
            total_responses = responses.count()

            if total_responses > 0:
                correct_responses = responses.filter(is_correct=True).count()
                accuracy = round((correct_responses / total_responses) * 100, 2)
                avg_marks = round(
                    responses.aggregate(avg=Avg("marks_awarded"))["avg"] or 0, 2
                )

                # Determine difficulty level based on accuracy
                if accuracy > 80:
                    difficulty = "easy"
                elif accuracy > 50:
                    difficulty = "medium"
                else:
                    difficulty = "hard"

                question_stats[str(question.id)] = {
                    "total_responses": total_responses,
                    "correct_responses": correct_responses,
                    "accuracy": accuracy,
                    "average_marks": avg_marks,
                    "difficulty_level": difficulty,
                    "question_type": question.question_type,
                    "question_order": question.order,
                }
            else:
                question_stats[str(question.id)] = {
                    "total_responses": 0,
                    "correct_responses": 0,
                    "accuracy": 0,
                    "average_marks": 0,
                    "difficulty_level": "unknown",
                    "question_type": question.question_type,
                    "question_order": question.order,
                }

        self.question_analytics = question_stats

        # Calculate performance trends (by date)
        trends = []
        attempts_by_date = (
            completed_attempts.extra(select={"date": "DATE(started_at)"})
            .values("date")
            .annotate(
                count=Count("id"),
                avg_score=Avg("score"),
                avg_percentage=Avg("percentage"),
            )
            .order_by("date")
        )
        for trend in attempts_by_date:
            trends.append(
                {
                    "date": trend["date"].isoformat() if trend["date"] else None,
                    "attempts": trend["count"],
                    "average_score": round(trend["avg_score"] or 0, 2),
                    "average_percentage": round(trend["avg_percentage"] or 0, 2),
                }
            )
        self.performance_trends = trends

        self.save()

    def get_question_difficulty_summary(self):
        """Get summary of question difficulties"""
        easy = sum(
            1
            for q in self.question_analytics.values()
            if q.get("difficulty_level") == "easy"
        )
        medium = sum(
            1
            for q in self.question_analytics.values()
            if q.get("difficulty_level") == "medium"
        )
        hard = sum(
            1
            for q in self.question_analytics.values()
            if q.get("difficulty_level") == "hard"
        )
        return {"easy": easy, "medium": medium, "hard": hard}


# Add field to Question model for correct answer text (for short answer and fill in blank questions)
# This should be added to the Question model above, but shown here for clarity
"""
Add this field to the Question model:
correct_answer_text = models.TextField(blank=True, null=True, help_text="Correct answer for short answer/fill in blank questions")
"""


# Signal to update quiz analytics when attempts are completed
@receiver(post_save, sender=QuizAttempt)
def update_quiz_analytics(sender, instance, created, **kwargs):
    """Update quiz analytics when an attempt is completed"""
    if instance.is_completed:
        analytics, created = QuizAnalytics.objects.get_or_create(
            quiz=instance.quiz, defaults={"school": instance.school}
        )
        analytics.calculate_analytics()


# Signal to update quiz total marks when questions are added/modified
@receiver(post_save, sender=Question)
def update_quiz_total_marks(sender, instance, **kwargs):
    """Update quiz total marks when questions are modified"""
    instance.quiz.calculate_total_marks()


@receiver(post_delete, sender=Question)
def update_quiz_total_marks_on_delete(sender, instance, **kwargs):
    """Update quiz total marks when questions are deleted"""
    instance.quiz.calculate_total_marks()
