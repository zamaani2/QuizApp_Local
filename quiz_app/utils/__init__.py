"""
Utility functions for the quiz application.
"""

from .tenant_utils import (
    is_authorized_superadmin,
    get_user_school,
    require_school,
    filter_by_school,
    get_object_or_404_with_school,
)

__all__ = [
    'is_authorized_superadmin',
    'get_user_school',
    'require_school',
    'filter_by_school',
    'get_object_or_404_with_school',
]





