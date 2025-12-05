"""
Superadmin dashboard views.

Separate dashboard for superadmin users showing system-wide statistics.
"""
import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q
from django.utils import timezone

from ..models import (
    SchoolInformation,
    User,
    Student,
    Teacher,
    Class,
    Subject,
    Quiz,
    QuizAttempt,
)

logger = logging.getLogger(__name__)


@login_required
def superadmin_dashboard_view(request):
    """
    Superadmin dashboard with system-wide statistics.
    
    Shows:
    - Total schools
    - Total users (all schools)
    - Total students (all schools)
    - Total teachers (all schools)
    - Total quizzes (all schools)
    - Recent schools
    - Recent activities
    """
    # Check if user is superadmin
    if request.user.role != "superadmin":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:login")
    
    # Get system-wide statistics
    stats = {}
    
    try:
        # School statistics
        all_schools = SchoolInformation.objects.all()
        stats["total_schools"] = all_schools.filter(is_active=True).count()
        stats["inactive_schools"] = all_schools.filter(is_active=False).count()
        
        # User statistics (all schools)
        stats["total_users"] = User.objects.count()
        stats["total_admins"] = User.objects.filter(role="admin", is_superadmin=False).count()
        stats["total_teachers"] = User.objects.filter(role="teacher").count()
        stats["total_students"] = User.objects.filter(role="student").count()
        stats["total_superadmins"] = User.objects.filter(is_superadmin=True).count()
        
        # Student statistics (all schools)
        stats["total_students_all"] = Student.objects.count()
        
        # Teacher statistics (all schools)
        stats["total_teachers_all"] = Teacher.objects.count()
        
        # Class statistics (all schools)
        stats["total_classes"] = Class.objects.count()
        
        # Subject statistics (all schools)
        stats["total_subjects"] = Subject.objects.count()
        
        # Quiz statistics (all schools)
        stats["total_quizzes"] = Quiz.objects.count()
        stats["published_quizzes"] = Quiz.objects.filter(status="published", is_active=True).count()
        stats["draft_quizzes"] = Quiz.objects.filter(status="draft", is_active=True).count()
        
        # Quiz attempt statistics (all schools)
        stats["total_attempts"] = QuizAttempt.objects.count()
        stats["completed_attempts"] = QuizAttempt.objects.filter(is_submitted=True).count()
        
        # Recent schools (last 5)
        recent_schools = list(all_schools.order_by('-date_created')[:5])
        
        # Schools with most users (handle case where related_name might not work)
        try:
            schools_with_users = list(
                SchoolInformation.objects.annotate(
                    user_count=Count('users')
                ).order_by('-user_count')[:5]
            )
        except Exception:
            # Fallback if Count fails
            schools_with_users = []
        
        # Schools with most students
        try:
            schools_with_students = list(
                SchoolInformation.objects.annotate(
                    student_count=Count('students')
                ).order_by('-student_count')[:5]
            )
        except Exception:
            # Fallback if Count fails
            schools_with_students = []
        
        # Recent activities (recent quizzes across all schools)
        try:
            recent_quizzes = list(
                Quiz.objects.select_related('school', 'teacher', 'subject')
                .order_by('-created_at')[:10]
            )
        except Exception:
            recent_quizzes = []
        
        # Schools by status
        active_schools = all_schools.filter(is_active=True)
        inactive_schools = all_schools.filter(is_active=False)
        
        context = {
            'stats': stats,
            'recent_schools': recent_schools,
            'schools_with_users': schools_with_users,
            'schools_with_students': schools_with_students,
            'recent_quizzes': recent_quizzes,
            'active_schools': active_schools,
            'inactive_schools': inactive_schools,
        }
        
        return render(request, "superadmin/dashboard.html", context)
    
    except Exception as e:
        logger.error(f"Error loading superadmin dashboard: {str(e)}", exc_info=True)
        messages.error(request, f"Error loading dashboard: {str(e)}")
        
        # Provide default context to prevent template errors
        context = {
            'stats': {
                'total_schools': 0,
                'inactive_schools': 0,
                'total_users': 0,
                'total_admins': 0,
                'total_teachers': 0,
                'total_students': 0,
                'total_superadmins': 0,
                'total_students_all': 0,
                'total_teachers_all': 0,
                'total_classes': 0,
                'total_subjects': 0,
                'total_quizzes': 0,
                'published_quizzes': 0,
                'draft_quizzes': 0,
                'total_attempts': 0,
                'completed_attempts': 0,
            },
            'recent_schools': [],
            'schools_with_users': [],
            'schools_with_students': [],
            'recent_quizzes': [],
            'active_schools': SchoolInformation.objects.none(),
            'inactive_schools': SchoolInformation.objects.none(),
        }
        return render(request, "superadmin/dashboard.html", context)

