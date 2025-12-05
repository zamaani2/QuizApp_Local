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
from django.db.models import Q
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    StudentClass,
    Student,
    Class,
    AcademicYear,
    SchoolInformation,
    User,
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
    enrollments = StudentClass.objects.all()
    
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
    classes = Class.objects.all()
    
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
            try:
                student = Student.objects.get(pk=student_id, school=school)
                class_obj = Class.objects.get(pk=class_id, school=school)
            except (Student.DoesNotExist, Class.DoesNotExist) as e:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to your school.'
                }, status=400)
            
            # Check if student already has an active assignment
            existing_assignment = StudentClass.objects.filter(
                student=student,
                is_active=True,
                school=school
            ).first()
            
            if existing_assignment:
                # Deactivate existing assignment
                existing_assignment.is_active = False
                existing_assignment.save()
            
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
        classes = Class.objects.all()
        
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
        
        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return JsonResponse({
                'success': False,
                'error': 'Please select at least one student.'
            }, status=400)
        
        # Get class
        try:
            class_obj = Class.objects.get(pk=class_id, school=school)
        except Class.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid class selected.'
            }, status=400)
        
        # Get students
        students = Student.objects.filter(pk__in=student_ids, school=school)
        
        if students.count() != len(student_ids):
            return JsonResponse({
                'success': False,
                'error': 'One or more selected students are invalid.'
            }, status=400)
        
        # Create enrollments
        created = 0
        skipped = 0
        errors = []
        
        with transaction.atomic():
            for student in students:
                try:
                    # Check if student already has an active assignment
                    existing_assignment = StudentClass.objects.filter(
                        student=student,
                        is_active=True,
                        school=school
                    ).first()
                    
                    if existing_assignment:
                        if existing_assignment.assigned_class == class_obj:
                            skipped += 1
                            continue
                        else:
                            # Deactivate existing assignment
                            existing_assignment.is_active = False
                            existing_assignment.save()
                    
                    # Create enrollment
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
                except Exception as e:
                    errors.append(f'{student.full_name}: {str(e)}')
        
        # Prepare response
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
    
    # Superadmin can access any enrollment, regular admin only their school
    if request.user.role == "superadmin":
        enrollment = get_object_or_404(StudentClass, pk=enrollment_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:enrollment_list")
        enrollment = get_object_or_404(StudentClass, pk=enrollment_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and enrollment.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'Enrollment not found'}, status=404)
        messages.error(request, "You don't have permission to edit this enrollment.")
        return redirect("quiz_app:enrollment_list")
    
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
            'enrollment': enrollment,
            'students': students,
            'classes': classes,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update enrollment
    try:
        with transaction.atomic():
            # Get form data
            student_id = request.POST.get('student', '')
            class_id = request.POST.get('assigned_class', '')
            is_active = request.POST.get('is_active', '') == 'on'
            
            # Get related objects
            try:
                student = Student.objects.get(pk=student_id, school=school)
                class_obj = Class.objects.get(pk=class_id, school=school)
            except (Student.DoesNotExist, Class.DoesNotExist):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid selection. Please ensure all selections belong to your school.'
                }, status=400)
            
            # If changing to active and student already has another active assignment
            if is_active:
                existing_assignment = StudentClass.objects.filter(
                    student=student,
                    is_active=True,
                    school=school
                ).exclude(pk=enrollment.id).first()
                
                if existing_assignment:
                    # Deactivate existing assignment
                    existing_assignment.is_active = False
                    existing_assignment.save()
            
            enrollment.student = student
            enrollment.assigned_class = class_obj
            enrollment.is_active = is_active
            
            # Validate
            enrollment.full_clean()
            enrollment.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Enrollment updated successfully.',
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
    
    # Superadmin can access any enrollment, regular admin only their school
    if request.user.role == "superadmin":
        enrollment = get_object_or_404(StudentClass, pk=enrollment_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:enrollment_list")
        enrollment = get_object_or_404(StudentClass, pk=enrollment_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and enrollment.school != school:
        return JsonResponse({'error': 'Enrollment not found'}, status=404)
    
    try:
        student_name = enrollment.student.full_name
        class_name = enrollment.assigned_class.name
        
        # Instead of deleting, deactivate the assignment
        enrollment.is_active = False
        enrollment.save()
        
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
        
        enrollments = StudentClass.objects.filter(pk__in=enrollment_ids, school=school)
        
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

