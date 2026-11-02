from django.contrib.auth.views import redirect_to_login
from django.http import HttpResponseForbidden

from .utils.tenant_utils import get_user_school, is_authorized_superadmin


class TenantAccessMiddleware:
    authentication_views = {
        ("quiz_app.views.auth", "login_view"),
        ("quiz_app.views.auth", "logout_view"),
        ("quiz_app.views.superadmin_auth", "superadmin_login_view"),
        ("quiz_app.views.superadmin_auth", "superadmin_logout_view"),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        user = request.user
        view_module = getattr(view_func, "__module__", "")
        view_name = getattr(view_func, "__name__", "")

        if view_module.startswith("quiz_app.views"):
            if (view_module, view_name) in self.authentication_views:
                return None
            if not getattr(user, "is_authenticated", False):
                return redirect_to_login(request.get_full_path())
            if is_authorized_superadmin(user):
                return None
            if get_user_school(request) is None:
                return HttpResponseForbidden(
                    "A valid school association is required."
                )

        if request.path_info.startswith("/admin/") and request.path_info not in {
            "/admin/login/",
            "/admin/login",
        }:
            if getattr(user, "is_authenticated", False) and not (
                is_authorized_superadmin(user)
                and getattr(user, "is_staff", False)
            ):
                return HttpResponseForbidden("Django admin access is restricted.")

        return None
