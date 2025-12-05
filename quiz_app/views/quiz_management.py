"""
Quiz management views for teachers.

This module provides views for managing quizzes including:
- Listing quizzes
- Creating new quizzes
- Editing existing quizzes
- Deleting quizzes
- Viewing quiz details
- Updating quiz status
- Getting terms for academic year (AJAX)
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Max
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime
import json

from ..models import (
    Quiz,
    QuizCategory,
    Question,
    Teacher,
    Subject,
    Class,
    AcademicYear,
    Term,
    SchoolInformation,
    ClassSubject,
    TeacherSubjectAssignment,
)


@login_required
@require_http_methods(["GET"])
def quiz_list_view(request):
    """
    List all quizzes.
    - Teachers see only their own quizzes
    - Admins see all quizzes in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    school = request.user.school
    
    # Teachers see only their quizzes, admins see all quizzes in school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:dashboard")
        teacher = request.user.teacher_profile
        quizzes = Quiz.objects.filter(teacher=teacher, school=school)
    else:
        # Admin sees all quizzes in their school
        quizzes = Quiz.objects.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        quizzes = quizzes.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(quiz_id__icontains=search_query)
        )
    
    # Filter by subject
    subject_filter = request.GET.get('subject', '')
    if subject_filter:
        quizzes = quizzes.filter(subject_id=subject_filter)
    
    # Filter by status
    status_filter = request.GET.get('status', '')
    if status_filter:
        quizzes = quizzes.filter(status=status_filter)
    
    # Filter by category
    category_filter = request.GET.get('category', '')
    if category_filter:
        quizzes = quizzes.filter(category_id=category_filter)
    
    # Order by created date (newest first)
    quizzes = quizzes.order_by('-created_at')
    
    # Get filter options
    subjects = Subject.objects.filter(school=school).order_by('subject_name')
    categories = QuizCategory.objects.filter(school=school, is_active=True).order_by('name')
    
    context = {
        'quizzes': quizzes,
        'subjects': subjects,
        'categories': categories,
        'search_query': search_query,
    }
    
    return render(request, 'quiz/quiz_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def quiz_create_view(request):
    """
    Create a new quiz.
    
    GET: Returns quiz creation form
    POST: Creates quiz and returns JSON response or redirects
    
    - Teachers can create quizzes for subjects they teach
    - Admins can create quizzes for any subject and assign to any teacher
    """
    if request.user.role not in ["teacher", "admin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:quiz_list")
    
    school = request.user.school
    
    # For teachers, get their profile and filter subjects
    # For admins, show all subjects and allow teacher selection
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            if request.method == "GET":
                return JsonResponse({'error': 'Teacher profile not found'}, status=404)
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:quiz_list")
        teacher = request.user.teacher_profile
        
        if request.method == "GET":
            # Get related models for form
            # Only get subjects that the teacher is assigned to teach (TeacherSubjectAssignment)
            teacher_assignments = TeacherSubjectAssignment.objects.filter(
                teacher=teacher,
                school=school,
                is_active=True
            ).select_related('subject').distinct()
            
            subjects = Subject.objects.filter(
                id__in=teacher_assignments.values_list('subject_id', flat=True),
                school=school
            ).order_by('subject_name')
            
            categories = QuizCategory.objects.filter(school=school, is_active=True).order_by('name')
            classes = Class.objects.filter(school=school).order_by('name')
            academic_years = AcademicYear.objects.filter(school=school).order_by('-start_date')
            
            # Check if this is an AJAX request for modal
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                html = render(request, 'quiz/partials/quiz_form.html', {
                    'subjects': subjects,
                    'categories': categories,
                    'classes': classes,
                    'academic_years': academic_years,
                    'teachers': None,
                    'is_admin': False,
                    'quiz': None,
                }).content.decode('utf-8')
                return JsonResponse({'html': html})
            
            # Regular page request
            return render(request, 'quiz/quiz_create.html', {
                'subjects': subjects,
                'categories': categories,
                'classes': classes,
                'academic_years': academic_years,
                'teachers': None,
                'is_admin': False,
            })
    else:
        # Admin - show all subjects and teachers
        teacher = None
        if request.method == "GET":
            subjects = Subject.objects.filter(school=school).order_by('subject_name')
        
            categories = QuizCategory.objects.filter(school=school, is_active=True).order_by('name')
            classes = Class.objects.filter(school=school).order_by('name')
            academic_years = AcademicYear.objects.filter(school=school).order_by('-start_date')
            
            # For admins, also get teachers list
            teachers = None
            if request.user.role == "admin":
                from ..models import Teacher
                teachers = Teacher.objects.filter(school=school).order_by('full_name')
            
            # Check if this is an AJAX request for modal
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                html = render(request, 'quiz/partials/quiz_form.html', {
                    'subjects': subjects,
                    'categories': categories,
                    'classes': classes,
                    'academic_years': academic_years,
                    'teachers': teachers,
                    'is_admin': request.user.role == "admin",
                    'quiz': None,
                }).content.decode('utf-8')
                return JsonResponse({'html': html})
            
            # Regular page request
            return render(request, 'quiz/quiz_create.html', {
                'subjects': subjects,
                'categories': categories,
                'classes': classes,
                'academic_years': academic_years,
                'teachers': teachers,
                'is_admin': request.user.role == "admin",
            })
    
    # POST - Create quiz
    try:
        with transaction.atomic():
            # Get form data
            title = request.POST.get('title', '').strip()
            description = request.POST.get('description', '').strip() or None
            instructions = request.POST.get('instructions', '').strip() or None
            subject_id = request.POST.get('subject')
            category_id = request.POST.get('category') or None
            difficulty = request.POST.get('difficulty', 'medium')
            status = request.POST.get('status', 'draft')
            time_limit = request.POST.get('time_limit', '0')
            passing_marks = request.POST.get('passing_marks', '0')
            max_attempts = request.POST.get('max_attempts', '1')
            
            # Availability dates
            available_from = request.POST.get('available_from', '').strip()
            available_until = request.POST.get('available_until', '').strip()
            
            # Parse datetime
            available_from_dt = None
            if available_from:
                try:
                    # Parse datetime-local format (YYYY-MM-DDTHH:mm)
                    available_from_dt = datetime.strptime(available_from, '%Y-%m-%dT%H:%M')
                    available_from_dt = timezone.make_aware(available_from_dt)
                except:
                    pass
            
            available_until_dt = None
            if available_until:
                try:
                    available_until_dt = datetime.strptime(available_until, '%Y-%m-%dT%H:%M')
                    available_until_dt = timezone.make_aware(available_until_dt)
                except:
                    pass
            
            # Quiz settings
            randomize_questions = request.POST.get('randomize_questions') == 'on'
            randomize_answers = request.POST.get('randomize_answers') == 'on'
            show_results_immediately = request.POST.get('show_results_immediately') == 'on'
            show_correct_answers = request.POST.get('show_correct_answers') == 'on'
            allow_review = request.POST.get('allow_review') == 'on'
            require_password = request.POST.get('require_password') == 'on'
            quiz_password = request.POST.get('quiz_password', '').strip() or None
            
            # Validation
            if not title:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'error': 'Quiz title is required.'
                    }, status=400)
                messages.error(request, 'Quiz title is required.')
                return redirect("quiz_app:quiz_create")
            
            if not subject_id:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'error': 'Subject is required.'
                    }, status=400)
                messages.error(request, 'Subject is required.')
                return redirect("quiz_app:quiz_create")
            
            # Validate subject
            subject = get_object_or_404(Subject, pk=subject_id, school=school)
            
            # For admins, allow selecting a teacher
            if request.user.role == "admin":
                teacher_id = request.POST.get('teacher')
                if not teacher_id:
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': False,
                            'error': 'Teacher is required.'
                        }, status=400)
                    messages.error(request, 'Teacher is required.')
                    return redirect("quiz_app:quiz_create")
                from ..models import Teacher
                teacher = get_object_or_404(Teacher, pk=teacher_id, school=school)
            else:
                # For teachers, validate they are assigned to teach this subject
                teacher_assignment_exists = TeacherSubjectAssignment.objects.filter(
                    teacher=teacher,
                    subject=subject,
                    school=school,
                    is_active=True
                ).exists()
                
                if not teacher_assignment_exists:
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': False,
                            'error': f'You are not assigned to teach "{subject.subject_name}". Please contact administrator to assign you to this subject.'
                        }, status=400)
                    messages.error(request, f'You are not assigned to teach "{subject.subject_name}". Please contact administrator to assign you to this subject.')
                    return redirect("quiz_app:quiz_create")
            category = None
            if category_id:
                category = get_object_or_404(QuizCategory, pk=category_id, school=school)
            
            # Generate unique quiz_id
            quiz_id = f"QZ-{school.id:03d}{Quiz.objects.filter(school=school).count() + 1:05d}"
            
            # Create quiz
            quiz = Quiz(
                quiz_id=quiz_id,
                title=title,
                description=description,
                instructions=instructions,
                subject=subject,
                category=category,
                teacher=teacher,
                difficulty=difficulty,
                status=status,
                time_limit=int(time_limit) if time_limit else 0,
                passing_marks=int(passing_marks) if passing_marks else 0,
                max_attempts=int(max_attempts) if max_attempts else 1,
                available_from=available_from_dt,
                available_until=available_until_dt,
                randomize_questions=randomize_questions,
                randomize_answers=randomize_answers,
                show_results_immediately=show_results_immediately,
                show_correct_answers=show_correct_answers,
                allow_review=allow_review,
                require_password=require_password,
                quiz_password=quiz_password,
                school=school,
            )
            quiz.save()
            
            # Assign classes
            class_ids = request.POST.getlist('classes')
            if class_ids:
                classes = Class.objects.filter(pk__in=class_ids, school=school)
                quiz.classes.set(classes)
            
            # Assign academic year and term
            academic_year_id = request.POST.get('academic_year')
            term_id = request.POST.get('term')
            if academic_year_id:
                academic_year = get_object_or_404(AcademicYear, pk=academic_year_id, school=school)
                quiz.academic_year = academic_year
                if term_id:
                    term = get_object_or_404(Term, pk=term_id, academic_year=academic_year)
                    quiz.term = term
                quiz.save()
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': 'Quiz created successfully.',
                    'quiz_id': quiz.id,
                    'redirect': f'/quizzes/{quiz.id}/detail/',
                })
            
            messages.success(request, 'Quiz created successfully.')
            return redirect("quiz_app:quiz_detail", quiz_id=quiz.id)
    
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': f'Error creating quiz: {str(e)}'
            }, status=500)
        messages.error(request, f'Error creating quiz: {str(e)}')
        return redirect("quiz_app:quiz_create")


@login_required
@require_http_methods(["GET", "POST"])
def quiz_edit_view(request, quiz_id):
    """
    Edit an existing quiz.
    
    GET: Returns quiz edit form
    POST: Updates quiz and returns JSON response or redirects
    
    - Teachers can edit their own quizzes
    - Admins can edit any quiz in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:quiz_list")
    
    school = request.user.school
    
    # Teachers can only edit their own quizzes, admins can edit any quiz in their school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            if request.method == "GET":
                return JsonResponse({'error': 'Teacher profile not found'}, status=404)
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:quiz_list")
        teacher = request.user.teacher_profile
        quiz = get_object_or_404(Quiz, pk=quiz_id, teacher=teacher, school=school)
    else:
        # Admin can edit any quiz in their school
        quiz = get_object_or_404(Quiz, pk=quiz_id, school=school)
        teacher = quiz.teacher  # Use the quiz's teacher for context
    
    if request.method == "GET":
        # Get related models for form
        if request.user.role == "teacher":
            # Only get subjects that the teacher is assigned to teach (TeacherSubjectAssignment)
            # Include the current quiz's subject even if teacher is no longer assigned (for backwards compatibility)
            teacher_assignments = TeacherSubjectAssignment.objects.filter(
                teacher=teacher,
                school=school,
                is_active=True
            ).select_related('subject').distinct()
            
            teacher_subject_ids = list(teacher_assignments.values_list('subject_id', flat=True))
            
            # Include current quiz's subject if it exists (for backwards compatibility)
            if quiz.subject and quiz.subject.id not in teacher_subject_ids:
                teacher_subject_ids.append(quiz.subject.id)
            
            subjects = Subject.objects.filter(
                id__in=teacher_subject_ids,
                school=school
            ).order_by('subject_name')
        else:
            # Admin sees all subjects
            subjects = Subject.objects.filter(school=school).order_by('subject_name')
        
        categories = QuizCategory.objects.filter(school=school, is_active=True).order_by('name')
        classes = Class.objects.filter(school=school).order_by('name')
        academic_years = AcademicYear.objects.filter(school=school).order_by('-start_date')
        terms = []
        if quiz.academic_year:
            terms = Term.objects.filter(academic_year=quiz.academic_year).order_by('term_number')
        
        # For admins, also get teachers list
        teachers = None
        if request.user.role == "admin":
            from ..models import Teacher
            teachers = Teacher.objects.filter(school=school).order_by('full_name')
        
        # Check if this is an AJAX request for modal
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            html = render(request, 'quiz/partials/quiz_form.html', {
                'subjects': subjects,
                'categories': categories,
                'classes': classes,
                'academic_years': academic_years,
                'terms': terms,
                'teachers': teachers,
                'is_admin': request.user.role == "admin",
                'quiz': quiz,
            }).content.decode('utf-8')
            return JsonResponse({'html': html})
        
        # Regular page request
        return render(request, 'quiz/quiz_edit.html', {
            'quiz': quiz,
            'subjects': subjects,
            'categories': categories,
            'classes': classes,
            'academic_years': academic_years,
            'terms': terms,
            'teachers': teachers,
            'is_admin': request.user.role == "admin",
        })
    
    # POST - Update quiz
    try:
        with transaction.atomic():
            # Get form data
            quiz.title = request.POST.get('title', '').strip()
            quiz.description = request.POST.get('description', '').strip() or None
            quiz.instructions = request.POST.get('instructions', '').strip() or None
            subject_id = request.POST.get('subject')
            category_id = request.POST.get('category') or None
            
            # Validate and update subject if changed
            if subject_id:
                subject = get_object_or_404(Subject, pk=subject_id, school=school)
                
                # For teachers, validate they are assigned to teach this subject (only validate if changing)
                if request.user.role == "teacher":
                    if subject_id != str(quiz.subject.id):
                        teacher_assignment_exists = TeacherSubjectAssignment.objects.filter(
                            teacher=teacher,
                            subject=subject,
                            school=school,
                            is_active=True
                        ).exists()
                        
                        if not teacher_assignment_exists:
                            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                                return JsonResponse({
                                    'success': False,
                                    'error': f'You are not assigned to teach "{subject.subject_name}". Please contact administrator to assign you to this subject.'
                                }, status=400)
                            messages.error(request, f'You are not assigned to teach "{subject.subject_name}". Please contact administrator to assign you to this subject.')
                            return redirect("quiz_app:quiz_edit", quiz_id=quiz_id)
                
                # Update subject
                quiz.subject = subject
            
            # For admins, allow changing the teacher
            if request.user.role == "admin":
                teacher_id = request.POST.get('teacher')
                if teacher_id:
                    from ..models import Teacher
                    new_teacher = get_object_or_404(Teacher, pk=teacher_id, school=school)
                    quiz.teacher = new_teacher
                    teacher = new_teacher  # Update teacher variable for context
            
            quiz.difficulty = request.POST.get('difficulty', 'medium')
            quiz.status = request.POST.get('status', 'draft')
            quiz.time_limit = int(request.POST.get('time_limit', '0')) if request.POST.get('time_limit') else 0
            quiz.passing_marks = int(request.POST.get('passing_marks', '0')) if request.POST.get('passing_marks') else 0
            quiz.max_attempts = int(request.POST.get('max_attempts', '1')) if request.POST.get('max_attempts') else 1
            
            # Availability dates
            available_from = request.POST.get('available_from', '').strip()
            available_until = request.POST.get('available_until', '').strip()
            
            # Parse datetime
            if available_from:
                try:
                    available_from_dt = datetime.strptime(available_from, '%Y-%m-%dT%H:%M')
                    quiz.available_from = timezone.make_aware(available_from_dt)
                except:
                    pass
            else:
                quiz.available_from = None
            
            if available_until:
                try:
                    available_until_dt = datetime.strptime(available_until, '%Y-%m-%dT%H:%M')
                    quiz.available_until = timezone.make_aware(available_until_dt)
                except:
                    pass
            else:
                quiz.available_until = None
            
            # Quiz settings
            quiz.randomize_questions = request.POST.get('randomize_questions') == 'on'
            quiz.randomize_answers = request.POST.get('randomize_answers') == 'on'
            quiz.show_results_immediately = request.POST.get('show_results_immediately') == 'on'
            quiz.show_correct_answers = request.POST.get('show_correct_answers') == 'on'
            quiz.allow_review = request.POST.get('allow_review') == 'on'
            quiz.require_password = request.POST.get('require_password') == 'on'
            quiz.quiz_password = request.POST.get('quiz_password', '').strip() or None
            
            # Validation
            if not quiz.title:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'error': 'Quiz title is required.'
                    }, status=400)
                messages.error(request, 'Quiz title is required.')
                return redirect("quiz_app:quiz_edit", quiz_id=quiz_id)
            
            if subject_id:
                subject = get_object_or_404(Subject, pk=subject_id, school=school)
                quiz.subject = subject
            
            if category_id:
                category = get_object_or_404(QuizCategory, pk=category_id, school=school)
                quiz.category = category
            else:
                quiz.category = None
            
            quiz.save()
            
            # Assign classes
            class_ids = request.POST.getlist('classes')
            if class_ids:
                classes = Class.objects.filter(pk__in=class_ids, school=school)
                quiz.classes.set(classes)
            else:
                quiz.classes.clear()
            
            # Assign academic year and term
            academic_year_id = request.POST.get('academic_year')
            term_id = request.POST.get('term')
            if academic_year_id:
                academic_year = get_object_or_404(AcademicYear, pk=academic_year_id, school=school)
                quiz.academic_year = academic_year
                if term_id:
                    term = get_object_or_404(Term, pk=term_id, academic_year=academic_year)
                    quiz.term = term
                else:
                    quiz.term = None
            else:
                quiz.academic_year = None
                quiz.term = None
            
            quiz.save()
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': 'Quiz updated successfully.',
                    'quiz_id': quiz.id,
                })
            
            messages.success(request, 'Quiz updated successfully.')
            return redirect("quiz_app:quiz_detail", quiz_id=quiz_id)
    
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': f'Error updating quiz: {str(e)}'
            }, status=500)
        messages.error(request, f'Error updating quiz: {str(e)}')
        return redirect("quiz_app:quiz_edit", quiz_id=quiz_id)


@login_required
@require_http_methods(["POST"])
def quiz_delete_view(request, quiz_id):
    """
    Delete a quiz.
    
    - Teachers can delete their own quizzes
    - Admins can delete any quiz in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Teachers can only delete their own quizzes, admins can delete any quiz in their school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            return JsonResponse({'error': 'Teacher profile not found'}, status=404)
        teacher = request.user.teacher_profile
        quiz = get_object_or_404(Quiz, pk=quiz_id, teacher=teacher, school=school)
    else:
        # Admin can delete any quiz in their school
        quiz = get_object_or_404(Quiz, pk=quiz_id, school=school)
    
    try:
        quiz_title = quiz.title
        quiz.delete()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'Quiz "{quiz_title}" deleted successfully.'
            })
        
        messages.success(request, f'Quiz "{quiz_title}" deleted successfully.')
        return redirect("quiz_app:quiz_list")
    
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'error': f'Error deleting quiz: {str(e)}'
            }, status=500)
        messages.error(request, f'Error deleting quiz: {str(e)}')
        return redirect("quiz_app:quiz_list")


@login_required
@require_http_methods(["GET"])
def quiz_detail_view(request, quiz_id):
    """
    Display detailed information about a quiz.
    
    - Teachers can view their own quizzes
    - Admins can view any quiz in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    school = request.user.school
    
    # Teachers can only view their own quizzes, admins can view any quiz in their school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:dashboard")
        teacher = request.user.teacher_profile
        quiz = get_object_or_404(Quiz, pk=quiz_id, teacher=teacher, school=school)
    else:
        # Admin can view any quiz in their school
        quiz = get_object_or_404(Quiz, pk=quiz_id, school=school)
    
    # Get questions with answer choices
    questions = quiz.questions.all().prefetch_related('answer_choices').order_by('order', 'created_at')
    
    context = {
        'quiz': quiz,
        'questions': questions,
    }
    
    return render(request, 'quiz/quiz_detail.html', context)


@login_required
@require_http_methods(["POST"])
def quiz_update_status_view(request, quiz_id):
    """
    Update quiz status (draft, published, archived).
    
    - Teachers can update their own quizzes
    - Admins can update any quiz in their school
    """
    if request.user.role not in ["teacher", "admin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Teachers can only update their own quizzes, admins can update any quiz in their school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            return JsonResponse({'error': 'Teacher profile not found'}, status=404)
        teacher = request.user.teacher_profile
        quiz = get_object_or_404(Quiz, pk=quiz_id, teacher=teacher, school=school)
    else:
        # Admin can update any quiz in their school
        quiz = get_object_or_404(Quiz, pk=quiz_id, school=school)
    
    try:
        new_status = request.POST.get('status')
        if new_status not in ['draft', 'published', 'archived']:
            return JsonResponse({
                'success': False,
                'error': 'Invalid status.'
            }, status=400)
        
        quiz.status = new_status
        quiz.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Quiz status updated to {new_status}.',
            'status': new_status,
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating status: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def get_terms_for_academic_year_view(request):
    """
    AJAX endpoint to get terms for a selected academic year.
    """
    if request.user.role != "teacher":
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    academic_year_id = request.GET.get('academic_year_id')
    
    if not academic_year_id:
        return JsonResponse({'error': 'Academic year ID is required.'}, status=400)
    
    try:
        academic_year = get_object_or_404(AcademicYear, pk=academic_year_id, school=school)
        terms = Term.objects.filter(academic_year=academic_year).order_by('term_number')
        
        terms_data = [{
            'id': term.id,
            'name': term.name,
            'term_number': term.term_number,
        } for term in terms]
        
        return JsonResponse({
            'success': True,
            'terms': terms_data,
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error fetching terms: {str(e)}'
        }, status=500)
