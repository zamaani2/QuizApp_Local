"""
Student quiz management views.

This module provides views for students to:
- View available quizzes
- Start and take quizzes
- View quiz results
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Count, Max, Avg, Prefetch
from django.db import transaction
from django.utils import timezone
from datetime import datetime

from ..models import (
    Quiz,
    QuizAttempt,
    QuizResponse,
    Question,
    AnswerChoice,
    Student,
    Class,
    Subject,
    AcademicYear,
    Term,
    SchoolInformation,
    StudentClass,
)


@login_required
@require_http_methods(["GET"])
def student_quiz_list_view(request):
    """
    Display list of available quizzes for the logged-in student.
    Shows quizzes assigned to the student's current class.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get student's current class
    current_class = student.get_current_class()
    if not current_class:
        messages.warning(request, "You are not assigned to any class. Please contact your administrator.")
        return render(request, 'quiz/student/quiz_list.html', {
            'quizzes': [],
            'subjects': [],
            'academic_years': [],
            'terms': [],
            'current_class': None,
        })
    
    # Get quizzes assigned to student's class
    quizzes = Quiz.objects.filter(
        classes=current_class,
        classes__school=school,
        school=school,
        status='published',
        is_active=True
    ).select_related('subject', 'teacher', 'academic_year', 'term', 'category').distinct()
    
    # Filter by subject
    subject_filter = request.GET.get('subject', '')
    if subject_filter:
        quizzes = quizzes.filter(subject_id=subject_filter)
    
    # Filter by academic year
    academic_year_filter = request.GET.get('academic_year', '')
    if academic_year_filter:
        quizzes = quizzes.filter(academic_year_id=academic_year_filter)
    
    # Filter by term
    term_filter = request.GET.get('term', '')
    if term_filter:
        quizzes = quizzes.filter(term_id=term_filter)
    
    # Filter by status (available, completed, expired, in_progress)
    status_filter = request.GET.get('status', '')
    now = timezone.now()
    
    # Note: Status filtering will be done after annotation to avoid queryset issues
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        quizzes = quizzes.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(subject__subject_name__icontains=search_query) |
            Q(teacher__full_name__icontains=search_query)
        )
    
    # Annotate with attempt information
    quizzes = quizzes.annotate(
        attempt_count=Count('attempts', filter=Q(attempts__student=student)),
        best_score=Max('attempts__score', filter=Q(attempts__student=student)),
        best_percentage=Max('attempts__percentage', filter=Q(attempts__student=student))
    )
    
    # Get filter options
    subjects = Subject.objects.filter(
        id__in=quizzes.values_list('subject_id', flat=True).distinct(),
        school=school
    ).order_by('subject_name')
    
    academic_years = AcademicYear.objects.filter(
        id__in=quizzes.values_list('academic_year_id', flat=True).distinct(),
        school=school
    ).order_by('-start_date')
    
    terms = Term.objects.filter(
        id__in=quizzes.values_list('term_id', flat=True).distinct(),
        school=school
    ).order_by('start_date')
    
    # Determine status for each quiz and apply status filter
    quiz_list = []
    now = timezone.now()
    
    for quiz in quizzes:
        attempts_count = quiz.attempt_count
        can_attempt, attempt_message = quiz.can_student_attempt(student)
        
        # Determine status
        if attempts_count >= quiz.max_attempts:
            status = 'completed'
        elif not can_attempt:
            if quiz.available_until and quiz.available_until < now:
                status = 'expired'
            elif quiz.available_from and quiz.available_from > now:
                status = 'upcoming'
            else:
                status = 'unavailable'
        else:
            # Check if there's an in-progress attempt
            in_progress = QuizAttempt.objects.filter(
                student=student,
                quiz=quiz,
                is_submitted=False,
                is_completed=False
            ).exists()
            if in_progress:
                status = 'in_progress'
            else:
                status = 'available'
        
        # Apply status filter if specified
        if status_filter and status != status_filter:
            continue
        
        quiz_list.append({
            'quiz': quiz,
            'status': status,
            'attempts_count': attempts_count,
            'best_score': quiz.best_score or 0,
            'best_percentage': quiz.best_percentage or 0,
            'can_attempt': can_attempt,
            'attempt_message': attempt_message,
        })
    
    context = {
        'quizzes': quiz_list,
        'subjects': subjects,
        'academic_years': academic_years,
        'terms': terms,
        'current_class': current_class,
        'subject_filter': subject_filter,
        'academic_year_filter': academic_year_filter,
        'term_filter': term_filter,
        'status_filter': status_filter,
        'search_query': search_query,
    }
    
    return render(request, 'quiz/student/quiz_list.html', context)


@login_required
@require_http_methods(["GET"])
def student_quiz_detail_view(request, quiz_id):
    """
    Display detailed information about a quiz before starting.
    Shows quiz details, student's attempt history, and action buttons.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get quiz
    quiz = get_object_or_404(Quiz, id=quiz_id, school=school, status='published', is_active=True)
    
    # Check if student is in assigned class
    current_class = student.get_current_class()
    if not current_class:
        messages.error(request, "You are not assigned to any class.")
        return redirect("quiz_app:student_quiz_list")
    
    if not quiz.classes.filter(pk=current_class.pk, school=school).exists():
        messages.error(request, "This quiz is not assigned to your class.")
        return redirect("quiz_app:student_quiz_list")
    
    # Get student's attempts for this quiz
    attempts = QuizAttempt.objects.filter(
        quiz=quiz,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
    ).order_by('-started_at')
    
    # Calculate statistics
    attempts_count = attempts.count()
    submitted_attempts = attempts.filter(is_submitted=True)
    completed_attempts = submitted_attempts.filter(is_completed=True)
    
    # Get best attempt
    best_attempt = completed_attempts.order_by('-score', '-percentage').first()
    best_score = best_attempt.score if best_attempt else 0
    best_percentage = best_attempt.percentage if best_attempt else 0
    
    # Check for in-progress attempt
    in_progress_attempt = attempts.filter(is_submitted=False, is_completed=False).first()
    
    # Calculate remaining attempts
    remaining_attempts = max(0, quiz.max_attempts - attempts_count)
    
    # Check if student can attempt
    can_attempt, attempt_message = quiz.can_student_attempt(student)
    
    # Get availability status
    now = timezone.now()
    is_available_now = True
    availability_message = ""
    
    if quiz.available_from and quiz.available_from > now:
        is_available_now = False
        availability_message = f"Quiz will be available from {quiz.available_from.strftime('%B %d, %Y at %I:%M %p')}"
    elif quiz.available_until and quiz.available_until < now:
        is_available_now = False
        availability_message = f"Quiz expired on {quiz.available_until.strftime('%B %d, %Y at %I:%M %p')}"
    
    context = {
        'quiz': quiz,
        'student': student,
        'current_class': current_class,
        'attempts': attempts,
        'attempts_count': attempts_count,
        'submitted_attempts': submitted_attempts,
        'completed_attempts': completed_attempts,
        'best_attempt': best_attempt,
        'best_score': best_score,
        'best_percentage': best_percentage,
        'remaining_attempts': remaining_attempts,
        'can_attempt': can_attempt,
        'attempt_message': attempt_message,
        'in_progress_attempt': in_progress_attempt,
        'is_available_now': is_available_now,
        'availability_message': availability_message,
    }
    
    return render(request, 'quiz/student/quiz_detail.html', context)


def get_client_ip(request):
    """Get the client's IP address from the request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip.strip()


def _submit_attempt_safely(attempt_id, student, school):
    with transaction.atomic():
        attempt = QuizAttempt.objects.select_for_update().select_related(
            "quiz"
        ).get(
            pk=attempt_id,
            student=student,
            school=school,
            quiz__school=school,
            student__school=school,
        )
        if not attempt.is_submitted:
            attempt.submit()
    return attempt


@login_required
@require_http_methods(["GET", "POST"])
def student_quiz_start_view(request, quiz_id):
    """
    Start a quiz attempt for the student.
    Validates availability, handles password verification, and creates QuizAttempt.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get quiz
    quiz = get_object_or_404(Quiz, id=quiz_id, school=school, status='published', is_active=True)
    
    # Check if student is in assigned class
    current_class = student.get_current_class()
    if not current_class:
        messages.error(request, "You are not assigned to any class.")
        return redirect("quiz_app:student_quiz_list")
    
    if not quiz.classes.filter(pk=current_class.pk, school=school).exists():
        messages.error(request, "This quiz is not assigned to your class.")
        return redirect("quiz_app:student_quiz_list")
    
    # Check if student can attempt
    can_attempt, attempt_message = quiz.can_student_attempt(student)
    if not can_attempt:
        messages.error(request, attempt_message)
        return redirect("quiz_app:student_quiz_detail", quiz_id=quiz_id)
    
    # Check availability dates
    now = timezone.now()
    if quiz.available_from and quiz.available_from > now:
        messages.error(request, f"Quiz will be available from {quiz.available_from.strftime('%B %d, %Y at %I:%M %p')}")
        return redirect("quiz_app:student_quiz_detail", quiz_id=quiz_id)
    
    if quiz.available_until and quiz.available_until < now:
        messages.error(request, f"Quiz expired on {quiz.available_until.strftime('%B %d, %Y at %I:%M %p')}")
        return redirect("quiz_app:student_quiz_detail", quiz_id=quiz_id)
    
    # Handle password verification if required
    if quiz.require_password:
        if request.method == "GET":
            # Show password form
            return render(request, 'quiz/student/quiz_password_form.html', {
                'quiz': quiz,
            })
        
        # POST: Verify password
        password = request.POST.get('password', '').strip()
        if not password:
            messages.error(request, "Please enter the quiz password.")
            return render(request, 'quiz/student/quiz_password_form.html', {
                'quiz': quiz,
            })
        
        if not quiz.verify_password(password):
            messages.error(request, "Incorrect password. Please try again.")
            return render(request, 'quiz/student/quiz_password_form.html', {
                'quiz': quiz,
            })
    
    try:
        with transaction.atomic():
            student = Student.objects.select_for_update().get(
                pk=student.pk, school_id=school.pk
            )
            quiz = Quiz.objects.select_for_update().get(
                pk=quiz.pk,
                school_id=school.pk,
                status="published",
                is_active=True,
            )
            current_class = student.get_current_class()
            if not current_class or not quiz.classes.filter(
                pk=current_class.pk, school_id=school.pk
            ).exists():
                messages.error(request, "This quiz is no longer assigned to your class.")
                return redirect("quiz_app:student_quiz_list")

            existing_attempt = QuizAttempt.objects.filter(
                quiz=quiz,
                student=student,
                school=school,
                is_submitted=False,
                is_completed=False,
            ).order_by("started_at").first()
            if existing_attempt:
                existing_attempt.capture_configuration() if not existing_attempt.configuration_snapshot else None
                messages.info(request, "Resuming your previous attempt.")
                return redirect(
                    "quiz_app:student_quiz_take", attempt_id=existing_attempt.id
                )

            can_attempt, attempt_message = quiz.can_student_attempt(student)
            now = timezone.now()
            if (
                not can_attempt
                or (quiz.available_from and quiz.available_from > now)
                or (quiz.available_until and quiz.available_until < now)
            ):
                messages.error(request, attempt_message or "This quiz is not available.")
                return redirect("quiz_app:student_quiz_detail", quiz_id=quiz.pk)

            max_attempt = QuizAttempt.objects.filter(
                quiz=quiz,
                student=student,
                school=school,
            ).aggregate(max_attempt=Max('attempt_number'))['max_attempt']
            attempt_number = (max_attempt + 1) if max_attempt else 1
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            attempt = QuizAttempt.objects.create(
                quiz=quiz,
                student=student,
                school=school,
                attempt_number=attempt_number,
                academic_year=quiz.academic_year,
                term=quiz.term,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            attempt.capture_configuration()
            messages.success(request, "Quiz started successfully. Good luck!")
            return redirect("quiz_app:student_quiz_take", attempt_id=attempt.id)
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating quiz attempt: {str(e)}", exc_info=True)
        messages.error(request, f"An error occurred while starting the quiz: {str(e)}")
        return redirect("quiz_app:student_quiz_detail", quiz_id=quiz_id)


@login_required
@require_http_methods(["GET"])
def student_quiz_resume_view(request, quiz_id):
    """
    Resume an in-progress quiz attempt.
    Finds the existing in-progress attempt and redirects to the quiz-taking interface.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get quiz
    quiz = get_object_or_404(Quiz, id=quiz_id, school=school, status='published', is_active=True)
    
    # Check if student is in assigned class
    current_class = student.get_current_class()
    if not current_class:
        messages.error(request, "You are not assigned to any class.")
        return redirect("quiz_app:student_quiz_list")
    
    if not quiz.classes.filter(pk=current_class.pk, school=school).exists():
        messages.error(request, "This quiz is not assigned to your class.")
        return redirect("quiz_app:student_quiz_list")
    
    # Find in-progress attempt
    in_progress_attempt = QuizAttempt.objects.filter(
        quiz=quiz,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
        is_submitted=False,
        is_completed=False
    ).order_by('-started_at').first()
    
    if not in_progress_attempt:
        messages.warning(request, "No in-progress attempt found. You can start a new attempt.")
        return redirect("quiz_app:student_quiz_detail", quiz_id=quiz_id)
    
    # Check if time limit has expired - auto-submit if expired
    if in_progress_attempt.is_time_expired():
        _submit_attempt_safely(in_progress_attempt.pk, student, school)
        messages.warning(request, "Time limit expired. Your quiz has been automatically submitted.")
        return redirect("quiz_app:student_quiz_result_detail", attempt_id=in_progress_attempt.id)
    
    messages.info(request, "Resuming your previous attempt.")
    return redirect("quiz_app:student_quiz_take", attempt_id=in_progress_attempt.id)


@login_required
@require_http_methods(["GET"])
def student_quiz_take_view(request, attempt_id):
    """
    Display the quiz-taking interface for a specific attempt.
    Shows questions, timer, progress, and navigation.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get attempt
    attempt = get_object_or_404(
        QuizAttempt,
        id=attempt_id,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
    )
    
    # Check if attempt is already submitted
    if attempt.is_submitted:
        messages.info(request, "This quiz has already been submitted.")
        return redirect("quiz_app:student_quiz_result_detail", attempt_id=attempt_id)
    
    quiz = attempt.quiz
    
    # Check if time limit has expired and auto-submit if not already submitted
    if not attempt.is_submitted:
        if attempt.is_time_expired():
            _submit_attempt_safely(attempt.pk, student, school)
            
            messages.warning(request, "Time limit expired. Your quiz has been automatically submitted.")
            return redirect("quiz_app:student_quiz_result_detail", attempt_id=attempt_id)
    
    # Get questions ordered by order field
    questions = list(quiz.questions.filter(
        school=school,
    ).prefetch_related(
        Prefetch(
            'answer_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        )
    ).order_by('order', 'created_at', 'pk'))
    if not attempt.configuration_snapshot:
        with transaction.atomic():
            attempt = QuizAttempt.objects.select_for_update().get(pk=attempt.pk)
            if not attempt.configuration_snapshot:
                attempt.capture_configuration()
    question_positions = {
        question_id: position
        for position, question_id in enumerate(attempt.question_order, start=1)
    }
    questions.sort(
        key=lambda question: (
            question_positions.get(question.pk, len(question_positions)),
            question.pk,
        )
    )
    answer_order = attempt.answer_order or {}
    for position, question in enumerate(questions, start=1):
        question.display_order = position
        question_snapshot = attempt.configuration_snapshot.get(
            "questions", {}
        ).get(str(question.pk), {})
        question.question_text = question_snapshot.get(
            "question_text", question.question_text
        )
        question.marks = question_snapshot.get("marks", question.marks)
        question.question_type = question_snapshot.get(
            "question_type", question.question_type
        )
        choices = list(question.answer_choices.all())
        choice_snapshots = question_snapshot.get("choices", {})
        for choice in choices:
            snapshot_choice = choice_snapshots.get(str(choice.pk), {})
            choice.choice_text = snapshot_choice.get("text", choice.choice_text)
        choice_positions = {
            choice_id: choice_position
            for choice_position, choice_id in enumerate(
                answer_order.get(str(question.pk), []), start=1
            )
        }
        if question.question_type == "ordering":
            question.display_ordering_items = answer_order.get(str(question.pk), [])
        question.display_choices = sorted(
            choices,
            key=lambda choice: (
                choice_positions.get(choice.pk, len(choice_positions)),
                choice.order,
                choice.pk,
            ),
        )
    
    # Get existing responses - create a list of question IDs with responses for template
    existing_responses = {}
    existing_response_data = {}
    for response in attempt.responses.filter(
        school=school,
        question__school=school,
        question__quiz_id=attempt.quiz_id,
    ).filter(
        Q(selected_choice__isnull=True) | Q(selected_choice__school=school)
    ).select_related('selected_choice').prefetch_related('selected_choices'):
        response.selected_choice_ids = {
            choice.pk for choice in response.selected_choices.all()
        }
        existing_responses[response.question.id] = response
        existing_response_data[response.question.id] = {
            'text_answer': response.text_answer or '',
            'selected_choice_id': response.selected_choice.id if response.selected_choice else None,
            'selected_choice_ids': list(response.selected_choice_ids),
        }
    
    # Calculate time remaining if time limit exists
    time_remaining = None
    time_remaining_seconds = None
    attempt_time_limit = attempt.configuration_snapshot.get("quiz", {}).get(
        "time_limit", quiz.time_limit
    )
    if attempt_time_limit > 0:
        elapsed = timezone.now() - attempt.started_at
        elapsed_minutes = elapsed.total_seconds() / 60
        time_remaining_minutes = max(0, attempt_time_limit - elapsed_minutes)
        time_remaining_seconds = int(time_remaining_minutes * 60)
        time_remaining = f"{int(time_remaining_minutes)}:{int((time_remaining_minutes % 1) * 60):02d}"
        
        # If time has already expired (shouldn't happen due to check above, but just in case)
        if time_remaining_seconds <= 0:
            _submit_attempt_safely(attempt.pk, student, school)
            messages.warning(request, "Time limit expired. Your quiz has been automatically submitted.")
            return redirect("quiz_app:student_quiz_result_detail", attempt_id=attempt_id)
    
    # Get answered questions count
    answered_count = attempt.responses.filter(
        school=school,
        question__school=school,
        question__quiz_id=attempt.quiz_id,
    ).count()
    total_questions = len(questions)
    
    context = {
        'attempt': attempt,
        'quiz': quiz,
        'questions': questions,
        'existing_responses': existing_responses,
        'existing_response_data': existing_response_data,
        'time_remaining_seconds': time_remaining_seconds,
        'time_remaining': time_remaining,
        'answered_count': answered_count,
        'total_questions': total_questions,
    }
    
    return render(request, 'quiz/student/quiz_take.html', context)


@login_required
@require_http_methods(["POST"])
def student_quiz_save_view(request, attempt_id):
    """
    Save quiz progress (AJAX endpoint).
    Saves individual question responses without submitting.
    """
    if request.user.role != "student":
        return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)
    
    if not request.user.student_profile:
        return JsonResponse({'success': False, 'error': 'Student profile not found'}, status=404)
    
    student = request.user.student_profile
    school = request.user.school
    
    question_id = request.POST.get('question_id')
    if not question_id:
        return JsonResponse({'success': False, 'error': 'Question ID required'}, status=400)

    try:
        with transaction.atomic():
            try:
                attempt = QuizAttempt.objects.select_for_update().select_related(
                    'quiz'
                ).get(
                    id=attempt_id,
                    student=student,
                    school=school,
                    quiz__school=school,
                    student__school=school,
                )
            except QuizAttempt.DoesNotExist:
                return JsonResponse(
                    {'success': False, 'error': 'Attempt not found'}, status=404
                )

            if attempt.is_submitted:
                return JsonResponse(
                    {'success': False, 'error': 'Quiz already submitted'}, status=400
                )

            if attempt.is_time_expired():
                attempt.submit()
                return JsonResponse({
                    'success': False,
                    'error': 'Time limit expired. Quiz has been submitted.',
                    'submitted': True,
                }, status=400)

            try:
                question = attempt.quiz.questions.get(
                    id=question_id, school=school
                )
            except Question.DoesNotExist:
                return JsonResponse(
                    {'success': False, 'error': 'Question not found'}, status=404
                )

            # Get or create response
            response, created = QuizResponse.objects.get_or_create(
                attempt=attempt,
                question=question,
                defaults={'school': school}
            )
            
            # Update response based on question type
            if question.question_type in ['multiple_choice', 'true_false']:
                choice_ids = request.POST.getlist('choice_ids')
                if not choice_ids and request.POST.get('choice_id'):
                    choice_ids = [request.POST.get('choice_id')]
                choices = list(
                    question.answer_choices.filter(
                        id__in=choice_ids, school=school
                    )
                )
                if len({str(choice.pk) for choice in choices}) != len(set(choice_ids)):
                    return JsonResponse(
                        {'success': False, 'error': 'Invalid choice'}, status=400
                    )
                if question.question_type == "true_false" and len(choices) > 1:
                    return JsonResponse(
                        {'success': False, 'error': 'Select only one answer.'},
                        status=400,
                    )
                response.selected_choice = choices[0] if len(choices) == 1 else None
                response.selected_choices.set(choices)
            
            elif question.question_type in ['short_answer', 'fill_blank', 'essay']:
                text_answer = request.POST.get('text_answer', '').strip()
                response.text_answer = text_answer
            elif question.question_type in ['matching', 'ordering']:
                text_answer = request.POST.get('text_answer', '').strip()
                response.text_answer = text_answer
            
            response.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Response saved successfully',
                'answered_count': attempt.responses.count(),
            })
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def student_quiz_submit_view(request, attempt_id):
    """
    Submit a quiz attempt.
    Calculates scores and marks the attempt as completed.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get attempt
    attempt = get_object_or_404(
        QuizAttempt,
        id=attempt_id,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
    )
    
    try:
        already_submitted = attempt.is_submitted
        attempt = _submit_attempt_safely(attempt_id, student, school)
        if already_submitted:
            messages.info(request, "This quiz has already been submitted.")
        elif attempt.is_time_expired():
            messages.warning(request, "Time limit expired. Quiz submitted with current answers.")
        else:
            messages.success(request, "Quiz submitted successfully!")
        return redirect("quiz_app:student_quiz_result_detail", attempt_id=attempt_id)
            
    except Exception as e:
        messages.error(request, f"An error occurred while submitting the quiz: {str(e)}")
        return redirect("quiz_app:student_quiz_take", attempt_id=attempt_id)


@login_required
@require_http_methods(["GET"])
def student_quiz_attempts_view(request):
    """
    Display list of all quiz attempts made by the logged-in student.
    Shows attempts with filtering, search, and statistics.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get all attempts for this student
    attempts = QuizAttempt.objects.filter(
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
    ).select_related('quiz', 'quiz__subject', 'quiz__teacher', 'academic_year', 'term').order_by('-submitted_at', '-started_at')
    
    # Filter by quiz
    quiz_filter = request.GET.get('quiz', '')
    if quiz_filter:
        attempts = attempts.filter(quiz_id=quiz_filter)
    
    # Filter by subject
    subject_filter = request.GET.get('subject', '')
    if subject_filter:
        attempts = attempts.filter(quiz__subject_id=subject_filter)
    
    # Filter by academic year
    academic_year_filter = request.GET.get('academic_year', '')
    if academic_year_filter:
        attempts = attempts.filter(academic_year_id=academic_year_filter)
    
    # Filter by term
    term_filter = request.GET.get('term', '')
    if term_filter:
        attempts = attempts.filter(term_id=term_filter)
    
    # Filter by status
    status_filter = request.GET.get('status', '')
    if status_filter == 'completed':
        attempts = attempts.filter(is_submitted=True, is_completed=True)
    elif status_filter == 'in_progress':
        attempts = attempts.filter(is_submitted=False, is_completed=False)
    elif status_filter == 'grading_pending':
        attempts = attempts.filter(needs_grading=True, is_graded=False)
    elif status_filter == 'graded':
        attempts = attempts.filter(is_graded=True)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        attempts = attempts.filter(
            Q(quiz__title__icontains=search_query) |
            Q(quiz__subject__subject_name__icontains=search_query) |
            Q(quiz__teacher__full_name__icontains=search_query)
        )
    
    # Get filter options
    quizzes = Quiz.objects.filter(
        id__in=attempts.values_list('quiz_id', flat=True).distinct(),
        school=school
    ).order_by('-created_at')
    
    subjects = Subject.objects.filter(
        id__in=attempts.values_list('quiz__subject_id', flat=True).distinct(),
        school=school
    ).order_by('subject_name')
    
    academic_years = AcademicYear.objects.filter(
        id__in=attempts.values_list('academic_year_id', flat=True).distinct(),
        school=school
    ).order_by('-start_date')
    
    terms = Term.objects.filter(
        id__in=attempts.values_list('term_id', flat=True).distinct(),
        school=school
    ).order_by('start_date')
    
    # Calculate statistics
    total_attempts = attempts.count()
    completed_attempts = attempts.filter(is_submitted=True, is_completed=True)
    completed_attempts_count = completed_attempts.count()
    avg_score = completed_attempts.aggregate(avg=Avg('score'))['avg'] or 0
    avg_percentage = completed_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
    best_attempt = completed_attempts.order_by('-score', '-percentage').first()
    best_score = best_attempt.score if best_attempt else 0
    best_percentage = best_attempt.percentage if best_attempt else 0
    
    # Get best attempt per quiz for highlighting
    best_attempt_ids = []
    quiz_ids = attempts.values_list('quiz_id', flat=True).distinct()
    for quiz_id in quiz_ids:
        quiz_attempts = attempts.filter(quiz_id=quiz_id, is_submitted=True, is_completed=True)
        if quiz_attempts.exists():
            best = quiz_attempts.order_by('-score', '-percentage', '-submitted_at').first()
            if best:
                best_attempt_ids.append(best.id)
    
    context = {
        'attempts': attempts,
        'quizzes': quizzes,
        'subjects': subjects,
        'academic_years': academic_years,
        'terms': terms,
        'quiz_filter': quiz_filter,
        'subject_filter': subject_filter,
        'academic_year_filter': academic_year_filter,
        'term_filter': term_filter,
        'status_filter': status_filter,
        'search_query': search_query,
        'total_attempts': total_attempts,
        'completed_attempts_count': completed_attempts_count,
        'avg_score': avg_score,
        'avg_percentage': avg_percentage,
        'best_score': best_score,
        'best_percentage': best_percentage,
        'best_attempt_ids': best_attempt_ids,
    }
    
    return render(request, 'quiz/student/attempts_list.html', context)


@login_required
@require_http_methods(["GET"])
def student_quiz_result_detail_view(request, attempt_id):
    """
    Display detailed results of a specific quiz attempt for the student.
    Shows all questions with student's answers, correct answers, and feedback.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get attempt - ensure it belongs to this student
    attempt = get_object_or_404(
        QuizAttempt,
        pk=attempt_id,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
        is_submitted=True
    )
    
    quiz = attempt.quiz
    
    # Get all responses ordered by question order
    responses = attempt.responses.filter(
        school=school,
        question__school=school,
        question__quiz_id=attempt.quiz_id,
    ).filter(
        Q(selected_choice__isnull=True) | Q(selected_choice__school=school)
    ).select_related(
        'question'
    ).prefetch_related(
        Prefetch(
            'question__answer_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        ),
        'selected_choice',
        Prefetch(
            'selected_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        ),
    ).order_by('question__order')
    
    # Create a dictionary of responses by question ID for easy lookup
    responses_dict = {}
    for response in responses:
        responses_dict[response.question.id] = response
    
    # Get all questions to show unanswered ones
    all_questions = quiz.questions.filter(school=school).prefetch_related(
        Prefetch(
            'answer_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        )
    ).order_by('order')
    answered_question_ids = set(responses.values_list('question_id', flat=True))
    
    context = {
        'attempt': attempt,
        'quiz': quiz,
        'responses': responses,
        'responses_dict': responses_dict,
        'all_questions': all_questions,
        'answered_question_ids': answered_question_ids,
        'can_review': quiz.show_results_immediately and quiz.allow_review,
    }
    
    return render(request, 'quiz/student/result_detail.html', context)


@login_required
@require_http_methods(["GET"])
def student_quiz_result_print_view(request, attempt_id):
    """
    Display print-friendly version of quiz result for the student.
    """
    if request.user.role != "student":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.student_profile:
        messages.error(request, "Student profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    student = request.user.student_profile
    school = request.user.school
    
    # Get attempt - ensure it belongs to this student
    attempt = get_object_or_404(
        QuizAttempt,
        pk=attempt_id,
        student=student,
        school=school,
        quiz__school=school,
        student__school=school,
        is_submitted=True
    )
    
    quiz = attempt.quiz
    
    # Get all responses ordered by question order
    responses = attempt.responses.filter(
        school=school,
        question__school=school,
        question__quiz_id=attempt.quiz_id,
    ).filter(
        Q(selected_choice__isnull=True) | Q(selected_choice__school=school)
    ).select_related(
        'question'
    ).prefetch_related(
        Prefetch(
            'question__answer_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        ),
        'selected_choice',
        Prefetch(
            'selected_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        ),
    ).order_by('question__order')
    
    # Get all questions to show unanswered ones
    all_questions = quiz.questions.filter(school=school).prefetch_related(
        Prefetch(
            'answer_choices',
            queryset=AnswerChoice.objects.filter(school=school),
        )
    ).order_by('order')
    answered_question_ids = set(responses.values_list('question_id', flat=True))
    
    # School information (school is already a SchoolInformation instance)
    school_info = school
    
    # Format data for unified template
    attempts = [{
        'attempt': attempt,
        'quiz': quiz,
        'responses': responses,
        'all_questions': all_questions,
        'answered_question_ids': answered_question_ids,
        'student_view': True,
        'can_review': quiz.show_results_immediately and quiz.allow_review,
        'show_correct_answers': quiz.show_correct_answers,
    }]
    
    context = {
        'attempts': attempts,
        'school_info': school_info,
        'is_bulk': False,
    }
    
    return render(request, 'quiz/results/unified_result_print.html', context)
