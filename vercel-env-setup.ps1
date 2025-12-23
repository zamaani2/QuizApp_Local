# PowerShell script to set Vercel environment variables
# Usage: .\vercel-env-setup.ps1
# Make sure you're logged in: vercel login

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Vercel Environment Variables Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
} catch {
    Write-Host "ERROR: Vercel CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $null = vercel whoami 2>&1
} catch {
    Write-Host "ERROR: Not logged in to Vercel" -ForegroundColor Red
    Write-Host "Login with: vercel login" -ForegroundColor Yellow
    exit 1
}

Write-Host "This script will help you set environment variables for Vercel" -ForegroundColor Green
Write-Host "You'll be prompted to enter values for each variable" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"

# Required variables
Write-Host ""
Write-Host "=== REQUIRED VARIABLES ===" -ForegroundColor Yellow
Write-Host ""

# SECRET_KEY
Write-Host "1. SECRET_KEY (Django secret key)" -ForegroundColor Cyan
Write-Host "   Generate one with: python -c `"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())`"" -ForegroundColor Gray
$SECRET_KEY = Read-Host "Enter SECRET_KEY"
echo $SECRET_KEY | vercel env add SECRET_KEY production
echo $SECRET_KEY | vercel env add SECRET_KEY preview
echo $SECRET_KEY | vercel env add SECRET_KEY development

# DATABASE_URL
Write-Host ""
Write-Host "2. DATABASE_URL (Supabase connection string)" -ForegroundColor Cyan
Write-Host "   Get from: Supabase Dashboard → Settings → Database → Connection Pooling → Session mode" -ForegroundColor Gray
$DATABASE_URL = Read-Host "Enter DATABASE_URL"
echo $DATABASE_URL | vercel env add DATABASE_URL production
echo $DATABASE_URL | vercel env add DATABASE_URL preview
echo $DATABASE_URL | vercel env add DATABASE_URL development

# DEBUG
Write-Host ""
Write-Host "3. DEBUG (Set to False for production)" -ForegroundColor Cyan
$DEBUG = Read-Host "Enter DEBUG (default: False)"
if ([string]::IsNullOrWhiteSpace($DEBUG)) { $DEBUG = "False" }
echo $DEBUG | vercel env add DEBUG production
echo "True" | vercel env add DEBUG preview
echo "True" | vercel env add DEBUG development

# ALLOWED_HOSTS
Write-Host ""
Write-Host "4. ALLOWED_HOSTS (Your Vercel app domain)" -ForegroundColor Cyan
$ALLOWED_HOSTS = Read-Host "Enter ALLOWED_HOSTS (e.g., your-app.vercel.app,*.vercel.app)"
echo $ALLOWED_HOSTS | vercel env add ALLOWED_HOSTS production
echo $ALLOWED_HOSTS | vercel env add ALLOWED_HOSTS preview
echo "localhost,127.0.0.1" | vercel env add ALLOWED_HOSTS development

# SITE_URL
Write-Host ""
Write-Host "5. SITE_URL (Your Vercel app URL)" -ForegroundColor Cyan
$SITE_URL = Read-Host "Enter SITE_URL (e.g., https://your-app.vercel.app)"
echo $SITE_URL | vercel env add SITE_URL production
echo $SITE_URL | vercel env add SITE_URL preview
echo "http://localhost:8000" | vercel env add SITE_URL development

# Optional variables
Write-Host ""
Write-Host "=== OPTIONAL VARIABLES ===" -ForegroundColor Yellow
Write-Host ""
$SET_EMAIL = Read-Host "Do you want to set DEFAULT_FROM_EMAIL? (y/n)"
if ($SET_EMAIL -eq "y" -or $SET_EMAIL -eq "Y") {
    $DEFAULT_FROM_EMAIL = Read-Host "Enter DEFAULT_FROM_EMAIL"
    echo $DEFAULT_FROM_EMAIL | vercel env add DEFAULT_FROM_EMAIL production
    echo $DEFAULT_FROM_EMAIL | vercel env add DEFAULT_FROM_EMAIL preview
    echo $DEFAULT_FROM_EMAIL | vercel env add DEFAULT_FROM_EMAIL development
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Environment variables set successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify variables in Vercel Dashboard → Settings → Environment Variables"
Write-Host "2. Redeploy your project: vercel --prod"
Write-Host "3. Run migrations: vercel run python manage.py migrate"
Write-Host ""

