# Vercel Environment Variables Guide

This guide shows you how to set up all required environment variables for your Django Quiz App on Vercel.

## Quick Setup Methods

### Method 1: Vercel Dashboard (Recommended for First Time)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable below one by one
5. Make sure to select the correct **Environment** (Production, Preview, Development)

### Method 2: Using Scripts (Faster)

**Windows (PowerShell):**

```powershell
.\vercel-env-setup.ps1
```

**Linux/Mac (Bash):**

```bash
chmod +x vercel-env-setup.sh
./vercel-env-setup.sh
```

### Method 3: Vercel CLI (Manual)

```bash
# Login first
vercel login

# Set each variable
vercel env add SECRET_KEY production
vercel env add DATABASE_URL production
vercel env add DEBUG production
vercel env add ALLOWED_HOSTS production
vercel env add SITE_URL production
```

## Required Environment Variables

### 1. SECRET_KEY

**Description**: Django secret key for cryptographic signing

**How to generate:**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Example:**

```
SECRET_KEY=django-insecure-abc123xyz789...
```

**Environment**: Production, Preview, Development

---

### 2. DATABASE_URL

**Description**: Supabase PostgreSQL connection string

**How to get:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection Pooling**
5. Copy **Session mode** connection string
6. Replace `[YOUR-PASSWORD]` with your actual database password

**Format:**

```
postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

**Important Notes:**

- Use **Connection Pooler** URL (port 6543) for Vercel
- Use **Session mode** (not Transaction mode)
- Make sure password is URL-encoded if it contains special characters

**Example:**

```
DATABASE_URL=postgresql://postgres.abc123:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Environment**: Production, Preview, Development

---

### 3. DEBUG

**Description**: Django debug mode (should be False in production)

**Value:**

- Production: `False`
- Preview: `True` (optional, for testing)
- Development: `True`

**Example:**

```
DEBUG=False
```

**Environment**: Production (False), Preview/Development (True)

---

### 4. ALLOWED_HOSTS

**Description**: List of hostnames Django will accept requests from

**How to get:**

- After deploying to Vercel, you'll get a URL like: `your-app.vercel.app`
- Use that domain plus wildcard for preview deployments

**Format:**

```
your-app.vercel.app,*.vercel.app
```

**Example:**

```
ALLOWED_HOSTS=quiz-app.vercel.app,*.vercel.app
```

**Note**: Vercel automatically sets `VERCEL_URL`, which is handled in settings.py

**Environment**: Production, Preview, Development

---

### 5. SITE_URL

**Description**: Base URL for your application (used in emails, links, etc.)

**Format:**

```
https://your-app.vercel.app
```

**Example:**

```
SITE_URL=https://quiz-app.vercel.app
```

**Environment**: Production, Preview, Development

---

## Optional Environment Variables

### DEFAULT_FROM_EMAIL

**Description**: Default email address for system emails

**Example:**

```
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

**Environment**: Production, Preview, Development (optional)

---

### Alternative Database Variables (If not using DATABASE_URL)

If you prefer individual variables instead of DATABASE_URL:

```
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
```

**Note**: `DATABASE_URL` is recommended and easier to manage.

---

## Environment-Specific Values

When setting variables in Vercel, you can set different values for:

- **Production**: Live site (your-app.vercel.app)
- **Preview**: Preview deployments (pull requests, branches)
- **Development**: Local development (when using `vercel dev`)

### Recommended Setup

| Variable        | Production                         | Preview                            | Development             |
| --------------- | ---------------------------------- | ---------------------------------- | ----------------------- |
| `SECRET_KEY`    | Same                               | Same                               | Same                    |
| `DATABASE_URL`  | Same                               | Same                               | Same (or local)         |
| `DEBUG`         | `False`                            | `True`                             | `True`                  |
| `ALLOWED_HOSTS` | `your-app.vercel.app,*.vercel.app` | `your-app.vercel.app,*.vercel.app` | `localhost,127.0.0.1`   |
| `SITE_URL`      | `https://your-app.vercel.app`      | `https://your-app.vercel.app`      | `http://localhost:8000` |

---

## Step-by-Step Setup

### Step 1: Generate Secret Key

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output.

### Step 2: Get Supabase Connection String

1. Go to Supabase Dashboard
2. Settings → Database → Connection Pooling
3. Copy Session mode connection string
4. Replace password placeholder

### Step 3: Deploy to Vercel (First Time)

1. Push code to GitHub
2. Import to Vercel
3. Vercel will create a URL like `your-app.vercel.app`

### Step 4: Set Environment Variables

Use one of the methods above (Dashboard, Script, or CLI)

### Step 5: Redeploy

After setting variables, redeploy:

```bash
vercel --prod
```

Or trigger a new deployment from Vercel Dashboard.

### Step 6: Run Migrations

```bash
vercel run python manage.py migrate
```

---

## Verifying Variables

### Check in Vercel Dashboard

1. Go to **Settings** → **Environment Variables**
2. Verify all variables are set correctly
3. Check that they're enabled for the right environments

### Test Locally

Pull environment variables:

```bash
vercel env pull .env.local
```

Then test:

```bash
python manage.py check --database default
```

---

## Troubleshooting

### Variable Not Working

1. **Redeploy**: Variables only apply to new deployments
2. **Check Environment**: Make sure variable is set for the right environment
3. **Check Spelling**: Variable names are case-sensitive
4. **Check Value**: No extra spaces or quotes

### DATABASE_URL Issues

- Make sure you're using **Connection Pooler** URL (port 6543)
- Verify password is correct
- Check Supabase project is active (not paused)
- See [SUPABASE_CONNECTION_TROUBLESHOOTING.md](./SUPABASE_CONNECTION_TROUBLESHOOTING.md)

### DEBUG Still True

- Make sure you set `DEBUG=False` for Production environment
- Redeploy after changing variables

---

## Quick Reference

Copy this template and fill in your values:

```bash
# Required Variables
SECRET_KEY=your-generated-secret-key-here
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
DEBUG=False
ALLOWED_HOSTS=your-app.vercel.app,*.vercel.app
SITE_URL=https://your-app.vercel.app

# Optional
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

---

## Files Reference

- `vercel.env.example` - Template file with all variables
- `vercel-env-setup.ps1` - PowerShell script for Windows
- `vercel-env-setup.sh` - Bash script for Linux/Mac
- `VERCEL_ENV_VARIABLES.md` - This guide

---

## Next Steps

After setting environment variables:

1. ✅ Verify all variables are set
2. ✅ Redeploy your project
3. ✅ Run database migrations
4. ✅ Test your application
5. ✅ Set up custom domain (optional)

For more help, see [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)
