from django.conf import settings


def session_settings(request):
    """Add session-related settings to template context"""
    if request.user.is_authenticated:
        session_expiry_seconds = request.session.get_expiry_age()
        session_cookie_age = settings.SESSION_COOKIE_AGE
    else:
        session_expiry_seconds = 0
        session_cookie_age = 0
    
    return {
        "session_expiry_seconds": session_expiry_seconds,
        "session_cookie_age": session_cookie_age,
    }



