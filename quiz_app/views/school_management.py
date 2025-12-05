"""
School Information management views for admin users.

This module provides views for managing school information including:
- Listing schools (superadmin only)
- Viewing school details
- Editing school information (admin can edit their own school, superadmin can edit any)
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils.text import slugify

from ..models import (
    SchoolInformation,
    AcademicYear,
    Term,
)


@login_required
@require_http_methods(["GET"])
def school_list_view(request):
    """
    Display list of all schools (superadmin only).
    """
    if request.user.role != "superadmin":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    schools = SchoolInformation.objects.all().order_by('name')
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        schools = schools.filter(
            Q(name__icontains=search_query) |
            Q(short_name__icontains=search_query) |
            Q(school_code__icontains=search_query) |
            Q(address__icontains=search_query)
        )
    
    # Filter by active status
    active_filter = request.GET.get('is_active', '')
    if active_filter == 'true':
        schools = schools.filter(is_active=True)
    elif active_filter == 'false':
        schools = schools.filter(is_active=False)
    
    context = {
        'schools': schools,
        'search_query': search_query,
        'active_filter': active_filter,
    }
    
    return render(request, 'school/school_list.html', context)


@login_required
@require_http_methods(["GET"])
def school_detail_view(request, school_id=None):
    """
    View and edit school information.
    
    - School admins can only view/edit their own school
    - Superadmins can view/edit any school
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")
    
    # Determine which school to show
    if school_id:
        # Superadmin viewing a specific school
        if request.user.role != "superadmin":
            messages.error(request, "You don't have permission to view other schools.")
            return redirect("quiz_app:school_detail")
        school = get_object_or_404(SchoolInformation, pk=school_id)
    else:
        # Admin viewing their own school
        if request.user.role == "superadmin":
            # Superadmin without school_id - redirect to list
            return redirect("quiz_app:school_list")
        school = request.user.school
        if not school:
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:dashboard")
    
    # Get academic years and terms for dropdowns
    academic_years = AcademicYear.objects.filter(school=school).order_by('-start_date')
    terms = Term.objects.filter(academic_year__school=school).order_by('-academic_year__start_date', 'term_number')
    
    context = {
        'school': school,
        'academic_years': academic_years,
        'terms': terms,
    }
    
    return render(request, 'school/school_detail.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def school_edit_view(request, school_id=None):
    """
    Edit school information.
    
    GET: Returns form in modal or page
    POST: Updates school and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:dashboard")
    
    # Determine which school to edit
    if school_id:
        # Superadmin editing a specific school
        if request.user.role != "superadmin":
            if request.method == "GET":
                return JsonResponse({'error': 'Permission denied. You can only edit your own school.'}, status=403)
            messages.error(request, "You don't have permission to edit other schools.")
            return redirect("quiz_app:school_detail")
        school = get_object_or_404(SchoolInformation, pk=school_id)
    else:
        # Admin editing their own school (no school_id in URL)
        if request.user.role == "superadmin":
            # Superadmin without school_id - redirect to list
            if request.method == "GET":
                return JsonResponse({'error': 'Please select a school to edit'}, status=400)
            return redirect("quiz_app:school_list")
        school = request.user.school
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            messages.error(request, "No school associated with your account.")
            return redirect("quiz_app:dashboard")
    
    if request.method == "GET":
        # Get academic years and terms for dropdowns
        academic_years = AcademicYear.objects.filter(school=school).order_by('-start_date')
        terms = Term.objects.filter(academic_year__school=school).order_by('-academic_year__start_date', 'term_number')
        
        # Check if request is AJAX (for modal)
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            html = render(request, 'school/partials/school_form.html', {
                'school': school,
                'academic_years': academic_years,
                'terms': terms,
            }).content.decode('utf-8')
            return JsonResponse({'html': html})
        else:
            # Regular page request
            context = {
                'school': school,
                'academic_years': academic_years,
                'terms': terms,
            }
            return render(request, 'school/school_edit.html', context)
    
    # POST - Update school
    try:
        with transaction.atomic():
            # Get form data
            school.name = request.POST.get('name', '').strip()
            school.short_name = request.POST.get('short_name', '').strip()
            school.address = request.POST.get('address', '').strip()
            school.postal_code = request.POST.get('postal_code', '').strip() or None
            school.phone_number = request.POST.get('phone_number', '').strip()
            school.email = request.POST.get('email', '').strip() or None
            school.website = request.POST.get('website', '').strip() or None
            school.school_code = request.POST.get('school_code', '').strip() or None
            school.motto = request.POST.get('motto', '').strip() or None
            school.vision = request.POST.get('vision', '').strip() or None
            school.mission = request.POST.get('mission', '').strip() or None
            school.report_header = request.POST.get('report_header', '').strip() or None
            school.report_footer = request.POST.get('report_footer', '').strip() or None
            school.grading_system_description = request.POST.get('grading_system_description', '').strip() or None
            school.is_active = request.POST.get('is_active', '') == 'on'
            
            # Handle file uploads
            if 'logo' in request.FILES:
                school.logo = request.FILES['logo']
            if 'school_stamp' in request.FILES:
                school.school_stamp = request.FILES['school_stamp']
            
            # Handle academic year and term
            current_academic_year_id = request.POST.get('current_academic_year', '') or None
            current_term_id = request.POST.get('current_term', '') or None
            
            if current_academic_year_id:
                try:
                    school.current_academic_year = AcademicYear.objects.get(pk=current_academic_year_id, school=school)
                except AcademicYear.DoesNotExist:
                    school.current_academic_year = None
            else:
                school.current_academic_year = None
            
            if current_term_id:
                try:
                    term = Term.objects.get(pk=current_term_id)
                    # Ensure term belongs to the school's academic year
                    if term.academic_year.school == school:
                        school.current_term = term
                    else:
                        school.current_term = None
                except Term.DoesNotExist:
                    school.current_term = None
            else:
                school.current_term = None
            
            # Update slug if name changed (only for superadmin)
            if request.user.role == "superadmin" and school.name:
                # Generate slug from name if not set or if name changed
                if not school.slug or school.slug == "default-school":
                    school.slug = slugify(school.name)
            
            school.updated_by = request.user
            school.save()
            
            return JsonResponse({
                'success': True,
                'message': f'School information updated successfully.',
                'school_id': school.id,
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
            'error': f'Error updating school information: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def school_delete_view(request, school_id):
    """
    Delete a school (superadmin only).
    """
    if request.user.role != "superadmin":
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = get_object_or_404(SchoolInformation, pk=school_id)
    
    try:
        # Check if school has associated data
        has_users = school.users.exists()
        has_students = school.students.exists()
        has_teachers = school.teachers.exists()
        
        if has_users or has_students or has_teachers:
            return JsonResponse({
                'success': False,
                'error': 'Cannot delete school. It has associated users, students, or teachers.'
            }, status=400)
        
        school_name = school.name
        school.delete()
        return JsonResponse({
            'success': True,
            'message': f'School {school_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting school: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def school_create_view(request):
    """
    Create a new school (superadmin only).
    """
    if request.user.role != "superadmin":
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:school_list")
    
    if request.method == "GET":
        # Return form for modal
        html = render(request, 'school/partials/school_form.html', {
            'school': None,
            'academic_years': [],
            'terms': [],
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create school
    try:
        with transaction.atomic():
            # Get form data
            name = request.POST.get('name', '').strip()
            short_name = request.POST.get('short_name', '').strip()
            address = request.POST.get('address', '').strip()
            phone_number = request.POST.get('phone_number', '').strip()
            
            # Validation
            if not all([name, short_name, address, phone_number]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Create school
            school = SchoolInformation(
                name=name,
                short_name=short_name,
                address=address,
                phone_number=phone_number,
                slug=slugify(name),
                postal_code=request.POST.get('postal_code', '').strip() or None,
                email=request.POST.get('email', '').strip() or None,
                website=request.POST.get('website', '').strip() or None,
                school_code=request.POST.get('school_code', '').strip() or None,
                motto=request.POST.get('motto', '').strip() or None,
                vision=request.POST.get('vision', '').strip() or None,
                mission=request.POST.get('mission', '').strip() or None,
                report_header=request.POST.get('report_header', '').strip() or None,
                report_footer=request.POST.get('report_footer', '').strip() or None,
                grading_system_description=request.POST.get('grading_system_description', '').strip() or None,
                created_by=request.user,
                updated_by=request.user,
            )
            
            if 'logo' in request.FILES:
                school.logo = request.FILES['logo']
            if 'school_stamp' in request.FILES:
                school.school_stamp = request.FILES['school_stamp']
            
            school.save()
            
            return JsonResponse({
                'success': True,
                'message': f'School {school.name} created successfully.',
                'school_id': school.id,
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating school: {str(e)}'
        }, status=500)

