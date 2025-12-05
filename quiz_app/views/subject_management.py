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
from django.db.models import Q
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    Subject,
    LearningArea,
    Department,
    SchoolInformation,
)


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
    subjects = subjects.order_by('subject_name')
    
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
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create subject
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
    
    school = request.user.school
    
    # Superadmin can access any subject, regular admin only their school
    if request.user.role == "superadmin":
        subject = get_object_or_404(Subject, pk=subject_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:subject_list")
        subject = get_object_or_404(Subject, pk=subject_id, school=school)
    
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
    Delete a subject.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any subject, regular admin only their school
    if request.user.role == "superadmin":
        subject = get_object_or_404(Subject, pk=subject_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        subject = get_object_or_404(Subject, pk=subject_id, school=school)
    
    try:
        # Check if subject has quizzes
        quiz_count = subject.quizzes.count()
        if quiz_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete subject. It has {quiz_count} quiz(es) associated with it.'
            }, status=400)
        
        # Check if subject has class assignments
        class_subject_count = subject.classsubject_set.count()
        if class_subject_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete subject. It is assigned to {class_subject_count} class(es).'
            }, status=400)
        
        subject_name = subject.subject_name
        subject.delete()
        return JsonResponse({
            'success': True,
            'message': f'Subject {subject_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting subject: {str(e)}'
        }, status=500)

