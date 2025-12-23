"""
Vercel serverless function handler for Django WSGI application.
This file serves as the entry point for all requests to your Django app on Vercel.
"""
import os
import sys
from pathlib import Path

# Add the project root to Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quiz_system.settings")

# Import and get Django WSGI application
from django.core.wsgi import get_wsgi_application

# Get WSGI application - this is what Vercel will use
application = get_wsgi_application()

