"""
Backward compatibility module for views.

This module imports all views from the modular views package
to maintain backward compatibility with any code that imports
directly from quiz_app.views.
"""
# Import all views from the modular structure
from .views import (
    login_view,
    logout_view,
    dashboard_view,
    admin_dashboard_view,
    teacher_dashboard_view,
    student_dashboard_view,
    extend_session_view,
)

__all__ = [
    "login_view",
    "logout_view",
    "dashboard_view",
    "admin_dashboard_view",
    "teacher_dashboard_view",
    "student_dashboard_view",
    "extend_session_view",
]
