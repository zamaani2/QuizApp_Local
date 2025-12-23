"""
Multi-tenant utility functions for enforcing school-based data isolation.

This module provides utilities to ensure all queries are properly filtered by school.
"""
from functools import wraps
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.shortcuts import redirect
from django.contrib import messages


def get_user_school(request):
    """
    Get the current user's school.
    
    Returns:
        SchoolInformation instance or None
    """
    if not request.user.is_authenticated:
        return None
    
    # Superadmins don't have a school, but can access all schools
    if request.user.role == "superadmin":
        return None
    
    return request.user.school


def require_school(view_func):
    """
    Decorator to ensure user has a school assigned (except superadmin).
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.role != "superadmin":
            if not request.user.school:
                messages.error(request, "No school associated with your account.")
                return redirect("quiz_app:dashboard")
        return view_func(request, *args, **kwargs)
    return wrapper


def filter_by_school(queryset, request, school_field='school'):
    """
    Automatically filter a queryset by the user's school.
    
    Args:
        queryset: Django QuerySet to filter
        request: HttpRequest object
        school_field: Name of the school field (default: 'school')
    
    Returns:
        Filtered QuerySet
    """
    school = get_user_school(request)
    
    # Superadmins see all data
    if request.user.role == "superadmin":
        return queryset
    
    # If user has no school, return empty queryset
    if not school:
        return queryset.none()
    
    # Filter by school
    filter_kwargs = {school_field: school}
    return queryset.filter(**filter_kwargs)


def get_object_or_404_with_school(model, request, pk=None, **kwargs):
    """
    Get object or 404, ensuring it belongs to user's school.
    
    Args:
        model: Django model class
        request: HttpRequest object
        pk: Primary key
        **kwargs: Additional filter arguments
    
    Returns:
        Model instance
    
    Raises:
        Http404: If object not found or doesn't belong to school
    """
    from django.shortcuts import get_object_or_404
    
    school = get_user_school(request)
    
    # Superadmins can access any object
    if request.user.role == "superadmin":
        if pk:
            return get_object_or_404(model, pk=pk, **kwargs)
        return get_object_or_404(model, **kwargs)
    
    # Regular users must have school
    if not school:
        from django.http import Http404
        raise Http404("No school associated with your account.")
    
    # Add school filter
    if pk:
        return get_object_or_404(model, pk=pk, school=school, **kwargs)
    return get_object_or_404(model, school=school, **kwargs)






