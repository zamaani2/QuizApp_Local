"""
Form, Learning Area, and Department management views for admin users.

This module provides views for managing school structure including:
- Forms (grade levels)
- Learning Areas (programs)
- Departments
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
    Form,
    LearningArea,
    Department,
    Teacher,
    SchoolInformation,
)


# ==================== Form Views ====================

@login_required
@require_http_methods(["GET"])
def form_list_view(request):
    """
    Display list of all forms with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    forms = Form.objects.all()
    
    if school:
        forms = forms.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        forms = forms.filter(
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    # Order by form number
    forms = forms.order_by('form_number', 'name')
    
    context = {
        'forms': forms,
        'search_query': search_query,
    }
    
    return render(request, 'school_structure/form_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def form_create_view(request):
    """
    Create a new form.
    
    GET: Returns form in modal
    POST: Creates form and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:form_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Return form for modal
        html = render(request, 'school_structure/partials/form_form.html', {
            'form_obj': None,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create form
    try:
        with transaction.atomic():
            # Get form data
            form_number = request.POST.get('form_number', '').strip()
            name = request.POST.get('name', '').strip()
            description = request.POST.get('description', '').strip() or None
            
            # Validation
            if not all([form_number, name]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            try:
                form_number = int(form_number)
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Form number must be a valid number.'
                }, status=400)
            
            # Create form
            form_obj = Form(
                form_number=form_number,
                name=name,
                description=description,
                school=school,
            )
            
            # Validate
            form_obj.full_clean()
            form_obj.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Form {form_obj.name} created successfully.',
                'form_id': form_obj.id,
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
            'error': f'Error creating form: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def form_edit_view(request, form_id):
    """
    Edit an existing form.
    
    GET: Returns form in modal
    POST: Updates form and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:form_list")
    
    school = request.user.school
    
    # Superadmin can access any form, regular admin only their school
    if request.user.role == "superadmin":
        form_obj = get_object_or_404(Form, pk=form_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:form_list")
        form_obj = get_object_or_404(Form, pk=form_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and form_obj.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'Form not found'}, status=404)
        messages.error(request, "You don't have permission to edit this form.")
        return redirect("quiz_app:form_list")
    
    if request.method == "GET":
        # Return form for modal
        html = render(request, 'school_structure/partials/form_form.html', {
            'form_obj': form_obj,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update form
    try:
        with transaction.atomic():
            # Get form data
            form_number = request.POST.get('form_number', '').strip()
            name = request.POST.get('name', '').strip()
            description = request.POST.get('description', '').strip() or None
            
            try:
                form_obj.form_number = int(form_number)
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'error': 'Form number must be a valid number.'
                }, status=400)
            
            form_obj.name = name
            form_obj.description = description
            
            # Validate
            form_obj.full_clean()
            form_obj.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Form {form_obj.name} updated successfully.',
                'form_id': form_obj.id,
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
            'error': f'Error updating form: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def form_delete_view(request, form_id):
    """
    Delete a form.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any form, regular admin only their school
    if request.user.role == "superadmin":
        form_obj = get_object_or_404(Form, pk=form_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:form_list")
        form_obj = get_object_or_404(Form, pk=form_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and form_obj.school != school:
        return JsonResponse({'error': 'Form not found'}, status=404)
    
    try:
        # Check if form has students
        student_count = form_obj.student_set.count()
        if student_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete form. It has {student_count} student(s) associated with it.'
            }, status=400)
        
        form_name = form_obj.name
        form_obj.delete()
        return JsonResponse({
            'success': True,
            'message': f'Form {form_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting form: {str(e)}'
        }, status=500)


# ==================== Learning Area Views ====================

@login_required
@require_http_methods(["GET"])
def learning_area_list_view(request):
    """
    Display list of all learning areas with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    learning_areas = LearningArea.objects.all()
    
    if school:
        learning_areas = learning_areas.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        learning_areas = learning_areas.filter(
            Q(name__icontains=search_query) |
            Q(code__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    # Order by name
    learning_areas = learning_areas.order_by('name')
    
    context = {
        'learning_areas': learning_areas,
        'search_query': search_query,
    }
    
    return render(request, 'school_structure/learning_area_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def learning_area_create_view(request):
    """
    Create a new learning area.
    
    GET: Returns form in modal
    POST: Creates learning area and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:learning_area_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Return form for modal
        html = render(request, 'school_structure/partials/learning_area_form.html', {
            'learning_area': None,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create learning area
    try:
        with transaction.atomic():
            # Get form data
            code = request.POST.get('code', '').strip()
            name = request.POST.get('name', '').strip()
            description = request.POST.get('description', '').strip() or None
            
            # Validation
            if not all([code, name]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Create learning area
            learning_area = LearningArea(
                code=code,
                name=name,
                description=description,
                school=school,
            )
            
            # Validate
            learning_area.full_clean()
            learning_area.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Learning area {learning_area.name} created successfully.',
                'learning_area_id': learning_area.id,
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
            'error': f'Error creating learning area: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def learning_area_edit_view(request, learning_area_id):
    """
    Edit an existing learning area.
    
    GET: Returns form in modal
    POST: Updates learning area and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:learning_area_list")
    
    school = request.user.school
    
    # Superadmin can access any learning area, regular admin only their school
    if request.user.role == "superadmin":
        learning_area = get_object_or_404(LearningArea, pk=learning_area_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:learning_area_list")
        learning_area = get_object_or_404(LearningArea, pk=learning_area_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and learning_area.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'Learning area not found'}, status=404)
        messages.error(request, "You don't have permission to edit this learning area.")
        return redirect("quiz_app:learning_area_list")
    
    if request.method == "GET":
        # Return form for modal
        html = render(request, 'school_structure/partials/learning_area_form.html', {
            'learning_area': learning_area,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update learning area
    try:
        with transaction.atomic():
            # Get form data
            learning_area.code = request.POST.get('code', '').strip()
            learning_area.name = request.POST.get('name', '').strip()
            learning_area.description = request.POST.get('description', '').strip() or None
            
            # Validate
            learning_area.full_clean()
            learning_area.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Learning area {learning_area.name} updated successfully.',
                'learning_area_id': learning_area.id,
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
            'error': f'Error updating learning area: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def learning_area_delete_view(request, learning_area_id):
    """
    Delete a learning area.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any learning area, regular admin only their school
    if request.user.role == "superadmin":
        learning_area = get_object_or_404(LearningArea, pk=learning_area_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:learning_area_list")
        learning_area = get_object_or_404(LearningArea, pk=learning_area_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and learning_area.school != school:
        return JsonResponse({'error': 'Learning area not found'}, status=404)
    
    try:
        # Check if learning area has students
        student_count = learning_area.student_set.count()
        if student_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete learning area. It has {student_count} student(s) associated with it.'
            }, status=400)
        
        learning_area_name = learning_area.name
        learning_area.delete()
        return JsonResponse({
            'success': True,
            'message': f'Learning area {learning_area_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting learning area: {str(e)}'
        }, status=500)


# ==================== Department Views ====================

@login_required
@require_http_methods(["GET"])
def department_list_view(request):
    """
    Display list of all departments with filtering and search capabilities.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    departments = Department.objects.all()
    
    if school:
        departments = departments.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        departments = departments.filter(
            Q(name__icontains=search_query) |
            Q(code__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    # Order by name
    departments = departments.order_by('name')
    
    context = {
        'departments': departments,
        'search_query': search_query,
    }
    
    return render(request, 'school_structure/department_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def department_create_view(request):
    """
    Create a new department.
    
    GET: Returns form in modal
    POST: Creates department and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:department_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Get teachers for head of department dropdown
        teachers = Teacher.objects.all()
        if school:
            teachers = teachers.filter(school=school)
        teachers = teachers.order_by('full_name')
        
        # Return form for modal
        html = render(request, 'school_structure/partials/department_form.html', {
            'department': None,
            'teachers': teachers,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create department
    try:
        with transaction.atomic():
            # Get form data
            name = request.POST.get('name', '').strip()
            code = request.POST.get('code', '').strip()
            description = request.POST.get('description', '').strip() or None
            head_of_department_id = request.POST.get('head_of_department', '') or None
            
            # Validation
            if not all([name, code]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Get head of department if provided
            head_of_department = None
            if head_of_department_id:
                try:
                    head_of_department = Teacher.objects.get(pk=head_of_department_id, school=school)
                except Teacher.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid head of department selected.'
                    }, status=400)
            
            # Create department
            department = Department(
                name=name,
                code=code,
                description=description,
                head_of_department=head_of_department,
                school=school,
            )
            
            # Validate
            department.full_clean()
            department.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Department {department.name} created successfully.',
                'department_id': department.id,
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
            'error': f'Error creating department: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def department_edit_view(request, department_id):
    """
    Edit an existing department.
    
    GET: Returns form in modal
    POST: Updates department and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:department_list")
    
    school = request.user.school
    
    # Superadmin can access any department, regular admin only their school
    if request.user.role == "superadmin":
        department = get_object_or_404(Department, pk=department_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:department_list")
        department = get_object_or_404(Department, pk=department_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and department.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'Department not found'}, status=404)
        messages.error(request, "You don't have permission to edit this department.")
        return redirect("quiz_app:department_list")
    
    if request.method == "GET":
        # Get teachers for head of department dropdown
        teachers = Teacher.objects.all()
        if school:
            teachers = teachers.filter(school=school)
        teachers = teachers.order_by('full_name')
        
        # Return form for modal
        html = render(request, 'school_structure/partials/department_form.html', {
            'department': department,
            'teachers': teachers,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update department
    try:
        with transaction.atomic():
            # Get form data
            department.name = request.POST.get('name', '').strip()
            department.code = request.POST.get('code', '').strip()
            department.description = request.POST.get('description', '').strip() or None
            head_of_department_id = request.POST.get('head_of_department', '') or None
            
            # Get head of department if provided
            if head_of_department_id:
                try:
                    department.head_of_department = Teacher.objects.get(pk=head_of_department_id, school=school)
                except Teacher.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid head of department selected.'
                    }, status=400)
            else:
                department.head_of_department = None
            
            # Validate
            department.full_clean()
            department.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Department {department.name} updated successfully.',
                'department_id': department.id,
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
            'error': f'Error updating department: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def department_delete_view(request, department_id):
    """
    Delete a department.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any department, regular admin only their school
    if request.user.role == "superadmin":
        department = get_object_or_404(Department, pk=department_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:department_list")
        department = get_object_or_404(Department, pk=department_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and department.school != school:
        return JsonResponse({'error': 'Department not found'}, status=404)
    
    try:
        # Check if department has teachers
        teacher_count = department.teacher_set.count()
        if teacher_count > 0:
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete department. It has {teacher_count} teacher(s) associated with it.'
            }, status=400)
        
        department_name = department.name
        department.delete()
        return JsonResponse({
            'success': True,
            'message': f'Department {department_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting department: {str(e)}'
        }, status=500)

