"""
Utility functions for the quiz application.
"""

from .tenant_utils import (
    get_user_school,
    require_school,
    filter_by_school,
    get_object_or_404_with_school,
)

__all__ = [
    'get_user_school',
    'require_school',
    'filter_by_school',
    'get_object_or_404_with_school',
]




