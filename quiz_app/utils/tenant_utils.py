"""
Multi-tenant utility functions for enforcing school-based data isolation.

This module provides utilities to ensure all queries are properly filtered by school.
"""
from functools import wraps
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.contrib.auth.views import redirect_to_login


def is_authorized_superadmin(user):
    """Return whether an active authenticated user has the superadmin role."""
    return (
        getattr(user, "is_authenticated", False)
        and getattr(user, "is_active", False)
        and getattr(user, "role", None) == "superadmin"
    )


def _get_valid_school_user_school(user):
    if not getattr(user, "is_authenticated", False) or not getattr(
        user, "is_active", False
    ):
        return None

    school = getattr(user, "school", None)
    if school is None:
        return None

    role = getattr(user, "role", None)
    if role == "admin":
        return school
    if role == "teacher":
        profile = getattr(user, "teacher_profile", None)
        if profile is not None and profile.school_id == school.pk:
            return school
    elif role == "student":
        profile = getattr(user, "student_profile", None)
        if profile is not None and profile.school_id == school.pk:
            return school

    return None


def get_user_school(request):
    """
    Get the current user's school.
    
    Returns:
        SchoolInformation instance or None
    """
    if is_authorized_superadmin(request.user):
        return None

    return _get_valid_school_user_school(request.user)


def get_write_school(request, target_school_id=None):
    """Resolve the school for a tenant write without widening missing scope."""
    user = request.user
    if is_authorized_superadmin(user):
        school_id = (
            target_school_id
            or request.POST.get("school_id")
            or request.POST.get("school")
        )
        if not school_id:
            return None

        from ..models import SchoolInformation

        school = SchoolInformation.objects.filter(
            pk=school_id,
            is_active=True,
        ).first()
        return school

    school = _get_valid_school_user_school(user)
    if school is None or not getattr(school, "is_active", False):
        return None
    return school


def require_school(view_func):
    """
    Decorator to ensure user has a school assigned (except superadmin).
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return redirect_to_login(request.get_full_path())
        if not is_authorized_superadmin(user) and not _get_valid_school_user_school(
            user
        ):
            raise PermissionDenied("A valid school association is required.")
        return view_func(request, *args, **kwargs)

    return wrapper


def filter_by_school(queryset, request, school_field="school"):
    """
    Automatically filter a queryset by the user's school.
    
    Args:
        queryset: Django QuerySet to filter
        request: HttpRequest object
        school_field: Name of the school field (default: 'school')
    
    Returns:
        Filtered QuerySet
    """
    if is_authorized_superadmin(request.user):
        return queryset

    school = _get_valid_school_user_school(request.user)
    if not school:
        return queryset.none()

    filter_kwargs = {school_field: school}
    return queryset.filter(**filter_kwargs)


def get_object_or_404_with_school(
    model, request, pk=None, school_field="school", **kwargs
):
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
    user = request.user
    if is_authorized_superadmin(user):
        if pk is not None:
            return get_object_or_404(model, pk=pk, **kwargs)
        return get_object_or_404(model, **kwargs)

    school = _get_valid_school_user_school(user)
    if school is None:
        raise Http404("Object not found.")

    kwargs[school_field] = school
    if pk is not None:
        kwargs["pk"] = pk
    return get_object_or_404(model, **kwargs)
