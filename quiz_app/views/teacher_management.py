"""
Teacher management views for admin users.

This module provides views for managing teachers including:
- Listing teachers
- Creating new teachers
- Editing existing teachers
- Deleting teachers
- Bulk import from CSV/Excel
- Bulk delete
"""
import csv
import io
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.db import transaction

from ..models import (
    Teacher,
    Department,
    SchoolInformation,
)


@login_required
@require_http_methods(["GET"])
def teacher_list_view(request):
    """
    Display list of all teachers with filtering and search capabilities.
    
    Supports:
    - Search by name, staff ID, email
    - Filter by department, gender
    - Pagination
    - DataTables integration
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    teachers = Teacher.objects.all()
    
    if school:
        teachers = teachers.filter(school=school)
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        teachers = teachers.filter(
            Q(full_name__icontains=search_query) |
            Q(staff_id__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(contact_number__icontains=search_query)
        )
    
    # Filter by department
    department_filter = request.GET.get('department', '')
    if department_filter:
        teachers = teachers.filter(department_id=department_filter)
    
    # Filter by gender
    gender_filter = request.GET.get('gender', '')
    if gender_filter:
        teachers = teachers.filter(gender=gender_filter)
    
    # Order by full name
    teachers = teachers.order_by('full_name')
    
    # Get filter options
    departments = Department.objects.all()
    if school:
        departments = departments.filter(school=school)
    departments = departments.order_by('name')
    
    context = {
        'teachers': teachers,
        'departments': departments,
        'search_query': search_query,
        'department_filter': department_filter,
        'gender_filter': gender_filter,
    }
    
    return render(request, 'teacher/teacher_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def teacher_create_view(request):
    """
    Create a new teacher.
    
    GET: Returns form in modal
    POST: Creates teacher and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:teacher_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Return form for modal
        departments = Department.objects.all()
        if school:
            departments = departments.filter(school=school)
        departments = departments.order_by('name')
        
        html = render(request, 'teacher/partials/teacher_form.html', {
            'teacher': None,
            'departments': departments,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create teacher
    try:
        with transaction.atomic():
            # Get form data
            full_name = request.POST.get('full_name', '').strip()
            gender = request.POST.get('gender', '') or None
            contact_number = request.POST.get('contact_number', '').strip()
            email = request.POST.get('email', '').strip() or None
            department_id = request.POST.get('department', '') or None
            profile_picture = request.FILES.get('profile_picture', None)
            
            # Validation
            if not all([full_name, contact_number]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Create teacher
            teacher = Teacher(
                full_name=full_name,
                gender=gender,
                contact_number=contact_number,
                email=email,
                school=school,
            )
            
            if department_id:
                try:
                    teacher.department = Department.objects.get(pk=department_id, school=school)
                except Department.DoesNotExist:
                    pass
            
            if profile_picture:
                teacher.profile_picture = profile_picture
            
            teacher.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Teacher {teacher.full_name} created successfully.',
                'teacher_id': teacher.id,
                'staff_id': teacher.staff_id,
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating teacher: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def teacher_edit_view(request, teacher_id):
    """
    Edit an existing teacher.
    
    GET: Returns form in modal
    POST: Updates teacher and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:teacher_list")
    
    school = request.user.school
    
    # Superadmin can access any teacher, regular admin only their school
    if request.user.role == "superadmin":
        teacher = get_object_or_404(Teacher, pk=teacher_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:teacher_list")
        teacher = get_object_or_404(Teacher, pk=teacher_id, school=school)
    
    if request.method == "GET":
        # Return form for modal
        departments = Department.objects.all()
        if school:
            departments = departments.filter(school=school)
        departments = departments.order_by('name')
        
        html = render(request, 'teacher/partials/teacher_form.html', {
            'teacher': teacher,
            'departments': departments,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update teacher
    try:
        with transaction.atomic():
            # Get form data
            teacher.full_name = request.POST.get('full_name', '').strip()
            teacher.gender = request.POST.get('gender', '') or None
            teacher.contact_number = request.POST.get('contact_number', '').strip()
            teacher.email = request.POST.get('email', '').strip() or None
            
            department_id = request.POST.get('department', '') or None
            
            if department_id:
                try:
                    teacher.department = Department.objects.get(pk=department_id, school=school)
                except Department.DoesNotExist:
                    teacher.department = None
            else:
                teacher.department = None
            
            if 'profile_picture' in request.FILES:
                teacher.profile_picture = request.FILES['profile_picture']
            
            teacher.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Teacher {teacher.full_name} updated successfully.',
                'teacher_id': teacher.id,
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating teacher: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def teacher_delete_view(request, teacher_id):
    """
    Delete a teacher.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any teacher, regular admin only their school
    if request.user.role == "superadmin":
        teacher = get_object_or_404(Teacher, pk=teacher_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        teacher = get_object_or_404(Teacher, pk=teacher_id, school=school)
    
    try:
        teacher_name = teacher.full_name
        teacher.delete()
        return JsonResponse({
            'success': True,
            'message': f'Teacher {teacher_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting teacher: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def teacher_bulk_delete_view(request):
    """
    Bulk delete teachers.
    
    POST: Deletes multiple teachers by IDs
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == "GET":
        html = render(request, 'teacher/partials/bulk_delete_modal.html').content.decode('utf-8')
        return JsonResponse({'html': html})
    
    # POST - Bulk delete
    try:
        import json
        data = json.loads(request.body)
        teacher_ids = data.get('teacher_ids', [])
        
        if not teacher_ids:
            return JsonResponse({
                'success': False,
                'error': 'No teachers selected.'
            }, status=400)
        
        school = request.user.school
        teachers = Teacher.objects.filter(pk__in=teacher_ids)
        
        if school:
            teachers = teachers.filter(school=school)
        
        count = teachers.count()
        if count == 0:
            return JsonResponse({
                'success': False,
                'error': 'No valid teachers found to delete.'
            }, status=400)
        
        with transaction.atomic():
            teachers.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'{count} teacher(s) deleted successfully.'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting teachers: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def teacher_bulk_import_view(request):
    """
    Bulk import teachers from CSV file.
    
    GET: Returns import form modal
    POST: Processes CSV file and imports teachers
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:teacher_list")
    
    if request.method == "GET":
        # Return import form for modal
        departments = Department.objects.all()
        school = request.user.school
        if school:
            departments = departments.filter(school=school)
        departments = departments.order_by('name')
        
        html = render(request, 'teacher/partials/bulk_import_modal.html', {
            'departments': departments,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Process import
    try:
        if 'csv_file' not in request.FILES:
            return JsonResponse({
                'success': False,
                'error': 'No file uploaded.'
            }, status=400)
        
        csv_file = request.FILES['csv_file']
        school = request.user.school
        
        # Read CSV file
        file_data = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(file_data))
        
        # Expected columns: full_name, gender, contact_number, email, department
        required_columns = ['full_name', 'contact_number']
        
        # Validate headers
        if not all(col in csv_reader.fieldnames for col in required_columns):
            return JsonResponse({
                'success': False,
                'error': f'CSV must contain columns: {", ".join(required_columns)}'
            }, status=400)
        
        # Get default department if provided
        default_department_id = request.POST.get('default_department', '') or None
        
        default_department = None
        if default_department_id:
            try:
                default_department = Department.objects.get(pk=default_department_id, school=school)
            except Department.DoesNotExist:
                pass
        
        # Process rows
        imported = 0
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (row 1 is header)
                try:
                    # Get data from row
                    full_name = row.get('full_name', '').strip()
                    gender = row.get('gender', '').strip().upper()
                    contact_number = row.get('contact_number', '').strip()
                    email = row.get('email', '').strip() or None
                    department_name = row.get('department', '').strip()
                    
                    # Validate required fields
                    if not all([full_name, contact_number]):
                        errors.append(f'Row {row_num}: Missing required fields')
                        continue
                    
                    # Validate gender
                    if gender and gender not in ['M', 'F']:
                        errors.append(f'Row {row_num}: Invalid gender (must be M or F)')
                        continue
                    
                    # Get department
                    department = default_department
                    if department_name:
                        try:
                            department = Department.objects.get(name__iexact=department_name, school=school)
                        except Department.DoesNotExist:
                            errors.append(f'Row {row_num}: Department "{department_name}" not found')
                            continue
                        except Department.MultipleObjectsReturned:
                            department = Department.objects.filter(name__iexact=department_name, school=school).first()
                    
                    # Create teacher
                    teacher = Teacher(
                        full_name=full_name,
                        gender=gender or None,
                        contact_number=contact_number,
                        email=email,
                        department=department,
                        school=school,
                    )
                    teacher.save()
                    imported += 1
                
                except Exception as e:
                    errors.append(f'Row {row_num}: {str(e)}')
        
        # Prepare response
        response_data = {
            'success': True,
            'imported': imported,
            'errors': errors,
        }
        
        if imported > 0:
            response_data['message'] = f'Successfully imported {imported} teacher(s).'
        else:
            response_data['message'] = 'No teachers were imported.'
        
        if errors:
            response_data['error_count'] = len(errors)
            response_data['error_summary'] = f'{len(errors)} error(s) occurred during import.'
        
        return JsonResponse(response_data)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error processing import: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def teacher_profile_view(request):
    """
    View own teacher profile (for teachers to view their own profile).
    """
    if request.user.role != "teacher":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    if not request.user.teacher_profile:
        messages.error(request, "Teacher profile not found. Please contact administrator.")
        return redirect("quiz_app:dashboard")
    
    teacher = request.user.teacher_profile
    
    # Get teacher's assignments
    assignments = teacher.teachersubjectassignment_set.filter(is_active=True).select_related(
        'subject', 'class_assigned', 'academic_year'
    ).order_by('-academic_year__start_date', 'subject__subject_name')
    
    context = {
        'teacher': teacher,
        'assignments': assignments,
        'is_own_profile': True,
    }
    
    return render(request, 'teacher/teacher_detail.html', context)


@login_required
@require_http_methods(["GET"])
def teacher_detail_view(request, teacher_id):
    """
    View teacher details.
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    school = request.user.school
    
    # Superadmin can access any teacher, regular admin only their school
    if request.user.role == "superadmin":
        teacher = get_object_or_404(Teacher, pk=teacher_id)
    else:
        if not school:
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:teacher_list")
        teacher = get_object_or_404(Teacher, pk=teacher_id, school=school)
    
    # Get teacher's assignments
    assignments = teacher.teachersubjectassignment_set.filter(is_active=True).select_related(
        'subject', 'class_assigned', 'academic_year'
    ).order_by('-academic_year__start_date', 'subject__subject_name')
    
    context = {
        'teacher': teacher,
        'assignments': assignments,
        'is_own_profile': False,
    }
    
    return render(request, 'teacher/teacher_detail.html', context)

