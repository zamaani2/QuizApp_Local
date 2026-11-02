"""
Subject management views for admin users.

This module provides views for managing subjects including:
- Listing subjects
- Creating new subjects
- Editing existing subjects
- Deleting subjects
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Count, Q
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    Subject,
    LearningArea,
    Department,
    TeacherSubjectAssignment,
    SchoolInformation,
)
from ..utils.tenant_utils import get_object_or_404_with_school, get_write_school


@login_required
@require_http_methods(["GET"])
def subject_list_view(request):
    """
    Display list of all subjects with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    subjects = Subject.objects.all()
    
    if school:
        subjects = subjects.filter(school=school)
    status_filter = request.GET.get("status", "active")
    if status_filter == "archived":
        subjects = subjects.filter(is_active=False)
    elif status_filter == "all":
        pass
    else:
        status_filter = "active"
        subjects = subjects.filter(is_active=True)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        subjects = subjects.filter(
            Q(subject_name__icontains=search_query) |
            Q(subject_code__icontains=search_query)
        )
    
    # Filter by learning area
    learning_area_filter = request.GET.get('learning_area', '')
    if learning_area_filter:
        subjects = subjects.filter(learning_area_id=learning_area_filter)
    
    # Filter by department
    department_filter = request.GET.get('department', '')
    if department_filter:
        subjects = subjects.filter(department_id=department_filter)
    
    # Order by subject name
    subjects = subjects.select_related(
        "learning_area", "department"
    ).annotate(quiz_count=Count("quizzes")).order_by('subject_name')
    
    # Get filter options
    learning_areas = LearningArea.objects.all()
    if school:
        learning_areas = learning_areas.filter(school=school)
    learning_areas = learning_areas.order_by('name')
    
    departments = Department.objects.all()
    if school:
        departments = departments.filter(school=school)
    departments = departments.order_by('name')
    
    context = {
        'subjects': subjects,
        'learning_areas': learning_areas,
        'departments': departments,
        'search_query': search_query,
        'learning_area_filter': learning_area_filter,
        'department_filter': department_filter,
        'status_filter': status_filter,
    }
    
    return render(request, 'subject/subject_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def subject_create_view(request):
    """
    Create a new subject.
    
    GET: Returns form in modal
    POST: Creates subject and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:subject_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get learning areas and departments for dropdowns
        learning_areas = LearningArea.objects.all()
        departments = Department.objects.all()
        if school:
            learning_areas = learning_areas.filter(school=school)
            departments = departments.filter(school=school)
        learning_areas = learning_areas.order_by('name')
        departments = departments.order_by('name')
        
        # Return form for modal
        html = render(request, 'subject/partials/subject_form.html', {
            'subject': None,
            'learning_areas': learning_areas,
            'departments': departments,
            'schools': (
                SchoolInformation.objects.filter(is_active=True).order_by("name")
                if request.user.role == "superadmin"
                else SchoolInformation.objects.none()
            ),
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create subject
    school = get_write_school(request)
    if school is None:
        return JsonResponse({
            'success': False,
            'error': 'Select a valid target school.',
        }, status=400)

    try:
        with transaction.atomic():
            # Get form data
            subject_name = request.POST.get('subject_name', '').strip()
            learning_area_id = request.POST.get('learning_area', '') or None
            department_id = request.POST.get('department', '') or None
            
            # Validation
            if not subject_name:
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Get learning area if provided
            learning_area = None
            if learning_area_id:
                try:
                    learning_area = LearningArea.objects.get(pk=learning_area_id, school=school)
                except LearningArea.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid learning area selected.'
                    }, status=400)
            
            # Get department if provided
            department = None
            if department_id:
                try:
                    department = Department.objects.get(pk=department_id, school=school)
                except Department.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid department selected.'
                    }, status=400)
            
            # Create subject
            subject = Subject(
                subject_name=subject_name,
                learning_area=learning_area,
                department=department,
                school=school,
            )
            
            # Validate
            subject.full_clean()
            subject.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Subject {subject.subject_name} created successfully.',
                'subject_id': subject.id,
                'subject_code': subject.subject_code,
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
            'error': f'Error creating subject: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def subject_edit_view(request, subject_id):
    """
    Edit an existing subject.
    
    GET: Returns form in modal
    POST: Updates subject and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:subject_list")
    
    subject = get_object_or_404_with_school(Subject, request, pk=subject_id)
    school = subject.school
    
    if request.method == "GET":
        # Get learning areas and departments for dropdowns
        learning_areas = LearningArea.objects.all()
        departments = Department.objects.all()
        if school:
            learning_areas = learning_areas.filter(school=school)
            departments = departments.filter(school=school)
        learning_areas = learning_areas.order_by('name')
        departments = departments.order_by('name')
        
        # Return form for modal
        html = render(request, 'subject/partials/subject_form.html', {
            'subject': subject,
            'learning_areas': learning_areas,
            'departments': departments,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update subject
    try:
        with transaction.atomic():
            # Get form data
            subject.subject_name = request.POST.get('subject_name', '').strip()
            learning_area_id = request.POST.get('learning_area', '') or None
            department_id = request.POST.get('department', '') or None
            
            # Get learning area if provided
            if learning_area_id:
                try:
                    subject.learning_area = LearningArea.objects.get(pk=learning_area_id, school=school)
                except LearningArea.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid learning area selected.'
                    }, status=400)
            else:
                subject.learning_area = None
            
            # Get department if provided
            if department_id:
                try:
                    subject.department = Department.objects.get(pk=department_id, school=school)
                except Department.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid department selected.'
                    }, status=400)
            else:
                subject.department = None
            
            # Validate
            subject.full_clean()
            subject.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Subject {subject.subject_name} updated successfully.',
                'subject_id': subject.id,
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
            'error': f'Error updating subject: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def subject_delete_view(request, subject_id):
    """
    Archive a subject while preserving its historical records.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    subject = get_object_or_404_with_school(Subject, request, pk=subject_id)
    
    try:
        with transaction.atomic():
            subject = Subject.objects.select_for_update().get(pk=subject.pk)
            if subject.is_active:
                TeacherSubjectAssignment.objects.filter(
                    subject=subject, is_active=True
                ).update(is_active=False)
                subject.is_active = False
                subject.save(update_fields=["is_active"])
        return JsonResponse({
            'success': True,
            'message': f'Subject {subject.subject_name} archived successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error archiving subject: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def subject_restore_view(request, subject_id):
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    subject = get_object_or_404_with_school(Subject, request, pk=subject_id)
    if not subject.is_active:
        subject.is_active = True
        subject.save(update_fields=["is_active"])
    return JsonResponse({
        "success": True,
        "message": f"Subject {subject.subject_name} restored. Historical assignments remain inactive.",
    })
