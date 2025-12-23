"""
Superadmin authentication views.

Separate login/logout for superadmin users to keep them isolated from school users.
"""
import logging
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.conf import settings
from django.utils import timezone

from ..models import User
from .auth import get_client_ip

logger = logging.getLogger(__name__)


@csrf_protect
@require_http_methods(["GET", "POST"])
def superadmin_login_view(request):
    """
    Handle superadmin login with separate interface.
    
    Only allows users with role="superadmin" to login.
    Redirects to superadmin dashboard on success.
    """
    # Redirect if already authenticated
    if request.user.is_authenticated:
        if request.user.role == "superadmin":
            return redirect("quiz_app:superadmin_dashboard")
        else:
            # If logged in as non-superadmin, logout first
            logout(request)
            messages.info(request, "Please login with superadmin credentials.")
    
    context = {}
    
    if request.method == "POST":
        identifier = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        remember_me = request.POST.get("remember") == "on"
        
        # Validate input
        if not identifier:
            messages.error(request, "Please enter your username or email.")
            return render(request, "superadmin/login.html", context)
        
        if not password:
            messages.error(request, "Please enter your password.")
            return render(request, "superadmin/login.html", context)
        
        # Get user by username or email
        user_obj = None
        try:
            user_obj = User.get_by_email_or_username(identifier)
        except Exception as e:
            logger.warning(f"Error retrieving user {identifier}: {str(e)}")
            messages.error(request, "Invalid username or password. Please try again.")
            return render(request, "superadmin/login.html", context)
        
        # Check if user is superadmin
        if not user_obj or user_obj.role != "superadmin":
            logger.warning(f"Non-superadmin attempt to access superadmin login: {identifier}")
            messages.error(request, "Access denied. This login is for superadministrators only.")
            return render(request, "superadmin/login.html", context)
        
        # Authenticate user
        user = None
        if user_obj:
            try:
                user = authenticate(
                    request,
                    username=user_obj.username,
                    password=password
                )
            except Exception as e:
                logger.warning(f"Authentication error for user {identifier}: {str(e)}")
                user = None
        
        if user is not None:
            # Double check role
            if user.role != "superadmin":
                messages.error(request, "Access denied. This login is for superadministrators only.")
                return render(request, "superadmin/login.html", context)
            
            # Check if user is active
            if not user.is_active:
                messages.error(
                    request,
                    "Your account has been deactivated. Please contact system administrator."
                )
                return render(request, "superadmin/login.html", context)
            
            # Log the user in
            login(request, user)
            
            # Update last login information
            try:
                ip_address = get_client_ip(request)
                if hasattr(user, "update_last_login"):
                    user.update_last_login(ip_address)
            except Exception as e:
                logger.error(f"Error updating last login for user {user.username}: {str(e)}")
            
            # Set session expiry based on remember me
            if remember_me:
                request.session.set_expiry(2592000)  # 30 days
                request.session.setdefault('remember_me', True)
            else:
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)
                request.session.setdefault('remember_me', False)
            
            # Mark as superadmin session
            request.session['is_superadmin'] = True
            
            # Log successful login
            logger.info(f"Superadmin {user.username} logged in successfully from IP {get_client_ip(request)}")
            
            # Redirect based on next parameter or default superadmin dashboard
            next_url = request.GET.get("next")
            if next_url:
                from django.utils.http import url_has_allowed_host_and_scheme
                if url_has_allowed_host_and_scheme(next_url, allowed_hosts=request.get_host()):
                    return redirect(next_url)
            
            messages.success(request, f"Welcome back, {user.full_name or user.username}!")
            return redirect("quiz_app:superadmin_dashboard")
        else:
            # Log failed login attempt
            logger.warning(f"Failed superadmin login attempt for identifier: {identifier} from IP {get_client_ip(request)}")
            messages.error(request, "Invalid username or password. Please try again.")
    
    # GET request or failed POST - show login form
    return render(request, "superadmin/login.html", context)


@login_required
@require_http_methods(["GET", "POST"])
def superadmin_logout_view(request):
    """
    Handle superadmin logout.
    """
    if request.user.role != "superadmin":
        messages.error(request, "Access denied.")
        return redirect("quiz_app:superadmin_login")
    
    if request.method == "POST":
        # Get user info before logout
        user = request.user
        user_name = getattr(user, "full_name", None) or user.username
        
        # Log logout
        logger.info(f"Superadmin {user.username} logged out from IP {get_client_ip(request)}")
        
        # Logout user
        logout(request)
        
        # Clear session data
        request.session.flush()
        
        messages.success(
            request,
            f"Goodbye, {user_name}! You have been successfully logged out."
        )
        return redirect("quiz_app:superadmin_login")
    
    # GET request - logout immediately
    user = request.user
    user_name = getattr(user, "full_name", None) or user.username
    
    logout(request)
    request.session.flush()
    
    messages.success(
        request,
        f"Goodbye, {user_name}! You have been successfully logged out."
    )
    return redirect("quiz_app:superadmin_login")






