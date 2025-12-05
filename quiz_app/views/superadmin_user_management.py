"""
Superadmin User Management views.

Allows superadmin to manage school administrators across all schools.
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.db import transaction

from ..models import (
    User,
    SchoolInformation,
)


@login_required
@require_http_methods(["GET"])
def superadmin_admin_list_view(request):
    """
    List all school administrators across all schools (superadmin only).
    """
    if request.user.role != "superadmin":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:superadmin_login")
    
    # Get all admin users
    admins = User.objects.filter(role="admin").select_related('school').order_by('school__name', 'full_name')
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        admins = admins.filter(
            Q(full_name__icontains=search_query) |
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(school__name__icontains=search_query)
        )
    
    # Filter by school
    school_filter = request.GET.get('school', '')
    if school_filter:
        admins = admins.filter(school_id=school_filter)
    
    # Filter by active status
    active_filter = request.GET.get('is_active', '')
    if active_filter == 'true':
        admins = admins.filter(is_active=True)
    elif active_filter == 'false':
        admins = admins.filter(is_active=False)
    
    # Get all schools for filter dropdown
    schools = SchoolInformation.objects.filter(is_active=True).order_by('name')
    
    context = {
        'admins': admins,
        'schools': schools,
        'search_query': search_query,
        'school_filter': school_filter,
        'active_filter': active_filter,
    }
    
    return render(request, 'superadmin/admin_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def superadmin_admin_create_view(request):
    """
    Create a new school administrator (superadmin only).
    """
    if request.user.role != "superadmin":
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:superadmin_login")
    
    if request.method == "GET":
        # Get all active schools for dropdown
        schools = SchoolInformation.objects.filter(is_active=True).order_by('name')
        
        # Return form for modal
        html = render(request, 'superadmin/partials/admin_form.html', {
            'admin': None,
            'schools': schools,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create admin
    try:
        with transaction.atomic():
            # Get form data
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            full_name = request.POST.get('full_name', '').strip()
            password = request.POST.get('password', '').strip()
            school_id = request.POST.get('school', '').strip()
            is_active = request.POST.get('is_active', '') == 'on'
            
            # Validation
            if not all([username, email, full_name, school_id]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Check if username already exists
            if User.objects.filter(username=username).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Username already exists. Please choose a different username.'
                }, status=400)
            
            # Check if email already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Email already exists. Please use a different email.'
                }, status=400)
            
            # Get school
            try:
                school = SchoolInformation.objects.get(pk=school_id, is_active=True)
            except SchoolInformation.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid school selected.'
                }, status=400)
            
            # Set default password if not provided
            if not password:
                password = "0000"  # Default password
            
            # Create admin user
            admin = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                full_name=full_name,
                role="admin",
                school=school,
                is_active=is_active,
            )
            
            return JsonResponse({
                'success': True,
                'message': f'Administrator {admin.full_name} created successfully for {school.name}.',
                'admin_id': admin.id
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating administrator: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def superadmin_admin_edit_view(request, admin_id):
    """
    Edit a school administrator (superadmin only).
    """
    if request.user.role != "superadmin":
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:superadmin_login")
    
    admin = get_object_or_404(User, pk=admin_id, role="admin")
    
    if request.method == "GET":
        # Get all active schools for dropdown
        schools = SchoolInformation.objects.filter(is_active=True).order_by('name')
        
        # Check if request is AJAX (for modal)
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            html = render(request, 'superadmin/partials/admin_form.html', {
                'admin': admin,
                'schools': schools,
            }).content.decode('utf-8')
            return JsonResponse({'html': html})
        else:
            # Regular page request
            context = {
                'admin': admin,
                'schools': schools,
            }
            return render(request, 'superadmin/admin_edit.html', context)
    
    # POST - Update admin
    try:
        with transaction.atomic():
            # Get form data
            admin.email = request.POST.get('email', '').strip()
            admin.full_name = request.POST.get('full_name', '').strip()
            school_id = request.POST.get('school', '').strip()
            admin.is_active = request.POST.get('is_active', '') == 'on'
            
            # Validation
            if not all([admin.email, admin.full_name, school_id]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Check if email already exists (excluding current user)
            if User.objects.filter(email=admin.email).exclude(pk=admin.id).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Email already exists. Please use a different email.'
                }, status=400)
            
            # Get school
            try:
                school = SchoolInformation.objects.get(pk=school_id, is_active=True)
            except SchoolInformation.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid school selected.'
                }, status=400)
            
            admin.school = school
            
            # Update password if provided
            password = request.POST.get('password', '').strip()
            if password:
                admin.set_password(password)
            
            admin.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Administrator {admin.full_name} updated successfully.',
                'admin_id': admin.id,
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating administrator: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def superadmin_admin_delete_view(request, admin_id):
    """
    Delete a school administrator (superadmin only).
    """
    if request.user.role != "superadmin":
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    admin = get_object_or_404(User, pk=admin_id, role="admin")
    
    # Prevent deleting yourself
    if admin.id == request.user.id:
        return JsonResponse({
            'success': False,
            'error': 'You cannot delete your own account.'
        }, status=400)
    
    try:
        admin_name = admin.full_name
        school_name = admin.school.name if admin.school else "Unknown"
        admin.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Administrator {admin_name} from {school_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting administrator: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def superadmin_admin_detail_view(request, admin_id):
    """
    View details of a school administrator (superadmin only).
    """
    if request.user.role != "superadmin":
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:superadmin_login")
    
    admin = get_object_or_404(User, pk=admin_id, role="admin")
    
    context = {
        'admin': admin,
    }
    
    return render(request, 'superadmin/admin_detail.html', context)




