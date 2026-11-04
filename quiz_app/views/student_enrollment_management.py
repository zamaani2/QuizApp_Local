"""
Student Class Enrollment Management views for admin users.

This module provides views for managing student class assignments including:
- Listing student class assignments
- Assigning students to classes (single and bulk)
- Editing assignments
- Unassigning/removing students from classes
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import F, Q
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError

from ..models import (
    StudentClass,
    Student,
    Class,
    AcademicYear,
    SchoolInformation,
    User,
)
from ..utils.tenant_utils import get_object_or_404_with_school


def _crosses_academic_year(student, school, target_class):
    latest_enrollment = (
        StudentClass.objects.select_for_update()
        .filter(student=student, school=school)
        .select_related("assigned_class")
        .order_by("-date_assigned", "-pk")
        .first()
    )
    return (
        latest_enrollment is not None
        and latest_enrollment.assigned_class.academic_year_id
        != target_class.academic_year_id
    )


@login_required
@require_http_methods(["GET"])
def student_enrollment_list_view(request):
    """
    Display list of all student class assignments with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    enrollments = StudentClass.objects.filter(
        school__isnull=False,
        student__school_id=F("school_id"),
        assigned_class__school_id=F("school_id"),
        assigned_class__academic_year__school_id=F("school_id"),
    )
    
    if school:
        enrollments = enrollments.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '').strip()
    if search_query:
        enrollments = enrollments.filter(
            Q(student__full_name__icontains=search_query) |
            Q(student__admission_number__icontains=search_query) |
            Q(assigned_class__name__icontains=search_query)
        )
    
    # Filters
    student_filter = request.GET.get('student', '')
    class_filter = request.GET.get('class', '')
    active_filter = request.GET.get('is_active', '')
    
    if student_filter:
        enrollments = enrollments.filter(student_id=student_filter)
    
    if class_filter:
        enrollments = enrollments.filter(assigned_class_id=class_filter)
    
    if active_filter == 'true':
        enrollments = enrollments.filter(is_active=True)
    elif active_filter == 'false':
        enrollments = enrollments.filter(is_active=False)
    
    # Order by date assigned (newest first)
    enrollments = enrollments.select_related('student', 'assigned_class', 'assigned_by').order_by('-date_assigned', 'student__full_name')
    
    # Get filter options
    students = Student.objects.all()
    students = students.filter(is_active=True)
    classes = Class.objects.filter(
        is_active=True,
        academic_year__school_id=F("school_id"),
    )
    
    if school:
        students = students.filter(school=school)
        classes = classes.filter(school=school)
    
    students = students.order_by('full_name')
    classes = classes.order_by('name')
    
    context = {
        'enrollments': enrollments,
        'students': students,
        'classes': classes,
        'search_query': search_query,
        'student_filter': student_filter,
        'class_filter': class_filter,
        'active_filter': active_filter,
        'target_schools': (
            SchoolInformation.objects.filter(is_active=True).order_by("name")
            if request.user.role == "superadmin"
            else SchoolInformation.objects.none()
        ),
    }
    
    return render(request, 'student_enrollment/enrollment_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def student_enrollment_create_view(request):
    """
    Assign a student to a class.
    
    GET: Returns form in modal
    POST: Creates assignment and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:enrollment_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get options for dropdowns
        students = Student.objects.all()
        classes = Class.objects.all()
        
        if school:
            students = students.filter(school=school)
            classes = classes.filter(school=school)
        
        students = students.order_by('full_name')
        classes = classes.order_by('name')
        
        # Return form for modal
        html = render(request, 'student_enrollment/partials/enrollment_form.html', {
            'enrollment': None,
            'students': students,
            'classes': classes,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create enrollment
    try:
        with transaction.atomic():
            # Get form data
            student_id = request.POST.get('student', '')
            class_id = request.POST.get('assigned_class', '')
            
            # Validation
            if not all([student_id, class_id]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Get related objects
            class_queryset = Class.objects.filter(
                pk=class_id,
                is_active=True,
                academic_year__school_id=F("school_id"),
            )
            if request.user.role != "superadmin":
                class_queryset = class_queryset.filter(school=school)
            try:
                class_obj = class_queryset.select_for_update().get()
            except Class.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to your school.'
                }, status=400)
            school = class_obj.school
            if school is None or not school.is_active:
                return JsonResponse({
                    'success': False,
                    'error': 'The selected class has no school association.',
                }, status=400)
            try:
                student = Student.objects.select_for_update().get(
                    pk=student_id,
                    school=school,
                )
            except Student.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to the selected class school.'
                }, status=400)
            if not student.is_active:
                return JsonResponse({
                    'success': False,
                    'error': 'Archived students cannot be assigned to a class.',
                }, status=400)
            
            # Check if student already has an active assignment
            existing_assignment = StudentClass.objects.select_for_update().filter(
                student=student,
                is_active=True,
                school=school,
                assigned_class__school=school,
            ).first()
            
            if existing_assignment:
                if existing_assignment.assigned_class_id == class_obj.pk:
                    return JsonResponse({
                        'success': True,
                        'message': f'Student {student.full_name} is already assigned to class {class_obj.name}.',
                        'enrollment_id': existing_assignment.id,
                    })
            if _crosses_academic_year(student, school, class_obj):
                return JsonResponse({
                    'success': False,
                    'error': (
                        'Cross-year promotion is not available until the school '
                        'defines promotion eligibility and approval rules.'
                    ),
                }, status=400)

            if existing_assignment:
                if class_obj.is_class_full():
                    return JsonResponse({
                        'success': False,
                        'error': 'The selected class has reached its capacity.',
                    }, status=400)
                # Deactivate existing assignment
                existing_assignment.is_active = False
                existing_assignment.save()
            elif class_obj.is_class_full():
                return JsonResponse({
                    'success': False,
                    'error': 'The selected class has reached its capacity.',
                }, status=400)
            
            # Create enrollment
            enrollment = StudentClass(
                student=student,
                assigned_class=class_obj,
                assigned_by=request.user,
                school=school,
            )
            
            # Validate
            enrollment.full_clean()
            enrollment.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Student {student.full_name} has been assigned to class {class_obj.name}.',
                'enrollment_id': enrollment.id,
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
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'The student already has an active class enrollment.',
        }, status=409)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating enrollment: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def student_enrollment_bulk_create_view(request):
    """
    Assign multiple students to a class in bulk.
    
    GET: Returns bulk assignment form modal
    POST: Creates multiple assignments and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:enrollment_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get options for dropdowns
        students = Student.objects.all()
        students = students.filter(is_active=True)
        classes = Class.objects.filter(
            is_active=True,
            academic_year__school_id=F("school_id"),
        )
        
        if school:
            students = students.filter(school=school)
            classes = classes.filter(school=school)
        
        students = students.order_by('full_name')
        classes = classes.order_by('name')
        
        # Return form for modal
        html = render(request, 'student_enrollment/partials/bulk_enrollment_form.html', {
            'students': students,
            'classes': classes,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create bulk enrollments
    try:
        import json
        data = json.loads(request.body)
        
        student_ids = data.get('student_ids', [])
        class_id = data.get('class_id')
        
        # Validation
        if not all([student_ids, class_id]):
            return JsonResponse({
                'success': False,
                'error': 'Please fill in all required fields.'
            }, status=400)
        
        if not isinstance(student_ids, list) or not student_ids:
            return JsonResponse({
                'success': False,
                'error': 'Please select at least one student.'
            }, status=400)

        try:
            student_ids = [int(student_id) for student_id in student_ids]
        except (TypeError, ValueError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid student IDs provided.',
            }, status=400)
        if len(student_ids) != len(set(student_ids)):
            return JsonResponse({
                'success': False,
                'error': 'Student IDs must be unique.',
            }, status=400)

        created = 0
        skipped = 0
        errors = []

        with transaction.atomic():
            class_queryset = Class.objects.filter(
                pk=class_id,
                is_active=True,
                academic_year__school_id=F("school_id"),
            )
            if request.user.role != "superadmin":
                class_queryset = class_queryset.filter(school=school)
            try:
                class_obj = class_queryset.select_for_update().get()
            except Class.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid class selected.'
                }, status=400)
            school = class_obj.school
            if school is None or not school.is_active:
                return JsonResponse({
                    'success': False,
                    'error': 'The selected class has no active school association.',
                }, status=400)

            students = list(
                Student.objects.select_for_update()
                .filter(pk__in=student_ids, school=school)
                .order_by("pk")
            )
            if len(students) != len(student_ids):
                return JsonResponse({
                    'success': False,
                    'error': 'One or more selected students are invalid.'
                }, status=400)
            if any(not student.is_active for student in students):
                return JsonResponse({
                    'success': False,
                    'error': 'Archived students cannot be assigned to a class.',
                }, status=400)

            for student in students:
                try:
                    with transaction.atomic():
                        existing_assignment = StudentClass.objects.select_for_update().filter(
                            student=student,
                            is_active=True,
                            school=school,
                            assigned_class__school=school,
                        ).first()

                        if existing_assignment:
                            if existing_assignment.assigned_class_id == class_obj.pk:
                                skipped += 1
                                continue
                        if _crosses_academic_year(student, school, class_obj):
                            errors.append(
                                f'{student.full_name}: Cross-year promotion is '
                                'not available until the school defines '
                                'promotion eligibility and approval rules.'
                            )
                            continue

                        if existing_assignment:
                            if class_obj.is_class_full():
                                errors.append(
                                    f'{student.full_name}: The selected class has reached its capacity.'
                                )
                                continue
                            existing_assignment.is_active = False
                            existing_assignment.save()
                        elif class_obj.is_class_full():
                            errors.append(
                                f'{student.full_name}: The selected class has reached its capacity.'
                            )
                            continue

                        enrollment = StudentClass(
                            student=student,
                            assigned_class=class_obj,
                            assigned_by=request.user,
                            school=school,
                        )
                        enrollment.full_clean()
                        enrollment.save()
                        created += 1
                except ValidationError as e:
                    errors.append(f'{student.full_name}: {str(e)}')
                except IntegrityError:
                    existing_assignment = StudentClass.objects.filter(
                        student=student,
                        is_active=True,
                        school=school,
                        assigned_class__school=school,
                    ).first()
                    if (
                        existing_assignment
                        and existing_assignment.assigned_class_id == class_obj.pk
                    ):
                        skipped += 1
                    else:
                        errors.append(
                            f'{student.full_name}: An active enrollment changed '
                            'while this request was being processed.'
                        )

        response_data = {
            'success': True,
            'created': created,
            'skipped': skipped,
            'errors': errors,
        }
        
        if created > 0:
            response_data['message'] = f'Successfully assigned {created} student(s) to class {class_obj.name}.'
        else:
            response_data['message'] = 'No new assignments were created.'
        
        if skipped > 0:
            response_data['message'] += f' {skipped} student(s) were already assigned to this class.'
        
        if errors:
            response_data['error_count'] = len(errors)
            response_data['error_summary'] = f'{len(errors)} error(s) occurred.'
        
        return JsonResponse(response_data)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating enrollments: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def student_enrollment_edit_view(request, enrollment_id):
    """
    Edit an existing student class assignment.
    
    GET: Returns form in modal
    POST: Updates assignment and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:enrollment_list")
    
    school = request.user.school
    
    enrollment = get_object_or_404_with_school(
        StudentClass, request, pk=enrollment_id
    )
    if (
        enrollment.school_id is None
        or enrollment.student.school_id != enrollment.school_id
        or enrollment.assigned_class.school_id != enrollment.school_id
    ):
        return JsonResponse({'error': 'Enrollment has an invalid school association.'}, status=404)
    school = enrollment.assigned_class.school
    if (
        school is None
        or enrollment.school_id != school.pk
        or enrollment.student.school_id != school.pk
    ):
        return JsonResponse({'error': 'Enrollment has an invalid school association.'}, status=404)
    
    if request.method == "GET":
        # Get options for dropdowns
        students = Student.objects.filter(is_active=True)
        classes = Class.objects.filter(
            is_active=True,
            academic_year__school_id=F("school_id"),
        )
        
        if school:
            students = students.filter(school=school)
            classes = classes.filter(school=school)
        
        students = students.order_by('full_name')
        classes = classes.order_by('name')
        
        # Return form for modal
        html = render(request, 'student_enrollment/partials/enrollment_form.html', {
            'enrollment': enrollment,
            'students': students,
            'classes': classes,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update enrollment
    try:
        student_id = request.POST.get("student") or enrollment.student_id
        if str(student_id) != str(enrollment.student_id):
            return JsonResponse({
                'success': False,
                'error': (
                    'An enrollment cannot be reassigned to another student. '
                    'Create a separate enrollment for the other student.'
                ),
            }, status=400)

        with transaction.atomic():
            try:
                class_obj = Class.objects.select_for_update().get(
                    pk=request.POST.get("assigned_class") or enrollment.assigned_class_id,
                    school=school,
                    is_active=True,
                    academic_year__school=school,
                )
                student = Student.objects.select_for_update().get(
                    pk=enrollment.student_id,
                    school=school,
                )
                enrollment = StudentClass.objects.select_for_update().get(
                    pk=enrollment.pk,
                    school=school,
                )
            except (Student.DoesNotExist, Class.DoesNotExist, StudentClass.DoesNotExist):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid student or active same-school class selected.',
                }, status=400)

            is_active = request.POST.get("is_active", "") == "on"
            class_changed = class_obj.pk != enrollment.assigned_class_id
            if class_changed and not is_active:
                return JsonResponse({
                    'success': False,
                    'error': 'Select an active enrollment to transfer the student.',
                }, status=400)

            if not is_active:
                if enrollment.is_active:
                    enrollment.is_active = False
                    enrollment.save(update_fields=["is_active"])
                return JsonResponse({
                    'success': True,
                    'message': 'Enrollment was deactivated; its history was retained.',
                    'enrollment_id': enrollment.pk,
                })

            if not student.is_active:
                return JsonResponse({
                    'success': False,
                    'error': 'Archived students cannot be enrolled in a class.',
                }, status=400)

            if _crosses_academic_year(student, school, class_obj):
                return JsonResponse({
                    'success': False,
                    'error': (
                        'Cross-year promotion is not available until the school '
                        'defines promotion eligibility and approval rules.'
                    ),
                }, status=400)

            existing_assignment = StudentClass.objects.select_for_update().filter(
                student=student,
                is_active=True,
                school=school,
                assigned_class__school=school,
            ).exclude(pk=enrollment.pk).first()
            if existing_assignment:
                if existing_assignment.assigned_class_id == class_obj.pk:
                    return JsonResponse({
                        'success': True,
                        'message': 'Student is already actively enrolled in this class.',
                        'enrollment_id': existing_assignment.pk,
                    })
                return JsonResponse({
                    'success': False,
                    'error': (
                        'The student already has an active enrollment. '
                        'Update that enrollment to make a transfer.'
                    ),
                }, status=409)

            if enrollment.is_active and not class_changed:
                return JsonResponse({
                    'success': True,
                    'message': 'Enrollment is already active.',
                    'enrollment_id': enrollment.pk,
                })

            if class_obj.is_class_full():
                return JsonResponse({
                    'success': False,
                    'error': 'The selected class has reached its capacity.',
                }, status=400)

            if enrollment.is_active:
                enrollment.is_active = False
                enrollment.save(update_fields=["is_active"])

            new_enrollment = StudentClass(
                student=student,
                assigned_class=class_obj,
                assigned_by=request.user,
                school=school,
            )
            new_enrollment.full_clean()
            new_enrollment.save()

            return JsonResponse({
                'success': True,
                'message': (
                    'A new enrollment was created; the previous enrollment '
                    'remains as history.'
                ),
                'enrollment_id': new_enrollment.pk,
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
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'The student already has an active class enrollment.',
        }, status=409)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating enrollment: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def student_enrollment_delete_view(request, enrollment_id):
    """
    Delete (unassign) a student class assignment.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    enrollment = get_object_or_404_with_school(
        StudentClass, request, pk=enrollment_id
    )
    if (
        enrollment.school_id is None
        or enrollment.student.school_id != enrollment.school_id
        or enrollment.assigned_class.school_id != enrollment.school_id
    ):
        return JsonResponse({'error': 'Enrollment has an invalid school association.'}, status=404)
    
    try:
        with transaction.atomic():
            enrollment = StudentClass.objects.select_for_update().get(
                pk=enrollment.pk,
                school=enrollment.school,
            )
            student_name = enrollment.student.full_name
            class_name = enrollment.assigned_class.name
            if enrollment.is_active:
                enrollment.is_active = False
                enrollment.save(update_fields=["is_active"])
        
        return JsonResponse({
            'success': True,
            'message': f'Student {student_name} has been unassigned from class {class_name}.'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting enrollment: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def student_enrollment_bulk_delete_view(request):
    """
    Bulk unassign students from classes.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    try:
        import json
        data = json.loads(request.body)
        enrollment_ids = data.get('enrollment_ids', [])
        
        if not enrollment_ids or not isinstance(enrollment_ids, list):
            return JsonResponse({
                'success': False,
                'error': 'Please select at least one enrollment to unassign.'
            }, status=400)
        
        if request.user.role == "superadmin":
            target_school_id = data.get("target_school_id")
            target_school = SchoolInformation.objects.filter(
                pk=target_school_id,
                is_active=True,
            ).first()
            if target_school is None:
                return JsonResponse({
                    'success': False,
                    'error': 'Select a valid target school.',
                }, status=400)
        else:
            target_school = school

        enrollments = StudentClass.objects.filter(
            pk__in=enrollment_ids,
            school=target_school,
            student__school_id=F("school_id"),
            assigned_class__school_id=F("school_id"),
        )
        
        if enrollments.count() != len(enrollment_ids):
            return JsonResponse({
                'success': False,
                'error': 'One or more selected enrollments are invalid.'
            }, status=400)
        
        unassigned = 0
        
        with transaction.atomic():
            for enrollment in enrollments:
                enrollment.is_active = False
                enrollment.save()
                unassigned += 1
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully unassigned {unassigned} student(s) from their classes.',
            'unassigned': unassigned,
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error unassigning students: {str(e)}'
        }, status=500)
