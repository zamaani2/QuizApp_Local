from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User,
    AcademicYear,
    Term,
    Form,
    LearningArea,
    Department,
    Teacher,
    Student,
    Class,
    ClassTeacher,
    StudentClass,
    Subject,
    TeacherSubjectAssignment,
    ClassSubject,
    SchoolAuthoritySignature,
    SchoolInformation,
    OAuthCredentialStore,
    QuizCategory,
    Quiz,
    Question,
    AnswerChoice,
    QuizAttempt,
    QuizResponse,
    QuizAnalytics,
)


# Custom User Admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model"""
    list_display = ['username', 'email', 'full_name', 'role', 'school', 'is_active', 'last_login']
    list_filter = ['role', 'is_active', 'is_superadmin', 'school', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'full_name']
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Information', {
            'fields': ('role', 'full_name', 'teacher_profile', 'student_profile', 'school', 'is_superadmin', 'last_login_ip', 'last_active')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Information', {
            'fields': ('role', 'full_name', 'email', 'school', 'is_superadmin')
        }),
    )


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    """Admin for AcademicYear model"""
    list_display = ['name', 'school', 'start_date', 'end_date', 'is_current', 'get_duration_days']
    list_filter = ['is_current', 'school', 'start_date']
    search_fields = ['name', 'school__name']
    date_hierarchy = 'start_date'
    
    def get_duration_days(self, obj):
        return obj.get_duration()
    get_duration_days.short_description = 'Duration (Days)'


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    """Admin for Term model"""
    list_display = ['academic_year', 'get_term_number_display', 'school', 'start_date', 'end_date', 'is_current', 'get_duration_days']
    list_filter = ['is_current', 'term_number', 'school', 'academic_year']
    search_fields = ['academic_year__name', 'school__name']
    date_hierarchy = 'start_date'
    
    def get_duration_days(self, obj):
        return obj.get_duration()
    get_duration_days.short_description = 'Duration (Days)'


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    """Admin for Form model"""
    list_display = ['form_number', 'name', 'school', 'description']
    list_filter = ['school', 'form_number']
    search_fields = ['name', 'description', 'school__name']
    ordering = ['form_number']


@admin.register(LearningArea)
class LearningAreaAdmin(admin.ModelAdmin):
    """Admin for LearningArea model"""
    list_display = ['code', 'name', 'school', 'description']
    list_filter = ['school']
    search_fields = ['code', 'name', 'description', 'school__name']
    ordering = ['name']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin for Department model"""
    list_display = ['code', 'name', 'school', 'head_of_department']
    list_filter = ['school']
    search_fields = ['code', 'name', 'description', 'school__name', 'head_of_department__full_name']
    ordering = ['name']


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    """Admin for Teacher model"""
    list_display = ['staff_id', 'full_name', 'school', 'department', 'gender', 'contact_number', 'email']
    list_filter = ['school', 'department', 'gender']
    search_fields = ['staff_id', 'full_name', 'email', 'contact_number', 'school__name']
    readonly_fields = ['staff_id']
    ordering = ['full_name']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    """Admin for Student model"""
    list_display = ['admission_number', 'full_name', 'school', 'form', 'learning_area', 'gender', 'calculate_age_display']
    list_filter = ['school', 'form', 'learning_area', 'gender']
    search_fields = ['admission_number', 'full_name', 'email', 'parent_contact']
    readonly_fields = ['admission_number']
    date_hierarchy = 'admission_date'
    
    def calculate_age_display(self, obj):
        return f"{obj.calculate_age()} years"
    calculate_age_display.short_description = 'Age'


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    """Admin for Class model"""
    list_display = ['class_id', 'name', 'school', 'form', 'learning_area', 'academic_year', 'get_current_student_count', 'maximum_students', 'is_class_full_display']
    list_filter = ['school', 'form', 'learning_area', 'academic_year']
    search_fields = ['class_id', 'name', 'school__name']
    readonly_fields = ['class_id']
    
    def get_current_student_count(self, obj):
        return obj.get_current_student_count()
    get_current_student_count.short_description = 'Current Students'
    
    def is_class_full_display(self, obj):
        if obj.is_class_full():
            return format_html('<span style="color: red;">Full</span>')
        return format_html('<span style="color: green;">Available</span>')
    is_class_full_display.short_description = 'Status'


@admin.register(ClassTeacher)
class ClassTeacherAdmin(admin.ModelAdmin):
    """Admin for ClassTeacher model"""
    list_display = ['teacher', 'class_assigned', 'academic_year', 'school', 'date_assigned', 'is_active', 'assigned_by']
    list_filter = ['is_active', 'school', 'academic_year', 'date_assigned']
    search_fields = ['teacher__full_name', 'class_assigned__name', 'school__name']
    date_hierarchy = 'date_assigned'


@admin.register(StudentClass)
class StudentClassAdmin(admin.ModelAdmin):
    """Admin for StudentClass model"""
    list_display = ['student', 'assigned_class', 'school', 'date_assigned', 'is_active', 'assigned_by']
    list_filter = ['is_active', 'school', 'date_assigned']
    search_fields = ['student__full_name', 'student__admission_number', 'assigned_class__name']
    date_hierarchy = 'date_assigned'


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin for Subject model"""
    list_display = ['subject_code', 'subject_name', 'school', 'learning_area', 'department']
    list_filter = ['school', 'learning_area', 'department']
    search_fields = ['subject_code', 'subject_name', 'school__name']
    readonly_fields = ['subject_code']
    ordering = ['subject_name']


@admin.register(TeacherSubjectAssignment)
class TeacherSubjectAssignmentAdmin(admin.ModelAdmin):
    """Admin for TeacherSubjectAssignment model"""
    list_display = ['assignment_id', 'teacher', 'subject', 'class_assigned', 'academic_year', 'school', 'date_assigned', 'is_active']
    list_filter = ['is_active', 'school', 'academic_year', 'date_assigned']
    search_fields = ['assignment_id', 'teacher__full_name', 'subject__subject_name', 'class_assigned__name']
    readonly_fields = ['assignment_id', 'last_modified']
    date_hierarchy = 'date_assigned'


@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    """Admin for ClassSubject model"""
    list_display = ['class_subject_id', 'subject', 'class_name', 'academic_year', 'school']
    list_filter = ['school', 'academic_year']
    search_fields = ['class_subject_id', 'subject__subject_name', 'class_name__name']
    readonly_fields = ['class_subject_id']


@admin.register(SchoolAuthoritySignature)
class SchoolAuthoritySignatureAdmin(admin.ModelAdmin):
    """Admin for SchoolAuthoritySignature model"""
    list_display = ['name', 'authority_type', 'school', 'display_title', 'is_active', 'date_created']
    list_filter = ['authority_type', 'is_active', 'school', 'date_created']
    search_fields = ['name', 'title', 'custom_title', 'school__name']
    readonly_fields = ['date_created', 'last_updated']


@admin.register(SchoolInformation)
class SchoolInformationAdmin(admin.ModelAdmin):
    """Admin for SchoolInformation model"""
    list_display = ['name', 'short_name', 'slug', 'school_code', 'is_active', 'current_academic_year', 'current_term']
    list_filter = ['is_active', 'date_created']
    search_fields = ['name', 'short_name', 'slug', 'school_code', 'address']
    readonly_fields = ['date_created', 'last_updated', 'slug']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'short_name', 'slug', 'address', 'postal_code', 'phone_number', 'email', 'website')
        }),
        ('School Identifiers', {
            'fields': ('school_code',)
        }),
        ('Visual Elements', {
            'fields': ('logo', 'school_stamp')
        }),
        ('Report Settings', {
            'fields': ('report_header', 'report_footer', 'grading_system_description')
        }),
        ('School Information', {
            'fields': ('motto', 'vision', 'mission')
        }),
        ('Academic Settings', {
            'fields': ('current_academic_year', 'current_term')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'date_created', 'last_updated')
        }),
    )


@admin.register(OAuthCredentialStore)
class OAuthCredentialStoreAdmin(admin.ModelAdmin):
    """Admin for OAuthCredentialStore model"""
    list_display = ['service_name', 'email', 'is_active', 'last_updated']
    list_filter = ['is_active', 'service_name']
    search_fields = ['service_name', 'email']
    readonly_fields = ['last_updated']
    fieldsets = (
        ('Service Information', {
            'fields': ('service_name', 'email', 'is_active')
        }),
        ('OAuth Credentials', {
            'fields': ('client_id', 'client_secret', 'refresh_token', 'access_token', 'token_uri', 'scopes')
        }),
        ('Metadata', {
            'fields': ('last_updated',)
        }),
    )


@admin.register(QuizCategory)
class QuizCategoryAdmin(admin.ModelAdmin):
    """Admin for QuizCategory model"""
    list_display = ['name', 'school', 'get_quiz_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'school', 'created_at']
    search_fields = ['name', 'description', 'school__name']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_quiz_count(self, obj):
        return obj.get_quiz_count()
    get_quiz_count.short_description = 'Quizzes'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    """Admin for Quiz model"""
    list_display = ['quiz_id', 'title', 'subject', 'teacher', 'school', 'status', 'difficulty', 'get_question_count', 'total_marks', 'created_at']
    list_filter = ['status', 'difficulty', 'is_active', 'school', 'subject', 'academic_year', 'term', 'created_at']
    search_fields = ['quiz_id', 'title', 'description', 'subject__subject_name', 'teacher__full_name']
    readonly_fields = ['quiz_id', 'slug', 'created_at', 'updated_at', 'total_marks']
    date_hierarchy = 'created_at'
    filter_horizontal = ['classes']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('quiz_id', 'title', 'description', 'instructions', 'slug', 'subject', 'category', 'teacher')
        }),
        ('Academic Context', {
            'fields': ('academic_year', 'term', 'classes')
        }),
        ('Quiz Settings', {
            'fields': ('difficulty', 'status', 'time_limit', 'total_marks', 'passing_marks')
        }),
        ('Availability', {
            'fields': ('available_from', 'available_until', 'max_attempts')
        }),
        ('Quiz Behavior', {
            'fields': ('randomize_questions', 'randomize_answers', 'show_results_immediately', 'show_correct_answers', 'allow_review')
        }),
        ('Security', {
            'fields': ('require_password', 'quiz_password')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'school')
        }),
    )
    
    def get_question_count(self, obj):
        return obj.get_question_count()
    get_question_count.short_description = 'Questions'


class AnswerChoiceInline(admin.TabularInline):
    """Inline admin for AnswerChoice"""
    model = AnswerChoice
    extra = 2
    fields = ['choice_text', 'is_correct', 'order', 'partial_credit', 'explanation']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """Admin for Question model"""
    list_display = ['question_id', 'quiz', 'question_type', 'order', 'difficulty', 'marks', 'get_answer_count', 'is_required']
    list_filter = ['question_type', 'difficulty', 'is_required', 'school', 'created_at']
    search_fields = ['question_id', 'question_text', 'quiz__title']
    readonly_fields = ['question_id', 'created_at', 'updated_at']
    inlines = [AnswerChoiceInline]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('question_id', 'quiz', 'question_type', 'question_text', 'order')
        }),
        ('Answer Information', {
            'fields': ('correct_answer_text', 'explanation')
        }),
        ('Scoring', {
            'fields': ('marks', 'negative_marks', 'partial_credit')
        }),
        ('Settings', {
            'fields': ('difficulty', 'is_required', 'tags')
        }),
        ('Media', {
            'fields': ('image', 'audio_file')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'school')
        }),
    )
    
    def get_answer_count(self, obj):
        return obj.get_answer_count()
    get_answer_count.short_description = 'Answer Choices'


@admin.register(AnswerChoice)
class AnswerChoiceAdmin(admin.ModelAdmin):
    """Admin for AnswerChoice model"""
    list_display = ['question', 'choice_text_short', 'is_correct', 'order', 'partial_credit']
    list_filter = ['is_correct', 'question__question_type', 'question__quiz']
    search_fields = ['choice_text', 'question__question_text']
    ordering = ['question', 'order']
    
    def choice_text_short(self, obj):
        return obj.choice_text[:50] + '...' if len(obj.choice_text) > 50 else obj.choice_text
    choice_text_short.short_description = 'Choice Text'


class QuizResponseInline(admin.TabularInline):
    """Inline admin for QuizResponse"""
    model = QuizResponse
    extra = 0
    readonly_fields = ['response_id', 'question', 'is_correct', 'marks_awarded', 'answered_at']
    can_delete = False
    fields = ['response_id', 'question', 'is_correct', 'marks_awarded', 'answered_at']


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    """Admin for QuizAttempt model"""
    list_display = ['attempt_id', 'student', 'quiz', 'attempt_number', 'score', 'percentage', 'get_grade', 'is_completed', 'is_submitted', 'started_at']
    list_filter = ['is_completed', 'is_submitted', 'needs_grading', 'is_graded', 'school', 'academic_year', 'term', 'started_at']
    search_fields = ['attempt_id', 'student__full_name', 'student__admission_number', 'quiz__title']
    readonly_fields = ['attempt_id', 'started_at', 'completed_at', 'submitted_at', 'time_taken', 'score', 'percentage']
    inlines = [QuizResponseInline]
    date_hierarchy = 'started_at'
    
    fieldsets = (
        ('Attempt Information', {
            'fields': ('attempt_id', 'quiz', 'student', 'attempt_number')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'submitted_at', 'time_taken')
        }),
        ('Academic Context', {
            'fields': ('academic_year', 'term')
        }),
        ('Scoring', {
            'fields': ('score', 'percentage', 'total_questions', 'correct_answers', 'wrong_answers', 'unanswered')
        }),
        ('Status', {
            'fields': ('is_completed', 'is_submitted', 'needs_grading', 'is_graded')
        }),
        ('Additional Information', {
            'fields': ('ip_address', 'user_agent', 'notes', 'school')
        }),
    )
    
    def get_grade(self, obj):
        return obj.get_grade()
    get_grade.short_description = 'Grade'


@admin.register(QuizResponse)
class QuizResponseAdmin(admin.ModelAdmin):
    """Admin for QuizResponse model"""
    list_display = ['response_id', 'attempt', 'question', 'is_correct', 'marks_awarded', 'is_graded', 'answered_at']
    list_filter = ['is_correct', 'is_graded', 'question__question_type', 'school', 'answered_at']
    search_fields = ['response_id', 'attempt__student__full_name', 'question__question_text', 'text_answer']
    readonly_fields = ['response_id', 'answered_at', 'updated_at']
    date_hierarchy = 'answered_at'
    
    fieldsets = (
        ('Response Information', {
            'fields': ('response_id', 'attempt', 'question')
        }),
        ('Answer', {
            'fields': ('selected_choice', 'selected_choices', 'text_answer')
        }),
        ('Scoring', {
            'fields': ('is_correct', 'marks_awarded', 'is_graded', 'graded_by', 'graded_at', 'grading_notes')
        }),
        ('Metadata', {
            'fields': ('answered_at', 'updated_at', 'school')
        }),
    )


@admin.register(QuizAnalytics)
class QuizAnalyticsAdmin(admin.ModelAdmin):
    """Admin for QuizAnalytics model"""
    list_display = ['quiz', 'total_attempts', 'completed_attempts', 'unique_students', 'average_score', 'pass_rate', 'last_calculated']
    list_filter = ['school', 'last_calculated']
    search_fields = ['quiz__title', 'quiz__subject__subject_name']
    readonly_fields = [
        'total_attempts', 'completed_attempts', 'unique_students',
        'average_score', 'highest_score', 'lowest_score', 'median_score', 'pass_rate',
        'average_time_taken', 'fastest_completion', 'slowest_completion',
        'grade_distribution', 'question_analytics', 'performance_trends',
        'last_calculated'
    ]
    
    fieldsets = (
        ('Quiz Information', {
            'fields': ('quiz', 'school')
        }),
        ('Participation Metrics', {
            'fields': ('total_attempts', 'completed_attempts', 'unique_students')
        }),
        ('Score Metrics', {
            'fields': ('average_score', 'highest_score', 'lowest_score', 'median_score', 'pass_rate')
        }),
        ('Time Metrics', {
            'fields': ('average_time_taken', 'fastest_completion', 'slowest_completion')
        }),
        ('Analytics Data', {
            'fields': ('grade_distribution', 'question_analytics', 'performance_trends')
        }),
        ('Metadata', {
            'fields': ('last_calculated',)
        }),
    )
    
    def has_add_permission(self, request):
        """Analytics are auto-generated, so prevent manual creation"""
        return False
    
    actions = ['recalculate_analytics']
    
    def recalculate_analytics(self, request, queryset):
        """Action to recalculate analytics for selected quizzes"""
        count = 0
        for analytics in queryset:
            analytics.calculate_analytics()
            count += 1
        self.message_user(request, f'Recalculated analytics for {count} quiz(es).')
    recalculate_analytics.short_description = 'Recalculate analytics for selected quizzes'
