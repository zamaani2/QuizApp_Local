# Fixing 404 NOT_FOUND Error on Vercel

## Problem
You're getting a `404: NOT_FOUND` error when accessing your Django app on Vercel.

## Solution

I've created the proper API handler structure for Vercel. Here's what was changed:

### 1. Created `api/index.py`
This is the serverless function entry point that Vercel expects. It:
- Sets up the Django environment
- Exports the WSGI application as `application`
- Vercel's Python runtime will automatically use this

### 2. Updated `vercel.json`
Changed the build source from `quiz_system/wsgi.py` to `api/index.py` to match Vercel's expected structure.

## Next Steps

### 1. Commit and Push Changes
```bash
git add api/index.py vercel.json
git commit -m "Fix Vercel 404 error - add API handler"
git push
```

### 2. Redeploy on Vercel
- Vercel will automatically redeploy when you push to your connected branch
- Or manually trigger a redeploy from Vercel Dashboard

### 3. Verify Environment Variables
Make sure all required environment variables are set in Vercel:
- `SECRET_KEY`
- `DATABASE_URL`
- `DEBUG=False`
- `ALLOWED_HOSTS`
- `SITE_URL`

### 4. Check Deployment Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check the build logs for any errors

## Common Issues

### Still Getting 404?

1. **Check Build Logs**: Look for Python import errors or Django setup issues
2. **Verify Environment Variables**: Make sure `DATABASE_URL` is set correctly
3. **Check ALLOWED_HOSTS**: Should include your Vercel domain
4. **Database Connection**: Ensure Supabase connection is working

### Build Fails?

1. **Python Version**: Ensure `PYTHON_VERSION` is set to `3.11` in vercel.json
2. **Dependencies**: Check that all packages in `requirements.txt` are compatible
3. **Import Errors**: Verify all Django apps are properly configured

### Application Loads but Shows Errors?

1. **Run Migrations**: 
   ```bash
   vercel run python manage.py migrate
   ```

2. **Check Database**: Verify Supabase connection is working
3. **Check Logs**: Look at Vercel function logs for runtime errors

## Testing Locally

You can test the Vercel setup locally:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run locally
vercel dev
```

This will simulate the Vercel environment locally.

## File Structure

After the fix, your project should have:

```
.
├── api/
│   └── index.py          # Vercel serverless function handler
├── quiz_system/
│   ├── wsgi.py           # Django WSGI (used by api/index.py)
│   └── settings.py
├── vercel.json           # Vercel configuration
└── requirements.txt
```

## Additional Notes

- The `api/index.py` file is the entry point for all requests
- Static files are handled by Vercel's static file serving (configured in vercel.json)
- Media files need external storage (Supabase Storage recommended)
- Database migrations must be run after deployment

## Still Having Issues?

1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure database connection is working
4. Check that migrations have been run
5. Review [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed setup

