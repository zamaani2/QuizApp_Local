#!/bin/bash
# Script to set Vercel environment variables
# Usage: ./vercel-env-setup.sh
# Make sure you're logged in: vercel login

echo "=========================================="
echo "Vercel Environment Variables Setup"
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "ERROR: Vercel CLI is not installed"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "ERROR: Not logged in to Vercel"
    echo "Login with: vercel login"
    exit 1
fi

echo "This script will help you set environment variables for Vercel"
echo "You'll be prompted to enter values for each variable"
echo ""
read -p "Press Enter to continue..."

# Required variables
echo ""
echo "=== REQUIRED VARIABLES ==="
echo ""

# SECRET_KEY
echo "1. SECRET_KEY (Django secret key)"
echo "   Generate one with: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
read -p "Enter SECRET_KEY: " SECRET_KEY
vercel env add SECRET_KEY production <<< "$SECRET_KEY"
vercel env add SECRET_KEY preview <<< "$SECRET_KEY"
vercel env add SECRET_KEY development <<< "$SECRET_KEY"

# DATABASE_URL
echo ""
echo "2. DATABASE_URL (Supabase connection string)"
echo "   Get from: Supabase Dashboard → Settings → Database → Connection Pooling → Session mode"
read -p "Enter DATABASE_URL: " DATABASE_URL
vercel env add DATABASE_URL production <<< "$DATABASE_URL"
vercel env add DATABASE_URL preview <<< "$DATABASE_URL"
vercel env add DATABASE_URL development <<< "$DATABASE_URL"

# DEBUG
echo ""
echo "3. DEBUG (Set to False for production)"
read -p "Enter DEBUG (default: False): " DEBUG
DEBUG=${DEBUG:-False}
vercel env add DEBUG production <<< "$DEBUG"
vercel env add DEBUG preview <<< "True"
vercel env add DEBUG development <<< "True"

# ALLOWED_HOSTS
echo ""
echo "4. ALLOWED_HOSTS (Your Vercel app domain)"
read -p "Enter ALLOWED_HOSTS (e.g., your-app.vercel.app,*.vercel.app): " ALLOWED_HOSTS
vercel env add ALLOWED_HOSTS production <<< "$ALLOWED_HOSTS"
vercel env add ALLOWED_HOSTS preview <<< "$ALLOWED_HOSTS"
vercel env add ALLOWED_HOSTS development <<< "localhost,127.0.0.1"

# SITE_URL
echo ""
echo "5. SITE_URL (Your Vercel app URL)"
read -p "Enter SITE_URL (e.g., https://your-app.vercel.app): " SITE_URL
vercel env add SITE_URL production <<< "$SITE_URL"
vercel env add SITE_URL preview <<< "$SITE_URL"
vercel env add SITE_URL development <<< "http://localhost:8000"

# Optional variables
echo ""
echo "=== OPTIONAL VARIABLES ==="
echo ""
read -p "Do you want to set DEFAULT_FROM_EMAIL? (y/n): " SET_EMAIL
if [ "$SET_EMAIL" = "y" ] || [ "$SET_EMAIL" = "Y" ]; then
    read -p "Enter DEFAULT_FROM_EMAIL: " DEFAULT_FROM_EMAIL
    vercel env add DEFAULT_FROM_EMAIL production <<< "$DEFAULT_FROM_EMAIL"
    vercel env add DEFAULT_FROM_EMAIL preview <<< "$DEFAULT_FROM_EMAIL"
    vercel env add DEFAULT_FROM_EMAIL development <<< "$DEFAULT_FROM_EMAIL"
fi

echo ""
echo "=========================================="
echo "Environment variables set successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify variables in Vercel Dashboard → Settings → Environment Variables"
echo "2. Redeploy your project: vercel --prod"
echo "3. Run migrations: vercel run python manage.py migrate"
echo ""

