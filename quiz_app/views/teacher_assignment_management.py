"""
Teacher Subject Assignment management views for admin users.

This module provides views for managing teacher subject assignments including:
- Listing assignments
- Creating single assignments
- Creating bulk assignments (multiple subjects to a teacher)
- Editing assignments
- Deleting assignments
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    TeacherSubjectAssignment,
    Teacher,
    Subject,
    Class,
    AcademicYear,
    SchoolInformation,
    ClassSubject,
)


@login_required
@require_http_methods(["GET"])
def assignment_list_view(request):
    """
    Display list of all teacher subject assignments with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    assignments = TeacherSubjectAssignment.objects.all()
    
    if school:
        assignments = assignments.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        assignments = assignments.filter(
            Q(teacher__full_name__icontains=search_query) |
            Q(subject__subject_name__icontains=search_query) |
            Q(class_assigned__name__icontains=search_query)
        )
    
    # Filter by teacher
    teacher_filter = request.GET.get('teacher', '')
    if teacher_filter:
        assignments = assignments.filter(teacher_id=teacher_filter)
    
    # Filter by subject
    subject_filter = request.GET.get('subject', '')
    if subject_filter:
        assignments = assignments.filter(subject_id=subject_filter)
    
    # Filter by class
    class_filter = request.GET.get('class', '')
    if class_filter:
        assignments = assignments.filter(class_assigned_id=class_filter)
    
    # Filter by academic year
    academic_year_filter = request.GET.get('academic_year', '')
    if academic_year_filter:
        assignments = assignments.filter(academic_year_id=academic_year_filter)
    
    # Filter by active status
    active_filter = request.GET.get('is_active', '')
    if active_filter == 'true':
        assignments = assignments.filter(is_active=True)
    elif active_filter == 'false':
        assignments = assignments.filter(is_active=False)
    
    # Order by date assigned (newest first)
    assignments = assignments.order_by('-date_assigned', 'teacher__full_name')
    
    # Get filter options
    teachers = Teacher.objects.all()
    subjects = Subject.objects.all()
    classes = Class.objects.all()
    academic_years = AcademicYear.objects.all()
    
    if school:
        teachers = teachers.filter(school=school)
        subjects = subjects.filter(school=school)
        classes = classes.filter(school=school)
        academic_years = academic_years.filter(school=school)
    
    teachers = teachers.order_by('full_name')
    subjects = subjects.order_by('subject_name')
    classes = classes.order_by('name')
    academic_years = academic_years.order_by('-start_date')
    
    context = {
        'assignments': assignments,
        'teachers': teachers,
        'subjects': subjects,
        'classes': classes,
        'academic_years': academic_years,
        'search_query': search_query,
        'teacher_filter': teacher_filter,
        'subject_filter': subject_filter,
        'class_filter': class_filter,
        'academic_year_filter': academic_year_filter,
        'active_filter': active_filter,
    }
    
    return render(request, 'teacher_assignment/assignment_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def assignment_create_view(request):
    """
    Create a single teacher subject assignment.
    
    GET: Returns form in modal
    POST: Creates assignment and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:assignment_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get options for dropdowns
        teachers = Teacher.objects.all()
        classes = Class.objects.all()
        academic_years = AcademicYear.objects.all()
        
        if school:
            teachers = teachers.filter(school=school)
            classes = classes.filter(school=school)
            academic_years = academic_years.filter(school=school)
        
        teachers = teachers.order_by('full_name')
        classes = classes.order_by('name')
        academic_years = academic_years.order_by('-start_date')
        
        # For new assignments, don't show subjects initially (will be loaded via AJAX based on class selection)
        subjects = Subject.objects.none()
        
        # Return form for modal
        html = render(request, 'teacher_assignment/partials/assignment_form.html', {
            'assignment': None,
            'teachers': teachers,
            'subjects': subjects,
            'classes': classes,
            'academic_years': academic_years,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create assignment
    try:
        with transaction.atomic():
            # Get form data
            teacher_id = request.POST.get('teacher', '')
            subject_id = request.POST.get('subject', '')
            class_id = request.POST.get('class_assigned', '')
            academic_year_id = request.POST.get('academic_year', '')
            
            # Validation
            if not all([teacher_id, subject_id, class_id, academic_year_id]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Get related objects
            try:
                teacher = Teacher.objects.get(pk=teacher_id, school=school)
                subject = Subject.objects.get(pk=subject_id, school=school)
                class_obj = Class.objects.get(pk=class_id, school=school)
                academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
            except (Teacher.DoesNotExist, Subject.DoesNotExist, Class.DoesNotExist, AcademicYear.DoesNotExist) as e:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to your school.'
                }, status=400)
            
            # Validate that subject is assigned to class via ClassSubject
            class_subject = ClassSubject.objects.filter(
                subject=subject,
                class_name=class_obj,
                academic_year=academic_year,
                school=school
            ).first()
            
            if not class_subject:
                return JsonResponse({
                    'success': False,
                    'error': f'The subject "{subject.subject_name}" is not assigned to class "{class_obj.name}" for academic year "{academic_year.name}". Please assign the subject to the class first.'
                }, status=400)
            
            # Create assignment
            assignment = TeacherSubjectAssignment(
                teacher=teacher,
                subject=subject,
                class_assigned=class_obj,
                academic_year=academic_year,
                assigned_by=request.user,
                school=school,
            )
            
            # Validate
            assignment.full_clean()
            assignment.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Assignment created successfully.',
                'assignment_id': assignment.id,
            })
    
    except ValidationError as e:
        error_messages = []
        if hasattr(e, 'message_dict'):
            for field, messages_list in e.message_dict.items():
                error_messages.extend(messages_list)
        else:
            error_messages.append(str(e))
        
        return JsonResponse({
            'success': False,
            'error': ' '.join(error_messages)
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating assignment: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def assignment_bulk_create_view(request):
    """
    Create multiple teacher subject assignments in bulk.
    
    GET: Returns bulk assignment form modal
    POST: Creates multiple assignments and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:assignment_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get options for dropdowns
        teachers = Teacher.objects.all()
        classes = Class.objects.all()
        academic_years = AcademicYear.objects.all()
        
        if school:
            teachers = teachers.filter(school=school)
            classes = classes.filter(school=school)
            academic_years = academic_years.filter(school=school)
        
        teachers = teachers.order_by('full_name')
        classes = classes.order_by('name')
        academic_years = academic_years.order_by('-start_date')
        
        # For bulk assignment, subjects will be loaded dynamically based on selected classes
        subjects = Subject.objects.none()
        
        # Return form for modal
        html = render(request, 'teacher_assignment/partials/bulk_assignment_form.html', {
            'teachers': teachers,
            'subjects': subjects,
            'classes': classes,
            'academic_years': academic_years,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create bulk assignments
    try:
        import json
        data = json.loads(request.body)
        
        teacher_id = data.get('teacher_id')
        subject_ids = data.get('subject_ids', [])
        class_ids = data.get('class_ids', [])
        academic_year_id = data.get('academic_year_id')
        
        # Validation
        if not all([teacher_id, subject_ids, class_ids, academic_year_id]):
            return JsonResponse({
                'success': False,
                'error': 'Please fill in all required fields.'
            }, status=400)
        
        if not isinstance(subject_ids, list) or len(subject_ids) == 0:
            return JsonResponse({
                'success': False,
                'error': 'Please select at least one subject.'
            }, status=400)
        
        if not isinstance(class_ids, list) or len(class_ids) == 0:
            return JsonResponse({
                'success': False,
                'error': 'Please select at least one class.'
            }, status=400)
        
        # Get teacher and academic year
        try:
            teacher = Teacher.objects.get(pk=teacher_id, school=school)
            academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
        except (Teacher.DoesNotExist, AcademicYear.DoesNotExist):
            return JsonResponse({
                'success': False,
                'error': 'Invalid teacher or academic year selected.'
            }, status=400)
        
        # Get subjects and classes
        subjects = Subject.objects.filter(pk__in=subject_ids, school=school)
        classes = Class.objects.filter(pk__in=class_ids, school=school)
        
        if subjects.count() != len(subject_ids):
            return JsonResponse({
                'success': False,
                'error': 'One or more selected subjects are invalid.'
            }, status=400)
        
        if classes.count() != len(class_ids):
            return JsonResponse({
                'success': False,
                'error': 'One or more selected classes are invalid.'
            }, status=400)
        
        # Create assignments
        created = 0
        skipped = 0
        errors = []
        
        with transaction.atomic():
            for subject in subjects:
                for class_obj in classes:
                    try:
                        # Validate that subject is assigned to class via ClassSubject
                        class_subject = ClassSubject.objects.filter(
                            subject=subject,
                            class_name=class_obj,
                            academic_year=academic_year,
                            school=school
                        ).first()
                        
                        if not class_subject:
                            errors.append(f'{subject.subject_name} - {class_obj.name}: Subject is not assigned to this class for the selected academic year.')
                            continue
                        
                        # Check if assignment already exists
                        existing = TeacherSubjectAssignment.objects.filter(
                            teacher=teacher,
                            subject=subject,
                            class_assigned=class_obj,
                            academic_year=academic_year,
                            is_active=True,
                            school=school
                        ).first()
                        
                        if existing:
                            skipped += 1
                            continue
                        
                        # Create assignment
                        assignment = TeacherSubjectAssignment(
                            teacher=teacher,
                            subject=subject,
                            class_assigned=class_obj,
                            academic_year=academic_year,
                            assigned_by=request.user,
                            school=school,
                        )
                        assignment.full_clean()
                        assignment.save()
                        created += 1
                    
                    except ValidationError as e:
                        errors.append(f'{subject.subject_name} - {class_obj.name}: {str(e)}')
                    except Exception as e:
                        errors.append(f'{subject.subject_name} - {class_obj.name}: {str(e)}')
        
        # Prepare response
        response_data = {
            'success': True,
            'created': created,
            'skipped': skipped,
            'errors': errors,
        }
        
        if created > 0:
            response_data['message'] = f'Successfully created {created} assignment(s).'
        else:
            response_data['message'] = 'No new assignments were created.'
        
        if skipped > 0:
            response_data['message'] += f' {skipped} assignment(s) already exist and were skipped.'
        
        if errors:
            response_data['error_count'] = len(errors)
            response_data['error_summary'] = f'{len(errors)} error(s) occurred.'
        
        return JsonResponse(response_data)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating assignments: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def assignment_edit_view(request, assignment_id):
    """
    Edit an existing teacher subject assignment.
    
    GET: Returns form in modal
    POST: Updates assignment and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:assignment_list")
    
    school = request.user.school
    
    # Superadmin can access any assignment, regular admin only their school
    if request.user.role == "superadmin":
        assignment = get_object_or_404(TeacherSubjectAssignment, pk=assignment_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:assignment_list")
        assignment = get_object_or_404(TeacherSubjectAssignment, pk=assignment_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and assignment.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'Assignment not found'}, status=404)
        messages.error(request, "You don't have permission to edit this assignment.")
        return redirect("quiz_app:assignment_list")
    
    if request.method == "GET":
        # Get options for dropdowns
        teachers = Teacher.objects.all()
        classes = Class.objects.all()
        academic_years = AcademicYear.objects.all()
        
        if school:
            teachers = teachers.filter(school=school)
            classes = classes.filter(school=school)
            academic_years = academic_years.filter(school=school)
        
        teachers = teachers.order_by('full_name')
        classes = classes.order_by('name')
        academic_years = academic_years.order_by('-start_date')
        
        # Get subjects assigned to the assignment's class for the academic year
        subjects = Subject.objects.none()
        if assignment.class_assigned and assignment.academic_year:
            class_subjects = ClassSubject.objects.filter(
                class_name=assignment.class_assigned,
                academic_year=assignment.academic_year,
                school=school
            ).select_related('subject')
            subjects = Subject.objects.filter(
                pk__in=class_subjects.values_list('subject_id', flat=True)
            ).order_by('subject_name')
        
        # Return form for modal
        html = render(request, 'teacher_assignment/partials/assignment_form.html', {
            'assignment': assignment,
            'teachers': teachers,
            'subjects': subjects,
            'classes': classes,
            'academic_years': academic_years,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update assignment
    try:
        with transaction.atomic():
            # Get form data
            teacher_id = request.POST.get('teacher', '')
            subject_id = request.POST.get('subject', '')
            class_id = request.POST.get('class_assigned', '')
            academic_year_id = request.POST.get('academic_year', '')
            is_active = request.POST.get('is_active', '') == 'on'
            
            # Get related objects
            try:
                assignment.teacher = Teacher.objects.get(pk=teacher_id, school=school)
                subject = Subject.objects.get(pk=subject_id, school=school)
                class_obj = Class.objects.get(pk=class_id, school=school)
                academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
            except (Teacher.DoesNotExist, Subject.DoesNotExist, Class.DoesNotExist, AcademicYear.DoesNotExist):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to your school.'
                }, status=400)
            
            # Validate that subject is assigned to class via ClassSubject
            class_subject = ClassSubject.objects.filter(
                subject=subject,
                class_name=class_obj,
                academic_year=academic_year,
                school=school
            ).first()
            
            if not class_subject:
                return JsonResponse({
                    'success': False,
                    'error': f'The subject "{subject.subject_name}" is not assigned to class "{class_obj.name}" for academic year "{academic_year.name}". Please assign the subject to the class first.'
                }, status=400)
            
            assignment.subject = subject
            assignment.class_assigned = class_obj
            assignment.academic_year = academic_year
            assignment.is_active = is_active
            
            # Validate
            assignment.full_clean()
            assignment.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Assignment updated successfully.',
                'assignment_id': assignment.id,
            })
    
    except ValidationError as e:
        error_messages = []
        if hasattr(e, 'message_dict'):
            for field, messages_list in e.message_dict.items():
                error_messages.extend(messages_list)
        else:
            error_messages.append(str(e))
        
        return JsonResponse({
            'success': False,
            'error': ' '.join(error_messages)
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating assignment: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def get_class_subjects_view(request):
    """
    Get subjects assigned to a class for a specific academic year (AJAX endpoint).
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    class_id = request.GET.get('class_id')
    academic_year_id = request.GET.get('academic_year_id')
    
    if not class_id or not academic_year_id:
        return JsonResponse({
            'success': False,
            'error': 'Class ID and Academic Year ID are required.'
        }, status=400)
    
    try:
        class_obj = Class.objects.get(pk=class_id, school=school)
        academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
    except (Class.DoesNotExist, AcademicYear.DoesNotExist):
        return JsonResponse({
            'success': False,
            'error': 'Invalid class or academic year.'
        }, status=400)
    
    # Get subjects assigned to this class for the academic year
    class_subjects = ClassSubject.objects.filter(
        class_name=class_obj,
        academic_year=academic_year,
        school=school
    ).select_related('subject').order_by('subject__subject_name')
    
    subjects = [
        {
            'id': cs.subject.id,
            'name': cs.subject.subject_name,
            'code': cs.subject.subject_code
        }
        for cs in class_subjects
    ]
    
    return JsonResponse({
        'success': True,
        'subjects': subjects
    })


@login_required
@require_http_methods(["POST"])
def assignment_delete_view(request, assignment_id):
    """
    Delete a teacher subject assignment.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any assignment, regular admin only their school
    if request.user.role == "superadmin":
        assignment = get_object_or_404(TeacherSubjectAssignment, pk=assignment_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:assignment_list")
        assignment = get_object_or_404(TeacherSubjectAssignment, pk=assignment_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and assignment.school != school:
        return JsonResponse({'error': 'Assignment not found'}, status=404)
    
    try:
        assignment_info = f"{assignment.teacher.full_name} - {assignment.subject.subject_name}"
        assignment.delete()
        return JsonResponse({
            'success': True,
            'message': f'Assignment {assignment_info} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting assignment: {str(e)}'
        }, status=500)

