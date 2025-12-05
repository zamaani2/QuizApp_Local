"""
URL configuration for quiz_app.

This module defines all URL patterns for the quiz application,
including authentication, dashboards, and other features.
"""
from django.urls import path
from .views import (
    login_view,
    logout_view,
    dashboard_view,
    admin_dashboard_view,
    teacher_dashboard_view,
    student_dashboard_view,
    extend_session_view,
    superadmin_login_view,
    superadmin_logout_view,
    superadmin_dashboard_view,
    superadmin_school_list_view,
    superadmin_school_create_view,
    superadmin_school_edit_view,
    superadmin_school_delete_view,
    superadmin_school_detail_view,
    superadmin_admin_list_view,
    superadmin_admin_create_view,
    superadmin_admin_edit_view,
    superadmin_admin_delete_view,
    superadmin_admin_detail_view,
    student_list_view,
    student_create_view,
    student_edit_view,
    student_delete_view,
    student_bulk_delete_view,
    student_bulk_import_view,
    student_bulk_import_preview_headers_view,
    student_bulk_import_template_view,
    student_bulk_import_template_xlsx_view,
    student_detail_view,
    student_profile_view,
    student_enrollment_list_view,
    student_enrollment_create_view,
    student_enrollment_bulk_create_view,
    student_enrollment_edit_view,
    student_enrollment_delete_view,
    student_enrollment_bulk_delete_view,
    academic_year_list_view,
    academic_year_create_view,
    academic_year_edit_view,
    academic_year_delete_view,
    academic_year_set_current_view,
    term_list_view,
    term_create_view,
    term_edit_view,
    term_delete_view,
    term_set_current_view,
    form_list_view,
    form_create_view,
    form_edit_view,
    form_delete_view,
    learning_area_list_view,
    learning_area_create_view,
    learning_area_edit_view,
    learning_area_delete_view,
    department_list_view,
    department_create_view,
    department_edit_view,
    department_delete_view,
    subject_list_view,
    subject_create_view,
    subject_edit_view,
    subject_delete_view,
    class_list_view,
    class_create_view,
    class_edit_view,
    class_delete_view,
    class_detail_view,
    class_subject_add_view,
    class_subject_remove_view,
    teacher_list_view,
    teacher_create_view,
    teacher_edit_view,
    teacher_delete_view,
    teacher_bulk_delete_view,
    teacher_bulk_import_view,
    teacher_detail_view,
    teacher_profile_view,
    assignment_list_view,
    assignment_create_view,
    assignment_bulk_create_view,
    assignment_edit_view,
    assignment_delete_view,
    get_class_subjects_view,
    school_list_view,
    school_create_view,
    school_edit_view,
    school_delete_view,
    school_detail_view,
    user_list_view,
    user_create_view,
    user_edit_view,
    user_delete_view,
    user_bulk_password_reset_view,
    quiz_list_view,
    quiz_create_view,
    quiz_edit_view,
    quiz_delete_view,
    quiz_detail_view,
    quiz_update_status_view,
    get_terms_for_academic_year_view,
    question_list_view,
    question_create_view,
    question_edit_view,
    question_delete_view,
    question_reorder_view,
    question_duplicate_view,
    question_bulk_import_view,
    question_import_template_view,
    question_bulk_delete_view,
    quiz_assignment_overview_view,
    quiz_assignment_list_view,
    quiz_assignment_create_view,
    quiz_assignment_delete_view,
    quiz_assignment_bulk_delete_view,
    class_quiz_list_view,
    quiz_grading_list_view,
    quiz_attempt_grading_view,
    quiz_response_grade_view,
    quiz_attempt_bulk_grade_view,
    quiz_results_list_view,
    quiz_result_detail_view,
    quiz_result_print_view,
    quiz_results_export_view,
    quiz_results_bulk_print_view,
    student_quiz_list_view,
    student_quiz_detail_view,
    student_quiz_start_view,
    student_quiz_resume_view,
    student_quiz_take_view,
    student_quiz_save_view,
    student_quiz_submit_view,
    student_quiz_attempts_view,
    student_quiz_result_detail_view,
    student_quiz_result_print_view,
)

app_name = "quiz_app"

urlpatterns = [
    # Authentication URLs (School Users)
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    
    # Superadmin Authentication URLs
    path("superadmin/login/", superadmin_login_view, name="superadmin_login"),
    path("superadmin/logout/", superadmin_logout_view, name="superadmin_logout"),
    
    # Dashboard URLs
    path("", dashboard_view, name="dashboard"),
    path("dashboard/", dashboard_view, name="dashboard"),
    # Changed from admin/dashboard/ to dashboard/admin/ to avoid conflict with Django admin
    path("dashboard/admin/", admin_dashboard_view, name="admin_dashboard"),
    path("dashboard/teacher/", teacher_dashboard_view, name="teacher_dashboard"),
    path("dashboard/student/", student_dashboard_view, name="student_dashboard"),
    
    # Superadmin Dashboard
    path("superadmin/dashboard/", superadmin_dashboard_view, name="superadmin_dashboard"),
    
    # Session management
    path("extend-session/", extend_session_view, name="extend_session"),
    
    # Student Management URLs
    path("students/", student_list_view, name="student_list"),
    path("students/create/", student_create_view, name="student_create"),
    path("students/<int:student_id>/edit/", student_edit_view, name="student_edit"),
    path("students/<int:student_id>/delete/", student_delete_view, name="student_delete"),
    path("students/<int:student_id>/detail/", student_detail_view, name="student_detail"),
    path("students/profile/", student_profile_view, name="student_profile"),
    path("students/bulk-import/", student_bulk_import_view, name="student_bulk_import"),
    path("students/bulk-import/template/", student_bulk_import_template_view, name="student_bulk_import_template"),
    path("students/bulk-import/template-xlsx/", student_bulk_import_template_xlsx_view, name="student_bulk_import_template_xlsx"),
    path("students/bulk-import/preview-headers/", student_bulk_import_preview_headers_view, name="student_bulk_import_preview_headers"),
    path("students/bulk-delete/", student_bulk_delete_view, name="student_bulk_delete"),
    
    # Student Class Enrollment Management URLs
    path("enrollments/", student_enrollment_list_view, name="enrollment_list"),
    path("enrollments/create/", student_enrollment_create_view, name="enrollment_create"),
    path("enrollments/bulk-create/", student_enrollment_bulk_create_view, name="enrollment_bulk_create"),
    path("enrollments/<int:enrollment_id>/edit/", student_enrollment_edit_view, name="enrollment_edit"),
    path("enrollments/<int:enrollment_id>/delete/", student_enrollment_delete_view, name="enrollment_delete"),
    path("enrollments/bulk-delete/", student_enrollment_bulk_delete_view, name="enrollment_bulk_delete"),
    
    # Academic Year Management URLs
    path("academic-years/", academic_year_list_view, name="academic_year_list"),
    path("academic-years/create/", academic_year_create_view, name="academic_year_create"),
    path("academic-years/<int:academic_year_id>/edit/", academic_year_edit_view, name="academic_year_edit"),
    path("academic-years/<int:academic_year_id>/delete/", academic_year_delete_view, name="academic_year_delete"),
    path("academic-years/<int:academic_year_id>/set-current/", academic_year_set_current_view, name="academic_year_set_current"),
    
    # Term Management URLs
    path("terms/", term_list_view, name="term_list"),
    path("terms/create/", term_create_view, name="term_create"),
    path("terms/<int:term_id>/edit/", term_edit_view, name="term_edit"),
    path("terms/<int:term_id>/delete/", term_delete_view, name="term_delete"),
    path("terms/<int:term_id>/set-current/", term_set_current_view, name="term_set_current"),
    
    # Form Management URLs
    path("forms/", form_list_view, name="form_list"),
    path("forms/create/", form_create_view, name="form_create"),
    path("forms/<int:form_id>/edit/", form_edit_view, name="form_edit"),
    path("forms/<int:form_id>/delete/", form_delete_view, name="form_delete"),
    
    # Learning Area Management URLs
    path("learning-areas/", learning_area_list_view, name="learning_area_list"),
    path("learning-areas/create/", learning_area_create_view, name="learning_area_create"),
    path("learning-areas/<int:learning_area_id>/edit/", learning_area_edit_view, name="learning_area_edit"),
    path("learning-areas/<int:learning_area_id>/delete/", learning_area_delete_view, name="learning_area_delete"),
    
    # Department Management URLs
    path("departments/", department_list_view, name="department_list"),
    path("departments/create/", department_create_view, name="department_create"),
    path("departments/<int:department_id>/edit/", department_edit_view, name="department_edit"),
    path("departments/<int:department_id>/delete/", department_delete_view, name="department_delete"),
    
    # Subject Management URLs
    path("subjects/", subject_list_view, name="subject_list"),
    path("subjects/create/", subject_create_view, name="subject_create"),
    path("subjects/<int:subject_id>/edit/", subject_edit_view, name="subject_edit"),
    path("subjects/<int:subject_id>/delete/", subject_delete_view, name="subject_delete"),
    
    # Class Management URLs
    path("classes/", class_list_view, name="class_list"),
    path("classes/create/", class_create_view, name="class_create"),
    path("classes/<int:class_id>/edit/", class_edit_view, name="class_edit"),
    path("classes/<int:class_id>/delete/", class_delete_view, name="class_delete"),
    path("classes/<int:class_id>/detail/", class_detail_view, name="class_detail"),
    path("classes/<int:class_id>/subjects/add/", class_subject_add_view, name="class_subject_add"),
    path("classes/<int:class_id>/subjects/<int:class_subject_id>/remove/", class_subject_remove_view, name="class_subject_remove"),
    
    # Teacher Management URLs
    path("teachers/", teacher_list_view, name="teacher_list"),
    path("teachers/create/", teacher_create_view, name="teacher_create"),
    path("teachers/<int:teacher_id>/edit/", teacher_edit_view, name="teacher_edit"),
    path("teachers/<int:teacher_id>/delete/", teacher_delete_view, name="teacher_delete"),
    path("teachers/<int:teacher_id>/detail/", teacher_detail_view, name="teacher_detail"),
    path("teachers/profile/", teacher_profile_view, name="teacher_profile"),
    path("teachers/bulk-import/", teacher_bulk_import_view, name="teacher_bulk_import"),
    path("teachers/bulk-delete/", teacher_bulk_delete_view, name="teacher_bulk_delete"),
    
    # Teacher Subject Assignment Management URLs
    path("assignments/", assignment_list_view, name="assignment_list"),
    path("assignments/create/", assignment_create_view, name="assignment_create"),
    path("assignments/bulk-create/", assignment_bulk_create_view, name="assignment_bulk_create"),
    path("assignments/get-class-subjects/", get_class_subjects_view, name="get_class_subjects"),
    path("assignments/<int:assignment_id>/edit/", assignment_edit_view, name="assignment_edit"),
    path("assignments/<int:assignment_id>/delete/", assignment_delete_view, name="assignment_delete"),
    
    # School Management URLs (School Admin - own school only)
    path("school/", school_detail_view, name="school_detail"),  # For admin to view their own school
    path("school/edit/", school_edit_view, name="school_edit"),  # For admin to edit their own school
    
    # Superadmin School Management URLs (All schools)
    path("superadmin/schools/", superadmin_school_list_view, name="superadmin_school_list"),
    path("superadmin/schools/create/", superadmin_school_create_view, name="superadmin_school_create"),
    path("superadmin/schools/<int:school_id>/", superadmin_school_detail_view, name="superadmin_school_detail"),
    path("superadmin/schools/<int:school_id>/edit/", superadmin_school_edit_view, name="superadmin_school_edit"),
    path("superadmin/schools/<int:school_id>/delete/", superadmin_school_delete_view, name="superadmin_school_delete"),
    
    # Superadmin Admin Management URLs (Manage school administrators)
    path("superadmin/admins/", superadmin_admin_list_view, name="superadmin_admin_list"),
    path("superadmin/admins/create/", superadmin_admin_create_view, name="superadmin_admin_create"),
    path("superadmin/admins/<int:admin_id>/", superadmin_admin_detail_view, name="superadmin_admin_detail"),
    path("superadmin/admins/<int:admin_id>/edit/", superadmin_admin_edit_view, name="superadmin_admin_edit"),
    path("superadmin/admins/<int:admin_id>/delete/", superadmin_admin_delete_view, name="superadmin_admin_delete"),
    
    # User Management URLs
    path("users/", user_list_view, name="user_list"),
    path("users/create/", user_create_view, name="user_create"),
    path("users/<int:user_id>/edit/", user_edit_view, name="user_edit"),
    path("users/<int:user_id>/delete/", user_delete_view, name="user_delete"),
    path("users/bulk-password-reset/", user_bulk_password_reset_view, name="user_bulk_password_reset"),
    
    # Quiz Management URLs (for teachers)
    path("quizzes/", quiz_list_view, name="quiz_list"),
    path("quizzes/create/", quiz_create_view, name="quiz_create"),
    path("quizzes/<int:quiz_id>/edit/", quiz_edit_view, name="quiz_edit"),
    path("quizzes/<int:quiz_id>/delete/", quiz_delete_view, name="quiz_delete"),
    path("quizzes/<int:quiz_id>/detail/", quiz_detail_view, name="quiz_detail"),
    path("quizzes/<int:quiz_id>/update-status/", quiz_update_status_view, name="quiz_update_status"),
    path("quizzes/get-terms/", get_terms_for_academic_year_view, name="get_terms_for_academic_year"),
    
    # Question Management URLs (for teachers)
    path("quizzes/<int:quiz_id>/questions/", question_list_view, name="question_list"),
    path("quizzes/<int:quiz_id>/questions/create/", question_create_view, name="question_create"),
    path("quizzes/<int:quiz_id>/questions/<int:question_id>/edit/", question_edit_view, name="question_edit"),
    path("quizzes/<int:quiz_id>/questions/<int:question_id>/delete/", question_delete_view, name="question_delete"),
    path("quizzes/<int:quiz_id>/questions/<int:question_id>/duplicate/", question_duplicate_view, name="question_duplicate"),
    path("quizzes/<int:quiz_id>/questions/reorder/", question_reorder_view, name="question_reorder"),
    path("quizzes/<int:quiz_id>/questions/import/", question_bulk_import_view, name="question_bulk_import"),
    path("quizzes/<int:quiz_id>/questions/import-template/<str:format_type>/", question_import_template_view, name="question_import_template"),
    path("quizzes/<int:quiz_id>/questions/bulk-delete/", question_bulk_delete_view, name="question_bulk_delete"),
    
    # Quiz Assignment Management URLs (for teachers)
    path("quizzes/assignments/", quiz_assignment_overview_view, name="quiz_assignment_overview"),
    path("quizzes/<int:quiz_id>/assignments/", quiz_assignment_list_view, name="quiz_assignment_list"),
    path("quizzes/<int:quiz_id>/assignments/create/", quiz_assignment_create_view, name="quiz_assignment_create"),
    path("quizzes/<int:quiz_id>/assignments/<int:class_id>/delete/", quiz_assignment_delete_view, name="quiz_assignment_delete"),
    path("quizzes/<int:quiz_id>/assignments/bulk-delete/", quiz_assignment_bulk_delete_view, name="quiz_assignment_bulk_delete"),
    
    # Class Quiz List URL (view quizzes assigned to a class)
    path("classes/<int:class_id>/quizzes/", class_quiz_list_view, name="class_quiz_list"),
    
    # Quiz Grading Management URLs (for teachers)
    path("quizzes/grading/", quiz_grading_list_view, name="quiz_grading_list"),
    path("quizzes/attempts/<int:attempt_id>/grading/", quiz_attempt_grading_view, name="quiz_attempt_grading"),
    path("quizzes/responses/<int:response_id>/grade/", quiz_response_grade_view, name="quiz_response_grade"),
    path("quizzes/attempts/<int:attempt_id>/bulk-grade/", quiz_attempt_bulk_grade_view, name="quiz_attempt_bulk_grade"),
    
    # Quiz Results Management URLs (for teachers)
    path("quizzes/results/", quiz_results_list_view, name="quiz_results_list"),
    path("quizzes/results/<int:attempt_id>/", quiz_result_detail_view, name="quiz_result_detail"),
    path("quizzes/results/<int:attempt_id>/print/", quiz_result_print_view, name="quiz_result_print"),
    path("quizzes/results/bulk-print/", quiz_results_bulk_print_view, name="quiz_results_bulk_print"),
    path("quizzes/results/export/", quiz_results_export_view, name="quiz_results_export"),
    
    # Student Quiz URLs
    path("quizzes/available/", student_quiz_list_view, name="student_quiz_list"),
    path("quizzes/my-attempts/", student_quiz_attempts_view, name="student_quiz_attempts"),
    path("quizzes/<int:quiz_id>/preview/", student_quiz_detail_view, name="student_quiz_detail"),
    path("quizzes/<int:quiz_id>/start/", student_quiz_start_view, name="student_quiz_start"),
    path("quizzes/<int:quiz_id>/resume/", student_quiz_resume_view, name="student_quiz_resume"),
    path("quizzes/attempts/<int:attempt_id>/take/", student_quiz_take_view, name="student_quiz_take"),
    path("quizzes/attempts/<int:attempt_id>/save/", student_quiz_save_view, name="student_quiz_save"),
    path("quizzes/attempts/<int:attempt_id>/submit/", student_quiz_submit_view, name="student_quiz_submit"),
    path("quizzes/attempts/<int:attempt_id>/result/", student_quiz_result_detail_view, name="student_quiz_result_detail"),
    path("quizzes/attempts/<int:attempt_id>/result/print/", student_quiz_result_print_view, name="student_quiz_result_print"),
]

