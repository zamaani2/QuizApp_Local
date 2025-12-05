"""
Authentication views for user login and logout.

This module provides secure and modular authentication views with:
- Improved error handling
- Security best practices
- Session management
- IP address tracking
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
from django.http import JsonResponse

from ..models import User

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Get the client's IP address from the request.
    
    Args:
        request: Django HttpRequest object
        
    Returns:
        str: IP address or empty string if not found
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip.strip()


@csrf_protect
@require_http_methods(["GET", "POST"])
def login_view(request):
    """
    Handle user login with improved security and error handling.
    
    Features:
    - Supports both username and email login
    - Remember me functionality
    - IP address tracking
    - Secure session management
    - Proper error messages
    - Redirects authenticated users
    """
    # Redirect if already authenticated
    if request.user.is_authenticated:
        return redirect("quiz_app:dashboard")

    context = {}
    
    if request.method == "POST":
        identifier = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        remember_me = request.POST.get("remember") == "on"
        
        # Validate input
        if not identifier:
            messages.error(request, "Please enter your username or email.")
            return render(request, "auth/login.html", context)
        
        if not password:
            messages.error(request, "Please enter your password.")
            return render(request, "auth/login.html", context)
        
        # Get user by username or email
        user_obj = None
        try:
            user_obj = User.get_by_email_or_username(identifier)
        except Exception as e:
            logger.warning(f"Error retrieving user {identifier}: {str(e)}")
            messages.error(request, "Invalid username or password. Please try again.")
            return render(request, "auth/login.html", context)
        
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
            # Check if user is active
            if not user.is_active:
                messages.error(
                    request,
                    "Your account has been deactivated. Please contact an administrator."
                )
                return render(request, "auth/login.html", context)
            
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
                # 30 days in seconds
                request.session.set_expiry(2592000)
                request.session.setdefault('remember_me', True)
            else:
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)
                request.session.setdefault('remember_me', False)
            
            # Log successful login
            logger.info(f"User {user.username} logged in successfully from IP {get_client_ip(request)}")
            
            # Redirect based on user role
            # Superadmins should use superadmin login, redirect them there
            if user.role == "superadmin":
                messages.warning(request, "Please use the superadmin login page.")
                logout(request)
                return redirect("quiz_app:superadmin_login")
            
            # Redirect based on next parameter or default dashboard
            next_url = request.GET.get("next")
            if next_url:
                # Security: Only redirect to same domain
                from django.utils.http import url_has_allowed_host_and_scheme
                if url_has_allowed_host_and_scheme(next_url, allowed_hosts=request.get_host()):
                    return redirect(next_url)
            
            messages.success(request, f"Welcome back, {user.full_name or user.username}!")
            return redirect("quiz_app:dashboard")
        else:
            # Log failed login attempt
            logger.warning(f"Failed login attempt for identifier: {identifier} from IP {get_client_ip(request)}")
            messages.error(request, "Invalid username or password. Please try again.")
    
    # GET request or failed POST - show login form
    return render(request, "auth/login.html", context)


@login_required
@require_http_methods(["GET", "POST"])
def logout_view(request):
    """
    Handle user logout with proper session cleanup.
    
    Features:
    - Personalized logout message
    - Proper session cleanup
    - Security logging
    """
    if request.method == "POST":
        # Get user info before logout
        user = request.user
        user_name = getattr(user, "full_name", None) or user.username
        
        # Log logout
        logger.info(f"User {user.username} logged out from IP {get_client_ip(request)}")
        
        # Logout user
        logout(request)
        
        # Clear session data
        request.session.flush()
        
        messages.success(
            request,
            f"Goodbye, {user_name}! You have been successfully logged out."
        )
        return redirect("quiz_app:login")
    
    # GET request - show logout confirmation or redirect
    # For security, we can require POST, but for better UX, we'll allow GET
    user = request.user
    user_name = getattr(user, "full_name", None) or user.username
    
    logout(request)
    request.session.flush()
    
    messages.success(
        request,
        f"Goodbye, {user_name}! You have been successfully logged out."
    )
    return redirect("quiz_app:login")

