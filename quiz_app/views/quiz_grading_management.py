"""
Quiz Grading Management views for teachers.

This module provides views for grading student quiz attempts, especially essay questions:
- Listing attempts that need grading
- Viewing attempt details for grading
- Grading individual responses
- Bulk grading operations
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Count, F
from django.db import transaction
from django.utils import timezone

from ..models import (
    Quiz,
    QuizAttempt,
    QuizResponse,
    Question,
    Teacher,
)


@login_required
@require_http_methods(["GET"])
def quiz_grading_list_view(request):
    """
    Display list of quiz attempts that need grading.
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
        teacher_quizzes = Quiz.objects.filter(teacher=teacher, school=school)
    else:
        # Admin sees all quizzes in their school
        teacher_quizzes = Quiz.objects.filter(school=school)
    
    # Get attempts that need grading (submitted and have essay questions that aren't graded)
    attempts = QuizAttempt.objects.filter(
        quiz__in=teacher_quizzes,
        school=school,
        is_submitted=True
    ).select_related('quiz', 'student', 'academic_year', 'term').prefetch_related('responses').order_by('-submitted_at')
    
    # Filter by quiz
    quiz_filter = request.GET.get('quiz', '')
    if quiz_filter:
        attempts = attempts.filter(quiz_id=quiz_filter)
    
    # Filter by grading status
    grading_status = request.GET.get('status', 'needs_grading')
    if grading_status == 'needs_grading':
        # Get attempts that have responses needing grading
        attempts_with_ungraded = QuizResponse.objects.filter(
            attempt__quiz__in=teacher_quizzes,
            attempt__school=school,
            attempt__is_submitted=True,
            question__question_type='essay',
            is_graded=False
        ).values_list('attempt_id', flat=True).distinct()
        attempts = attempts.filter(id__in=attempts_with_ungraded)
    elif grading_status == 'graded':
        attempts = attempts.filter(is_graded=True)
    elif grading_status == 'all':
        pass  # Show all
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        attempts = attempts.filter(
            Q(student__full_name__icontains=search_query) |
            Q(student__admission_number__icontains=search_query) |
            Q(quiz__title__icontains=search_query)
        )
    
    # Annotate each attempt with grading info
    for attempt in attempts:
        all_essay_responses = attempt.responses.filter(
            question__question_type='essay'
        )
        essay_responses_ungraded = all_essay_responses.filter(is_graded=False)
        attempt.ungraded_essay_count = essay_responses_ungraded.count()
        attempt.total_essay_count = all_essay_responses.count()
        attempt.graded_essay_count = attempt.total_essay_count - attempt.ungraded_essay_count
        attempt.needs_grading = attempt.ungraded_essay_count > 0
    
    # Get filter options
    quizzes = teacher_quizzes.order_by('-created_at')
    
    context = {
        'attempts': attempts,
        'quizzes': quizzes,
        'quiz_filter': quiz_filter,
        'grading_status': grading_status,
        'search_query': search_query,
    }
    
    return render(request, 'quiz/grading/quiz_grading_list.html', context)


@login_required
@require_http_methods(["GET"])
def quiz_attempt_grading_view(request, attempt_id):
    """
    Display attempt details for grading.
    """
    if request.user.role not in ["teacher", "admin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    school = request.user.school
    
    # Teachers can only grade their own quizzes, admins can grade any quiz in their school
    if request.user.role == "teacher":
        if not request.user.teacher_profile:
            messages.error(request, "Teacher profile not found. Please contact administrator.")
            return redirect("quiz_app:dashboard")
        teacher = request.user.teacher_profile
        attempt = get_object_or_404(
            QuizAttempt,
            pk=attempt_id,
            quiz__teacher=teacher,
            school=school,
            is_submitted=True
        )
    else:
        # Admin can grade any attempt in their school
        attempt = get_object_or_404(
            QuizAttempt,
            pk=attempt_id,
            school=school,
            is_submitted=True
        )
    
    # Get all responses ordered by question order
    responses = attempt.responses.select_related(
        'question'
    ).prefetch_related(
        'question__answer_choices',
        'selected_choice',
        'selected_choices'
    ).order_by('question__order')
    
    # Separate responses by type
    essay_responses = responses.filter(question__question_type='essay')
    other_responses = responses.exclude(question__question_type='essay')
    
    # Check if all essay questions are graded
    ungraded_essay_count = essay_responses.filter(is_graded=False).count()
    
    context = {
        'attempt': attempt,
        'responses': responses,
        'essay_responses': essay_responses,
        'other_responses': other_responses,
        'ungraded_essay_count': ungraded_essay_count,
    }
    
    return render(request, 'quiz/grading/quiz_attempt_grading.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def quiz_response_grade_view(request, response_id):
    """
    Grade a single quiz response (especially for essay questions).
    
    GET: Returns grading form modal
    POST: Saves grade and returns JSON response
    """
    if request.user.role not in ["teacher", "admin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if not request.user.teacher_profile:
        if request.method == "GET":
            return JsonResponse({'error': 'Teacher profile not found'}, status=404)
        return JsonResponse({'error': 'Teacher profile not found'}, status=404)
    
    teacher = request.user.teacher_profile
    school = request.user.school
    
    response = get_object_or_404(
        QuizResponse,
        pk=response_id,
        attempt__quiz__teacher=teacher,
        school=school
    )
    
    if request.method == "GET":
        # Check if this is an AJAX request for modal
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            html = render(request, 'quiz/grading/partials/grade_response_form.html', {
                'response': response,
                'question': response.question,
                'attempt': response.attempt,
            }).content.decode('utf-8')
            return JsonResponse({'html': html})
        
        # Regular page request
        return redirect("quiz_app:quiz_attempt_grading", attempt_id=response.attempt.id)
    
    # POST - Save grade
    try:
        import json
        data = json.loads(request.body) if request.body else {}
        
        marks_awarded = data.get('marks_awarded', '')
        grading_notes = data.get('grading_notes', '')
        
        # Validate marks
        try:
            marks_awarded = float(marks_awarded)
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid marks value. Please enter a valid number.'
            }, status=400)
        
        # Validate marks are within question's max marks
        max_marks = response.question.marks
        if marks_awarded < 0:
            return JsonResponse({
                'success': False,
                'error': 'Marks cannot be negative.'
            }, status=400)
        
        if marks_awarded > max_marks:
            return JsonResponse({
                'success': False,
                'error': f'Marks cannot exceed the maximum marks for this question ({max_marks}).'
            }, status=400)
        
        with transaction.atomic():
            # Update response
            response.marks_awarded = marks_awarded
            response.grading_notes = grading_notes
            response.is_graded = True
            response.graded_by = request.user
            response.graded_at = timezone.now()
            
            # Determine if response is correct based on marks
            # For essay questions, consider it correct if marks > 0
            if response.question.question_type == 'essay':
                response.is_correct = marks_awarded > 0
            else:
                # For other types, check correctness normally
                response.check_correctness()
            
            response.save()
            
            # Recalculate attempt score
            response.attempt.calculate_score()
            
            # Check if all essay questions are now graded
            essay_responses = response.attempt.responses.filter(
                question__question_type='essay'
            )
            all_graded = all(r.is_graded for r in essay_responses)
            
            if all_graded and essay_responses.exists():
                response.attempt.is_graded = True
                response.attempt.needs_grading = False
                response.attempt.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Response graded successfully.',
            'marks_awarded': marks_awarded,
            'all_graded': all_graded,
        })
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error grading response: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': f'Error grading response: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def quiz_attempt_bulk_grade_view(request, attempt_id):
    """
    Bulk grade multiple responses in an attempt.
    """
    if request.user.role not in ["teacher", "admin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if not request.user.teacher_profile:
        return JsonResponse({'error': 'Teacher profile not found'}, status=404)
    
    teacher = request.user.teacher_profile
    school = request.user.school
    
    attempt = get_object_or_404(
        QuizAttempt,
        pk=attempt_id,
        quiz__teacher=teacher,
        school=school,
        is_submitted=True
    )
    
    try:
        import json
        data = json.loads(request.body)
        grades = data.get('grades', [])  # List of {response_id, marks_awarded, grading_notes}
        
        if not grades:
            return JsonResponse({
                'success': False,
                'error': 'No grades provided.'
            }, status=400)
        
        graded_count = 0
        errors = []
        
        with transaction.atomic():
            for grade_data in grades:
                response_id = grade_data.get('response_id')
                marks_awarded = grade_data.get('marks_awarded', 0)
                grading_notes = grade_data.get('grading_notes', '')
                
                try:
                    response = QuizResponse.objects.get(
                        pk=response_id,
                        attempt=attempt,
                        school=school
                    )
                    
                    # Validate marks
                    marks_awarded = float(marks_awarded)
                    max_marks = response.question.marks
                    
                    if marks_awarded < 0 or marks_awarded > max_marks:
                        errors.append(f"Response {response_id}: Invalid marks (0-{max_marks})")
                        continue
                    
                    # Update response
                    response.marks_awarded = marks_awarded
                    response.grading_notes = grading_notes
                    response.is_graded = True
                    response.graded_by = request.user
                    response.graded_at = timezone.now()
                    
                    if response.question.question_type == 'essay':
                        response.is_correct = marks_awarded > 0
                    else:
                        response.check_correctness()
                    
                    response.save()
                    graded_count += 1
                    
                except QuizResponse.DoesNotExist:
                    errors.append(f"Response {response_id}: Not found")
                except (ValueError, TypeError):
                    errors.append(f"Response {response_id}: Invalid marks value")
                except Exception as e:
                    errors.append(f"Response {response_id}: {str(e)}")
            
            # Recalculate attempt score
            attempt.calculate_score()
            
            # Check if all essay questions are graded
            essay_responses = attempt.responses.filter(
                question__question_type='essay'
            )
            all_graded = all(r.is_graded for r in essay_responses) if essay_responses.exists() else True
            
            if all_graded and essay_responses.exists():
                attempt.is_graded = True
                attempt.needs_grading = False
                attempt.save()
        
        if errors:
            return JsonResponse({
                'success': True,
                'message': f'{graded_count} response(s) graded successfully. {len(errors)} error(s) occurred.',
                'graded_count': graded_count,
                'errors': errors,
                'all_graded': all_graded,
            })
        
        return JsonResponse({
            'success': True,
            'message': f'{graded_count} response(s) graded successfully.',
            'graded_count': graded_count,
            'all_graded': all_graded,
        })
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error bulk grading: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': f'Error bulk grading: {str(e)}'
        }, status=500)

