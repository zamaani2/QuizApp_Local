"""
Dashboard views for different user roles.

This module provides dashboard views for admin, teacher, and student roles.
"""
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.http import JsonResponse

from ..models import (
    Student,
    Teacher,
    Class,
    SchoolInformation,
    Quiz,
    QuizAttempt,
)


@login_required
def dashboard_view(request):
    """
    Display dashboard based on user role.
    
    Routes users to their appropriate dashboard based on their role.
    """
    user = request.user

    # Redirect to role-specific dashboard
    if user.role == "superadmin":
        # Superadmins should use their separate dashboard
        return redirect("quiz_app:superadmin_dashboard")
    elif user.role == "admin":
        return redirect("quiz_app:admin_dashboard")
    elif user.role == "teacher":
        return redirect("quiz_app:teacher_dashboard")
    elif user.role == "student":
        return redirect("quiz_app:student_dashboard")
    else:
        messages.error(request, "Unknown user role. Please contact administrator.")
        return redirect("quiz_app:login")


@login_required
def admin_dashboard_view(request):
    """
    Enhanced admin dashboard view with comprehensive statistics and recent activities.
    
    Displays:
    - User statistics (students, teachers, classes, subjects, departments)
    - Quiz statistics (total, published, draft, archived, attempts)
    - Performance metrics (average scores, completion rates, pass rates)
    - Recent activities (quizzes, attempts, users)
    - Quizzes needing grading
    - Popular quizzes
    - Current academic year and term
    """
    # Check if user has admin privileges (superadmin should use their own dashboard)
    if request.user.role != "admin":
        if request.user.role == "superadmin":
            return redirect("quiz_app:superadmin_dashboard")
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    from django.db.models import Count, Avg, Max, Q
    from ..models import (
        Subject, Department, QuizCategory, StudentClass, ClassSubject,
        QuizResponse
    )

    user = request.user
    school = user.school

    # Get statistics
    stats = {}

    try:
        # Student statistics
        students_query = Student.objects.all()
        if school:
            students_query = students_query.filter(school=school)
        stats["total_students"] = students_query.count()
        
        # Active students are those with active class assignments
        if school:
            stats["active_students"] = StudentClass.objects.filter(
                school=school,
                is_active=True
            ).values('student').distinct().count()
        else:
            stats["active_students"] = StudentClass.objects.filter(
                is_active=True
            ).values('student').distinct().count()
        
        # Students with class assignments (current academic year)
        if school and school.current_academic_year:
            stats["enrolled_students"] = StudentClass.objects.filter(
                school=school,
                assigned_class__academic_year=school.current_academic_year,
                is_active=True
            ).values('student').distinct().count()
        else:
            stats["enrolled_students"] = StudentClass.objects.filter(
                school=school,
                is_active=True
            ).values('student').distinct().count() if school else 0

        # Teacher statistics
        teachers_query = Teacher.objects.all()
        if school:
            teachers_query = teachers_query.filter(school=school)
        stats["total_teachers"] = teachers_query.count()
        
        # Active teachers are those with active subject assignments
        if school:
            stats["active_teachers"] = teachers_query.filter(
                teachersubjectassignment__is_active=True
            ).distinct().count()
        else:
            stats["active_teachers"] = Teacher.objects.filter(
                teachersubjectassignment__is_active=True
            ).distinct().count()

        # Class statistics
        classes_query = Class.objects.all()
        if school:
            classes_query = classes_query.filter(school=school)
        stats["total_classes"] = classes_query.count()
        
        # Subject and Department statistics
        subjects_query = Subject.objects.all()
        departments_query = Department.objects.all()
        if school:
            subjects_query = subjects_query.filter(school=school)
            departments_query = departments_query.filter(school=school)
        stats["total_subjects"] = subjects_query.count()
        stats["total_departments"] = departments_query.count()
        
        # Quiz Category statistics
        categories_query = QuizCategory.objects.all()
        if school:
            categories_query = categories_query.filter(school=school)
        stats["total_categories"] = categories_query.filter(is_active=True).count()

        # Quiz statistics
        quizzes_query = Quiz.objects.all()
        if school:
            quizzes_query = quizzes_query.filter(school=school)
        stats["total_quizzes"] = quizzes_query.count()
        stats["published_quizzes"] = quizzes_query.filter(
            status="published", is_active=True
        ).count()
        stats["draft_quizzes"] = quizzes_query.filter(
            status="draft", is_active=True
        ).count()
        stats["archived_quizzes"] = quizzes_query.filter(
            status="archived"
        ).count()
        stats["active_quizzes"] = stats["published_quizzes"]

        # Quiz attempts
        attempts_query = QuizAttempt.objects.all()
        if school:
            attempts_query = attempts_query.filter(school=school)
        stats["total_attempts"] = attempts_query.count()
        stats["completed_attempts"] = attempts_query.filter(
            is_submitted=True, is_completed=True
        ).count()
        stats["in_progress_attempts"] = attempts_query.filter(
            is_submitted=False, is_completed=False
        ).count()
        
        # Calculate completion rate
        if stats["total_attempts"] > 0:
            stats["completion_rate"] = round(
                (stats["completed_attempts"] / stats["total_attempts"]) * 100, 1
            )
        else:
            stats["completion_rate"] = 0.0

        # Performance metrics
        completed_attempts = attempts_query.filter(
            is_submitted=True, is_completed=True
        )
        if completed_attempts.exists():
            stats["average_score"] = round(
                completed_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0, 1
            )
            stats["average_marks"] = round(
                completed_attempts.aggregate(avg=Avg('score'))['avg'] or 0, 1
            )
            stats["highest_score"] = round(
                completed_attempts.aggregate(max=Max('percentage'))['max'] or 0, 1
            )
        else:
            stats["average_score"] = 0.0
            stats["average_marks"] = 0.0
            stats["highest_score"] = 0.0

        # Quizzes needing grading
        if school:
            quizzes_needing_grading = QuizResponse.objects.filter(
                attempt__school=school,
                question__question_type='essay',
                is_graded=False,
                attempt__is_submitted=True
            ).values('attempt__quiz').distinct().count()
        else:
            quizzes_needing_grading = QuizResponse.objects.filter(
                question__question_type='essay',
                is_graded=False,
                attempt__is_submitted=True
            ).values('attempt__quiz').distinct().count()
        stats["quizzes_needing_grading"] = quizzes_needing_grading

        # Get current academic year and term
        current_academic_year = None
        current_term = None
        if school:
            current_academic_year = school.current_academic_year
            current_term = school.current_term

        # Recent activities
        # Recent quiz attempts (completed)
        recent_attempts = attempts_query.filter(
            is_submitted=True, is_completed=True
        ).select_related('quiz', 'student', 'quiz__subject').order_by(
            "-submitted_at"
        )[:10]

        # Recent quizzes
        recent_quizzes = quizzes_query.select_related(
            'teacher', 'subject', 'category'
        ).order_by('-created_at')[:5]

        # Recent students
        recent_students = students_query.select_related('school').order_by(
            '-admission_date'
        )[:5]

        # Recent teachers
        recent_teachers = teachers_query.select_related('school', 'department').order_by(
            '-id'
        )[:5]

        # Popular quizzes (by attempt count)
        popular_quizzes = quizzes_query.annotate(
            attempt_count=Count('attempts')
        ).filter(attempt_count__gt=0).select_related(
            'teacher', 'subject'
        ).order_by('-attempt_count')[:5]

        # Top performing students
        top_students = students_query.annotate(
            total_attempts=Count('quiz_attempts', filter=Q(quiz_attempts__is_completed=True)),
            avg_score=Avg('quiz_attempts__percentage', filter=Q(quiz_attempts__is_completed=True))
        ).filter(total_attempts__gt=0).order_by('-avg_score')[:5]

        # Get school information
        school_info = school if school else SchoolInformation.objects.filter(is_active=True).first()

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error loading admin dashboard data: {str(e)}", exc_info=True)
        messages.error(request, f"Error loading dashboard data: {str(e)}")
        stats = {
            "total_students": 0,
            "active_students": 0,
            "enrolled_students": 0,
            "total_teachers": 0,
            "active_teachers": 0,
            "total_classes": 0,
            "total_subjects": 0,
            "total_departments": 0,
            "total_categories": 0,
            "total_quizzes": 0,
            "published_quizzes": 0,
            "draft_quizzes": 0,
            "archived_quizzes": 0,
            "active_quizzes": 0,
            "total_attempts": 0,
            "completed_attempts": 0,
            "in_progress_attempts": 0,
            "completion_rate": 0.0,
            "average_score": 0.0,
            "average_marks": 0.0,
            "highest_score": 0.0,
            "quizzes_needing_grading": 0,
        }
        recent_attempts = []
        recent_quizzes = []
        recent_students = []
        recent_teachers = []
        popular_quizzes = []
        top_students = []
        current_academic_year = None
        current_term = None
        school_info = None

    context = {
        "user": user,
        "school": school_info,
        "stats": stats,
        "recent_attempts": recent_attempts,
        "recent_quizzes": recent_quizzes,
        "recent_students": recent_students,
        "recent_teachers": recent_teachers,
        "popular_quizzes": popular_quizzes,
        "top_students": top_students,
        "current_academic_year": current_academic_year,
        "current_term": current_term,
    }

    return render(request, "dashboard/admin_dashboard.html", context)


@login_required
def teacher_dashboard_view(request):
    """
    Teacher dashboard view with quiz statistics and recent activity.
    
    - Teachers see their own quiz statistics
    - Admins see all quiz statistics in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    from ..models import (
        Quiz, QuizAttempt, QuizResponse
    )
    from django.db.models import Q, Count, Avg
    from django.utils import timezone

    school = request.user.school
    
    # Teachers see only their quizzes, admins see all quizzes in school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:dashboard")
        teacher = request.user.teacher_profile
        all_quizzes = Quiz.objects.filter(teacher=teacher, school=school, is_active=True)
    else:
        # Admin sees all quizzes in their school
        all_quizzes = Quiz.objects.filter(school=school, is_active=True)
        teacher = None
    
    # Calculate statistics
    total_quizzes = all_quizzes.count()
    published_quizzes = all_quizzes.filter(status="published").count()
    draft_quizzes = all_quizzes.filter(status="draft").count()
    archived_quizzes = all_quizzes.filter(status="archived").count()
    
    # Get all attempts for teacher's quizzes
    teacher_quizzes_ids = all_quizzes.values_list('id', flat=True)
    all_attempts = QuizAttempt.objects.filter(
        quiz_id__in=teacher_quizzes_ids,
        school=school
    ).select_related('quiz', 'student', 'quiz__subject')
    
    total_attempts = all_attempts.count()
    completed_attempts = all_attempts.filter(is_submitted=True, is_completed=True)
    completed_attempts_count = completed_attempts.count()
    
    # Quizzes needing grading (attempts with essay questions that need manual grading)
    attempts_needing_grading = all_attempts.filter(
        needs_grading=True,
        is_graded=False,
        is_submitted=True
    ).select_related('quiz', 'quiz__subject').order_by('-submitted_at')
    
    # Get unique quizzes that need grading
    quizzes_needing_grading_ids = attempts_needing_grading.values_list('quiz_id', flat=True).distinct()
    quizzes_needing_grading_count = len(quizzes_needing_grading_ids)
    
    # Get quiz objects for display with counts
    quizzes_needing_grading_list = []
    for quiz_id in quizzes_needing_grading_ids[:5]:
        quiz = Quiz.objects.get(id=quiz_id)
        pending_attempts_count = all_attempts.filter(
            quiz_id=quiz_id,
            needs_grading=True,
            is_graded=False,
            is_submitted=True
        ).count()
        pending_responses_count = QuizResponse.objects.filter(
            attempt__quiz_id=quiz_id,
            attempt__school=school,
            question__question_type='essay',
            is_graded=False,
            attempt__is_submitted=True
        ).count()
        quiz.pending_attempts = pending_attempts_count
        quiz.pending_responses = pending_responses_count
        quizzes_needing_grading_list.append(quiz)
    
    # Get responses needing grading
    responses_needing_grading = QuizResponse.objects.filter(
        attempt__quiz_id__in=teacher_quizzes_ids,
        attempt__school=school,
        question__question_type='essay',
        is_graded=False,
        attempt__is_submitted=True
    ).select_related('attempt', 'question', 'attempt__student', 'attempt__quiz')
    
    responses_needing_grading_count = responses_needing_grading.count()
    
    # Average score across all completed attempts
    avg_score = completed_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
    
    # Recent quizzes (last 5 created)
    recent_quizzes = all_quizzes.order_by('-created_at')[:5]
    
    # Recent attempts (last 5)
    recent_attempts = all_attempts.order_by('-submitted_at', '-started_at')[:5]
    
    # Quizzes with most attempts (top 5)
    popular_quizzes = all_quizzes.annotate(
        attempt_count=Count('attempts')
    ).filter(attempt_count__gt=0).order_by('-attempt_count')[:5]
    
    context = {
        "user": request.user,
        "teacher": teacher,
        "total_quizzes": total_quizzes,
        "published_quizzes": published_quizzes,
        "draft_quizzes": draft_quizzes,
        "archived_quizzes": archived_quizzes,
        "total_attempts": total_attempts,
        "completed_attempts_count": completed_attempts_count,
        "quizzes_needing_grading_count": quizzes_needing_grading_count,
        "responses_needing_grading_count": responses_needing_grading_count,
        "avg_score": avg_score,
        "recent_quizzes": recent_quizzes,
        "recent_attempts": recent_attempts,
        "popular_quizzes": popular_quizzes,
        "quizzes_needing_grading": quizzes_needing_grading_list,
    }

    return render(request, "dashboard/teacher_dashboard.html", context)


@login_required
def student_dashboard_view(request):
    """
    Student dashboard view with quiz statistics and recent activity.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")

    from ..models import (
        Quiz, QuizAttempt, StudentClass, ClassSubject,
        AcademicYear, Term, Subject
    )
    from django.db.models import Q, Count, Avg, Max
    from django.utils import timezone

    student = request.user.student_profile
    school = request.user.school
    now = timezone.now()

    # Get student's current class assignment
    current_enrollment = StudentClass.objects.filter(
        student=student,
        school=school,
        is_active=True
    ).select_related('assigned_class', 'assigned_class__academic_year', 'assigned_by').order_by('-date_assigned').first()

    if not current_enrollment:
        context = {
            "user": request.user,
            "no_class_assignment": True,
        }
        return render(request, "dashboard/student_dashboard.html", context)

    assigned_class = current_enrollment.assigned_class
    # Get academic_year from the assigned class
    academic_year = assigned_class.academic_year if assigned_class else None
    # Get current term from school (school is already a SchoolInformation instance)
    term = school.current_term if school else None

    # Get quizzes assigned to this class
    class_subjects = ClassSubject.objects.filter(
        class_name=assigned_class,
        school=school
    ).values_list('subject_id', flat=True)

    # Get available quizzes
    available_quizzes = Quiz.objects.filter(
        classes=assigned_class,
        school=school,
        status="published",
        is_active=True
    ).filter(
        Q(available_from__lte=now) | Q(available_from__isnull=True),
        Q(available_until__gte=now) | Q(available_until__isnull=True)
    ).distinct()

    # Get all quiz attempts for this student
    all_attempts = QuizAttempt.objects.filter(
        student=student,
        school=school
    ).select_related('quiz', 'quiz__subject', 'academic_year', 'term')

    # Get completed attempts
    completed_attempts = all_attempts.filter(
        is_submitted=True,
        is_completed=True
    )

    # Get in-progress attempts
    in_progress_attempts = all_attempts.filter(
        is_submitted=False,
        is_completed=False
    )

    # Calculate statistics
    total_available = available_quizzes.count()
    total_completed = completed_attempts.count()
    total_in_progress = in_progress_attempts.count()
    
    # Average score
    avg_score = completed_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
    
    # Best score
    best_attempt = completed_attempts.order_by('-percentage', '-score').first()
    best_score = best_attempt.percentage if best_attempt else 0

    # Recent attempts (last 5)
    recent_attempts = all_attempts.order_by('-submitted_at', '-started_at')[:5]

    # Upcoming quizzes (available in the next 7 days)
    from datetime import timedelta
    next_week = now + timedelta(days=7)
    upcoming_quizzes = Quiz.objects.filter(
        classes=assigned_class,
        school=school,
        status="published",
        is_active=True,
        available_from__gt=now,
        available_from__lte=next_week
    ).distinct()[:5]

    # Quizzes due soon (expiring in the next 7 days)
    due_soon_quizzes = Quiz.objects.filter(
        classes=assigned_class,
        school=school,
        status="published",
        is_active=True,
        available_until__gt=now,
        available_until__lte=next_week
    ).distinct()[:5]

    context = {
        "user": request.user,
        "student": student,
        "assigned_class": assigned_class,
        "academic_year": academic_year,
        "term": term,
        "total_available": total_available,
        "total_completed": total_completed,
        "total_in_progress": total_in_progress,
        "avg_score": avg_score,
        "best_score": best_score,
        "recent_attempts": recent_attempts,
        "upcoming_quizzes": upcoming_quizzes,
        "due_soon_quizzes": due_soon_quizzes,
        "in_progress_attempts": in_progress_attempts[:3],  # Show top 3
    }

    return render(request, "dashboard/student_dashboard.html", context)


@login_required
@require_http_methods(["POST"])
def extend_session_view(request):
    """
    Extend user session.
    
    AJAX endpoint to extend the user's session expiry time.
    """
    try:
        # Reset session expiry
        request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

