"""
Class management views for admin users.

This module provides views for managing classes including:
- Listing classes
- Creating new classes
- Editing existing classes
- Deleting classes
- Viewing class details
- Managing ClassSubjects (subjects assigned to classes)
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
    Class,
    ClassSubject,
    Form,
    LearningArea,
    AcademicYear,
    Subject,
    StudentClass,
    SchoolInformation,
)


@login_required
@require_http_methods(["GET"])
def class_list_view(request):
    """
    Display list of all classes with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    classes = Class.objects.all()
    
    if school:
        classes = classes.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        classes = classes.filter(
            Q(name__icontains=search_query) |
            Q(class_id__icontains=search_query)
        )
    
    # Filter by form
    form_filter = request.GET.get('form', '')
    if form_filter:
        classes = classes.filter(form_id=form_filter)
    
    # Filter by learning area
    learning_area_filter = request.GET.get('learning_area', '')
    if learning_area_filter:
        classes = classes.filter(learning_area_id=learning_area_filter)
    
    # Filter by academic year
    academic_year_filter = request.GET.get('academic_year', '')
    if academic_year_filter:
        classes = classes.filter(academic_year_id=academic_year_filter)
    
    # Order by academic year and name
    classes = classes.order_by('-academic_year__start_date', 'name')
    
    # Get filter options
    forms = Form.objects.all()
    learning_areas = LearningArea.objects.all()
    academic_years = AcademicYear.objects.all()
    if school:
        forms = forms.filter(school=school)
        learning_areas = learning_areas.filter(school=school)
        academic_years = academic_years.filter(school=school)
    forms = forms.order_by('form_number')
    learning_areas = learning_areas.order_by('name')
    academic_years = academic_years.order_by('-start_date')
    
    context = {
        'classes': classes,
        'forms': forms,
        'learning_areas': learning_areas,
        'academic_years': academic_years,
        'search_query': search_query,
        'form_filter': form_filter,
        'learning_area_filter': learning_area_filter,
        'academic_year_filter': academic_year_filter,
    }
    
    return render(request, 'class/class_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def class_create_view(request):
    """
    Create a new class.
    
    GET: Returns form in modal
    POST: Creates class and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:class_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get options for dropdowns
        forms = Form.objects.all()
        learning_areas = LearningArea.objects.all()
        academic_years = AcademicYear.objects.all()
        if school:
            forms = forms.filter(school=school)
            learning_areas = learning_areas.filter(school=school)
            academic_years = academic_years.filter(school=school)
        forms = forms.order_by('form_number')
        learning_areas = learning_areas.order_by('name')
        academic_years = academic_years.order_by('-start_date')
        
        # Return form for modal
        html = render(request, 'class/partials/class_form.html', {
            'class_obj': None,
            'forms': forms,
            'learning_areas': learning_areas,
            'academic_years': academic_years,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create class
    try:
        with transaction.atomic():
            # Get form data
            name = request.POST.get('name', '').strip()
            form_id = request.POST.get('form', '') or None
            learning_area_id = request.POST.get('learning_area', '') or None
            academic_year_id = request.POST.get('academic_year', '')
            maximum_students = request.POST.get('maximum_students', '40')
            
            # Validation
            if not all([name, academic_year_id]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            try:
                maximum_students = int(maximum_students)
                if maximum_students <= 0:
                    raise ValueError
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Maximum students must be a positive number.'
                }, status=400)
            
            # Get academic year
            try:
                academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
            except AcademicYear.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid academic year selected.'
                }, status=400)
            
            # Get form if provided
            form = None
            if form_id:
                try:
                    form = Form.objects.get(pk=form_id, school=school)
                except Form.DoesNotExist:
                    pass
            
            # Get learning area if provided
            learning_area = None
            if learning_area_id:
                try:
                    learning_area = LearningArea.objects.get(pk=learning_area_id, school=school)
                except LearningArea.DoesNotExist:
                    pass
            
            # Create class
            class_obj = Class(
                name=name,
                form=form,
                learning_area=learning_area,
                academic_year=academic_year,
                maximum_students=maximum_students,
                school=school,
            )
            
            # Validate
            class_obj.full_clean()
            class_obj.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Class {class_obj.name} created successfully.',
                'class_id': class_obj.id,
                'class_code': class_obj.class_id,
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
            'error': f'Error creating class: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def class_edit_view(request, class_id):
    """
    Edit an existing class.
    
    GET: Returns form in modal
    POST: Updates class and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:class_list")
    
    school = request.user.school
    
    # Superadmin can access any class, regular admin only their school
    if request.user.role == "superadmin":
        class_obj = get_object_or_404(Class, pk=class_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:class_list")
        class_obj = get_object_or_404(Class, pk=class_id, school=school)
    
    if request.method == "GET":
        # Get options for dropdowns
        forms = Form.objects.all()
        learning_areas = LearningArea.objects.all()
        academic_years = AcademicYear.objects.all()
        if school:
            forms = forms.filter(school=school)
            learning_areas = learning_areas.filter(school=school)
            academic_years = academic_years.filter(school=school)
        forms = forms.order_by('form_number')
        learning_areas = learning_areas.order_by('name')
        academic_years = academic_years.order_by('-start_date')
        
        # Return form for modal
        html = render(request, 'class/partials/class_form.html', {
            'class_obj': class_obj,
            'forms': forms,
            'learning_areas': learning_areas,
            'academic_years': academic_years,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update class
    try:
        with transaction.atomic():
            # Get form data
            class_obj.name = request.POST.get('name', '').strip()
            form_id = request.POST.get('form', '') or None
            learning_area_id = request.POST.get('learning_area', '') or None
            academic_year_id = request.POST.get('academic_year', '')
            maximum_students = request.POST.get('maximum_students', '40')
            
            try:
                maximum_students = int(maximum_students)
                if maximum_students <= 0:
                    raise ValueError
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Maximum students must be a positive number.'
                }, status=400)
            
            # Get academic year
            try:
                class_obj.academic_year = AcademicYear.objects.get(pk=academic_year_id, school=school)
            except AcademicYear.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid academic year selected.'
                }, status=400)
            
            # Get form if provided
            if form_id:
                try:
                    class_obj.form = Form.objects.get(pk=form_id, school=school)
                except Form.DoesNotExist:
                    class_obj.form = None
            else:
                class_obj.form = None
            
            # Get learning area if provided
            if learning_area_id:
                try:
                    class_obj.learning_area = LearningArea.objects.get(pk=learning_area_id, school=school)
                except LearningArea.DoesNotExist:
                    class_obj.learning_area = None
            else:
                class_obj.learning_area = None
            
            class_obj.maximum_students = maximum_students
            
            # Validate
            class_obj.full_clean()
            class_obj.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Class {class_obj.name} updated successfully.',
                'class_id': class_obj.id,
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
            'error': f'Error updating class: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def class_delete_view(request, class_id):
    """
    Delete a class.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any class, regular admin only their school
    if request.user.role == "superadmin":
        class_obj = get_object_or_404(Class, pk=class_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        class_obj = get_object_or_404(Class, pk=class_id, school=school)
    
    try:
        # Check if class has students
        student_count = class_obj.studentclass_set.count()
        if student_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete class. It has {student_count} student(s) assigned to it.'
            }, status=400)
        
        class_name = class_obj.name
        class_obj.delete()
        return JsonResponse({
            'success': True,
            'message': f'Class {class_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting class: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def class_detail_view(request, class_id):
    """
    View class details and manage ClassSubjects.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    school = request.user.school
    class_obj = get_object_or_404(Class, pk=class_id)
    
    # Ensure class belongs to same school
    if school and class_obj.school != school:
        messages.error(request, "You don't have permission to view this class.")
        return redirect("quiz_app:class_list")
    
    # Get class subjects
    class_subjects = ClassSubject.objects.filter(class_name=class_obj).order_by('subject__subject_name')
    
    # Get available subjects (not already assigned to this class for the same academic year)
    assigned_subject_ids = class_subjects.values_list('subject_id', flat=True)
    available_subjects = Subject.objects.filter(school=school).exclude(pk__in=assigned_subject_ids).order_by('subject_name')
    
    # Get students in this class
    students = StudentClass.objects.filter(assigned_class=class_obj, is_active=True).select_related('student').order_by('student__full_name')
    
    context = {
        'class_obj': class_obj,
        'class_subjects': class_subjects,
        'available_subjects': available_subjects,
        'students': students,
    }
    
    return render(request, 'class/class_detail.html', context)


@login_required
@require_http_methods(["POST"])
def class_subject_add_view(request, class_id):
    """
    Add a subject to a class.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any class, regular admin only their school
    if request.user.role == "superadmin":
        class_obj = get_object_or_404(Class, pk=class_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        class_obj = get_object_or_404(Class, pk=class_id, school=school)
    
    try:
        import json
        data = json.loads(request.body)
        subject_id = data.get('subject_id')
        
        if not subject_id:
            return JsonResponse({
                'success': False,
                'error': 'Subject ID is required.'
            }, status=400)
        
        # Get subject
        try:
            subject = Subject.objects.get(pk=subject_id, school=school)
        except Subject.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid subject selected.'
            }, status=400)
        
        # Check if already assigned
        existing = ClassSubject.objects.filter(
            class_name=class_obj,
            subject=subject,
            academic_year=class_obj.academic_year
        ).first()
        
        if existing:
            return JsonResponse({
                'success': False,
                'error': 'This subject is already assigned to this class for this academic year.'
            }, status=400)
        
        # Create ClassSubject
        with transaction.atomic():
            class_subject = ClassSubject(
                class_name=class_obj,
                subject=subject,
                academic_year=class_obj.academic_year,
                school=school,
            )
            class_subject.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Subject {subject.subject_name} added to class successfully.',
            'class_subject_id': class_subject.id,
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error adding subject: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def class_subject_remove_view(request, class_id, class_subject_id):
    """
    Remove a subject from a class.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any class, regular admin only their school
    if request.user.role == "superadmin":
        class_obj = get_object_or_404(Class, pk=class_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        class_obj = get_object_or_404(Class, pk=class_id, school=school)
    
    # ClassSubject filtering - ensure it belongs to the class which belongs to school
    if request.user.role == "superadmin":
        class_subject = get_object_or_404(ClassSubject, pk=class_subject_id, class_name=class_obj)
    else:
        class_subject = get_object_or_404(ClassSubject, pk=class_subject_id, class_name=class_obj, class_name__school=school)
    
    try:
        subject_name = class_subject.subject.subject_name
        class_subject.delete()
        return JsonResponse({
            'success': True,
            'message': f'Subject {subject_name} removed from class successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error removing subject: {str(e)}'
        }, status=500)

