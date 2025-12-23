# Vercel Deployment Guide with Supabase

This guide will walk you through deploying your Django Quiz App to Vercel with Supabase as your database.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. A Supabase account (sign up at [supabase.com](https://supabase.com))
4. Git installed on your local machine

## Step 1: Set Up Supabase Database

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name (e.g., "quiz-app-db")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project" and wait for it to be ready (2-3 minutes)

### 1.2 Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab
4. Copy the connection string. It will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Save this connection string - you'll need it for Vercel

### 1.3 Run Django Migrations on Supabase

You have two options:

**Option A: Run migrations locally (Recommended)**

1. Set your local environment variable:

   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

   # Windows CMD
   set DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

   # Linux/Mac
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

2. Run migrations:

   ```bash
   python manage.py migrate
   ```

3. Create a superuser (optional):
   ```bash
   python manage.py createsuperuser
   ```

**Option B: Run migrations via Vercel CLI (After deployment)**

You can run migrations after deploying to Vercel using Vercel CLI.

## Step 2: Prepare Your Code for Deployment

### 2.1 Commit Your Changes

Make sure all your changes are committed to Git:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
```

### 2.2 Push to GitHub

1. Create a new repository on GitHub (if you haven't already)
2. Push your code:

```bash
git remote add origin https://github.com/yourusername/quiz-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1 Import Your Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Django settings

### 3.2 Configure Environment Variables

In the Vercel project settings, add these environment variables:

**Required Variables:**

1. **SECRET_KEY**

   - Generate a new secret key:
     ```bash
     python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
     ```
   - Or use an online Django secret key generator
   - Value: Your generated secret key

2. **DATABASE_URL**

   - Value: Your Supabase connection string from Step 1.2
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **DEBUG**

   - Value: `False` (for production)

4. **ALLOWED_HOSTS**

   - Value: `your-app.vercel.app,*.vercel.app`
   - Replace `your-app` with your actual Vercel app name

5. **SITE_URL**
   - Value: `https://your-app.vercel.app`
   - Replace with your actual Vercel URL

**Optional Variables:**

- **DEFAULT_FROM_EMAIL**: Your email address for system emails
- **DB_NAME**, **DB_USER**, **DB_PASSWORD**, **DB_HOST**, **DB_PORT**: Only needed if not using DATABASE_URL

### 3.3 Configure Build Settings

Vercel should auto-detect Django, but verify these settings:

- **Framework Preset**: Other
- **Build Command**: Leave empty (Vercel handles this)
- **Output Directory**: Leave empty
- **Install Command**: `pip install -r requirements.txt`

### 3.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-5 minutes)
3. Your app will be live at `https://your-app.vercel.app`

## Step 4: Run Database Migrations

**IMPORTANT**: Run migrations BEFORE or AFTER deployment. The easiest method is to run them locally pointing to your Supabase database.

### Option A: Run Migrations Locally (Easiest - Recommended)

This is the simplest method and doesn't require Vercel CLI:

1. Set your local environment variable to point to Supabase:

   ```powershell
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

2. Run migrations:

   ```bash
   python manage.py migrate
   ```

3. Create a superuser (optional):

   ```bash
   python manage.py createsuperuser
   ```

**Note**: This runs migrations directly on your Supabase database, so they'll be ready when Vercel connects to it.

### Option B: Using Vercel CLI (Requires Node.js)

If you need to run migrations after deployment via Vercel CLI:

**Prerequisites**: Install Node.js first (includes npm):

- Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- Run the installer and restart your terminal
- Verify installation: `node --version` and `npm --version`

Then install Vercel CLI:

```bash
npm i -g vercel
```

1. Login to Vercel:

   ```bash
   vercel login
   ```

2. Link your project:

   ```bash
   vercel link
   ```

3. Pull environment variables:

   ```bash
   vercel env pull .env.local
   ```

4. Run migrations:
   ```bash
   vercel run python manage.py migrate
   ```

### Option C: Using Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Go to **Settings** → **Functions**
3. You can run migrations via Vercel's function logs or use the CLI method above

## Step 5: Set Up Static Files

Vercel automatically serves static files from the `/static` route. The `vercel.json` configuration handles this.

If you need to collect static files:

1. Add a build script or use Vercel CLI:
   ```bash
   vercel run python manage.py collectstatic --noinput
   ```

## Step 6: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test the application:
   - Login functionality
   - Database connections
   - Static files loading
   - Media files (if applicable)

## Troubleshooting

### Database Connection Issues

- **Error**: "SSL connection required"

  - **Solution**: The settings.py already includes SSL mode. Verify your DATABASE_URL is correct.

- **Error**: "Connection refused"
  - **Solution**: Check that your Supabase project is active and the connection string is correct.

### Static Files Not Loading

- **Issue**: CSS/JS files return 404
  - **Solution**: Ensure `vercel.json` is in the root directory and routes are configured correctly.

### Environment Variables Not Working

- **Issue**: App uses default values instead of environment variables
  - **Solution**:
    1. Verify variables are set in Vercel dashboard
    2. Redeploy after adding new variables
    3. Check variable names match exactly (case-sensitive)

### Migration Errors

- **Issue**: Database migrations fail
  - **Solution**:
    1. Ensure DATABASE_URL is set correctly
    2. Run migrations locally first to test
    3. Check Supabase database logs

## Important Notes

1. **Media Files**: Vercel is serverless and doesn't persist files. For production, consider:

   - Using Supabase Storage for media files
   - Using AWS S3 or similar cloud storage
   - Using Cloudinary for images

2. **File Uploads**: If your app handles file uploads, you'll need to configure external storage (Supabase Storage recommended).

3. **Session Storage**: Consider using database-backed sessions or Redis for production.

4. **Email**: Update EMAIL_BACKEND in settings.py for production email sending (SendGrid, AWS SES, etc.).

## Next Steps

1. Set up a custom domain in Vercel
2. Configure email service for production
3. Set up media file storage (Supabase Storage)
4. Enable monitoring and error tracking
5. Set up CI/CD for automatic deployments

## Support Resources

- [Vercel Django Documentation](https://vercel.com/docs/frameworks/django)
- [Supabase Documentation](https://supabase.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)

---

**Need Help?** Check the troubleshooting section or refer to the official documentation links above.
