"""
User management views for admin users.

This module provides views for managing users including:
- Listing users
- Creating new users
- Editing existing users
- Deleting users
- Bulk password reset
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.db import transaction

User = get_user_model()

from ..models import SchoolInformation


@login_required
@require_http_methods(["GET"])
def user_list_view(request):
    """
    Display list of all users with filtering and search capabilities.
    
    Supports:
    - Search by username, email, full name
    - Filter by role
    - Pagination
    - DataTables integration
    """
    if request.user.role not in ["admin", "superadmin"]:
        messages.error(request, "You don't have permission to access this page.")
        return redirect("quiz_app:dashboard")

    school = request.user.school
    users = User.objects.all()
    
    if school:
        users = users.filter(school=school)
    
    # Exclude superadmin users from regular admin view
    if request.user.role == "admin":
        users = users.exclude(role="superadmin")
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        users = users.filter(
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(full_name__icontains=search_query)
        )
    
    # Filter by role
    role_filter = request.GET.get('role', '')
    if role_filter:
        users = users.filter(role=role_filter)
    
    # Order by full name
    users = users.order_by('full_name', 'username')
    
    context = {
        'users': users,
        'search_query': search_query,
        'role_filter': role_filter,
        'user_roles': User.ROLES,
    }
    
    return render(request, 'users/user_list.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def user_create_view(request):
    """
    Create a new user.
    
    GET: Returns form in modal
    POST: Creates user and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:user_list")
    
    school = request.user.school
    
    if request.method == "GET":
        # Return form for modal
        schools = SchoolInformation.objects.all()
        if school:
            schools = SchoolInformation.objects.filter(pk=school.pk)
        schools = schools.order_by('name')
        
        html = render(request, 'users/partials/user_form.html', {
            'user': None,
            'schools': schools,
            'user_roles': User.ROLES,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Create user
    try:
        with transaction.atomic():
            # Get form data
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            full_name = request.POST.get('full_name', '').strip()
            role = request.POST.get('role', '').strip()
            password = request.POST.get('password', '').strip()
            school_id = request.POST.get('school', '') or None
            
            # Validation
            if not all([username, email, full_name, role]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Check if username already exists
            if User.objects.filter(username=username).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Username already exists.'
                }, status=400)
            
            # Check if email already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Email already exists.'
                }, status=400)
            
            # Get school
            user_school = None
            if school_id:
                try:
                    user_school = SchoolInformation.objects.get(pk=school_id)
                    # Regular admin can only assign to their own school
                    if request.user.role == "admin" and user_school != school:
                        return JsonResponse({
                            'success': False,
                            'error': 'Invalid school selected.'
                        }, status=400)
                except SchoolInformation.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid school selected.'
                    }, status=400)
            elif request.user.role == "admin":
                user_school = school
            
            # Set default password if not provided
            if not password:
                password = "0000"
            
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                full_name=full_name,
                role=role,
                school=user_school,
            )
            
            return JsonResponse({
                'success': True,
                'message': f'User {user.full_name} created successfully.',
                'user_id': user.id
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating user: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def user_edit_view(request, user_id):
    """
    Edit an existing user.
    
    GET: Returns form in modal
    POST: Updates user and returns JSON response
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        messages.error(request, "You don't have permission to perform this action.")
        return redirect("quiz_app:user_list")
    
    school = request.user.school
    
    # Superadmin can access any user, regular admin only their school
    if request.user.role == "superadmin":
        user = get_object_or_404(User, pk=user_id)
    else:
        if not school:
            if request.method == "GET":
                return JsonResponse({'error': 'No school associated with your account'}, status=404)
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        user = get_object_or_404(User, pk=user_id, school=school)
    
    # Additional check (should not be needed but kept for safety)
    if request.user.role != "superadmin" and school and user.school != school:
        if request.method == "GET":
            return JsonResponse({'error': 'User not found'}, status=404)
        return JsonResponse({'error': 'User not found'}, status=404)
    
    # Prevent admin from editing superadmin
    if request.user.role == "admin" and user.role == "superadmin":
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == "GET":
        # Return form for modal
        schools = SchoolInformation.objects.all()
        if school:
            schools = SchoolInformation.objects.filter(pk=school.pk)
        schools = schools.order_by('name')
        
        html = render(request, 'users/partials/user_form.html', {
            'user': user,
            'schools': schools,
            'user_roles': User.ROLES,
        }).content.decode('utf-8')
        
        return JsonResponse({'html': html})
    
    # POST - Update user
    try:
        with transaction.atomic():
            # Get form data
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            full_name = request.POST.get('full_name', '').strip()
            role = request.POST.get('role', '').strip()
            password = request.POST.get('password', '').strip()
            school_id = request.POST.get('school', '') or None
            
            # Validation
            if not all([username, email, full_name, role]):
                return JsonResponse({
                    'success': False,
                    'error': 'Please fill in all required fields.'
                }, status=400)
            
            # Check if username already exists (excluding current user)
            if User.objects.filter(username=username).exclude(pk=user_id).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Username already exists.'
                }, status=400)
            
            # Check if email already exists (excluding current user)
            if User.objects.filter(email=email).exclude(pk=user_id).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Email already exists.'
                }, status=400)
            
            # Get school
            user_school = None
            if school_id:
                try:
                    user_school = SchoolInformation.objects.get(pk=school_id)
                    # Regular admin can only assign to their own school
                    if request.user.role == "admin" and user_school != school:
                        return JsonResponse({
                            'success': False,
                            'error': 'Invalid school selected.'
                        }, status=400)
                except SchoolInformation.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': 'Invalid school selected.'
                    }, status=400)
            elif request.user.role == "admin":
                user_school = school
            
            # Update user
            user.username = username
            user.email = email
            user.full_name = full_name
            user.role = role
            user.school = user_school
            
            # Update password if provided
            if password:
                user.set_password(password)
            
            user.save()
            
            return JsonResponse({
                'success': True,
                'message': f'User {user.full_name} updated successfully.'
            })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error updating user: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def user_delete_view(request, user_id):
    """
    Delete a user.
    """
    if request.user.role not in ["admin", "superadmin"]:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    school = request.user.school
    
    # Superadmin can access any user, regular admin only their school
    if request.user.role == "superadmin":
        user = get_object_or_404(User, pk=user_id)
    else:
        if not school:
            return JsonResponse({'error': 'No school associated with your account'}, status=404)
        user = get_object_or_404(User, pk=user_id, school=school)
    
    # Prevent deleting yourself
    if user == request.user:
        return JsonResponse({
            'success': False,
            'error': 'You cannot delete your own account.'
        }, status=400)
    
    # Ensure user belongs to same school
    if school and user.school != school:
        return JsonResponse({'error': 'User not found'}, status=404)
    
    # Prevent admin from deleting superadmin
    if request.user.role == "admin" and user.role == "superadmin":
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        user_name = user.full_name or user.username
        user.delete()
        return JsonResponse({
            'success': True,
            'message': f'User {user_name} deleted successfully.'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error deleting user: {str(e)}'
        }, status=500)


@login_required
@require_http_methods(["GET", "POST"])
def user_bulk_password_reset_view(request):
    """
    Bulk password reset for users.
    
    GET: Returns bulk password reset modal
    POST: Resets passwords for multiple users to default "0000"
    """
    if request.user.role not in ["admin", "superadmin"]:
        if request.method == "GET":
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == "GET":
        html = render(request, 'users/partials/bulk_password_reset_modal.html').content.decode('utf-8')
        return JsonResponse({'html': html})
    
    # POST - Bulk password reset
    try:
        import json
        data = json.loads(request.body)
        user_ids = data.get('user_ids', [])
        default_password = data.get('default_password', '0000')
        
        if not user_ids:
            return JsonResponse({
                'success': False,
                'error': 'No users selected.'
            }, status=400)
        
        if not default_password:
            default_password = "0000"
        
        school = request.user.school
        users = User.objects.filter(pk__in=user_ids)
        
        if school:
            users = users.filter(school=school)
        
        # Exclude superadmin from regular admin
        if request.user.role == "admin":
            users = users.exclude(role="superadmin")
        
        # Prevent resetting your own password
        users = users.exclude(pk=request.user.pk)
        
        count = users.count()
        if count == 0:
            return JsonResponse({
                'success': False,
                'error': 'No valid users found to reset password.'
            }, status=400)
        
        with transaction.atomic():
            for user in users:
                user.set_password(default_password)
                user.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Password reset successfully for {count} user(s). Default password: {default_password}'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error resetting passwords: {str(e)}'
        }, status=500)

