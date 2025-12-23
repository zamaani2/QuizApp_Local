# Quick Start Checklist - Vercel + Supabase Deployment

## ✅ Pre-Deployment Checklist

- [ ] Code is committed to Git
- [ ] Repository is pushed to GitHub
- [ ] Supabase project is created
- [ ] Database connection string is obtained from Supabase
- [ ] Django secret key is generated

## 🚀 Deployment Steps

### 1. Supabase Setup (5 minutes)
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Copy database connection string from Settings → Database
- [ ] Test connection locally (optional but recommended)

### 2. Vercel Setup (10 minutes)
- [ ] Sign in to [vercel.com](https://vercel.com)
- [ ] Import your GitHub repository
- [ ] Add environment variables:
  - [ ] `SECRET_KEY` (generate using: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
  - [ ] `DATABASE_URL` (from Supabase)
  - [ ] `DEBUG=False`
  - [ ] `ALLOWED_HOSTS=your-app.vercel.app,*.vercel.app`
  - [ ] `SITE_URL=https://your-app.vercel.app`
- [ ] Deploy project

### 3. Post-Deployment (5 minutes)
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Link project: `vercel link`
- [ ] Run migrations: `vercel run python manage.py migrate`
- [ ] Create superuser (if needed): `vercel run python manage.py createsuperuser`

### 4. Verification
- [ ] Visit your Vercel URL
- [ ] Test login functionality
- [ ] Verify static files load correctly
- [ ] Check database operations work

## 📝 Environment Variables Reference

Add these in Vercel Dashboard → Settings → Environment Variables:

```
SECRET_KEY=your-generated-secret-key
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
DEBUG=False
ALLOWED_HOSTS=your-app.vercel.app,*.vercel.app
SITE_URL=https://your-app.vercel.app
```

## 🔧 Common Commands

```bash
# Generate Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Run migrations on Vercel
vercel run python manage.py migrate

# Create superuser on Vercel
vercel run python manage.py createsuperuser

# View Vercel logs
vercel logs
```

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions.

## ⚠️ Important Notes

1. **Media Files**: Vercel doesn't persist files. Use Supabase Storage for file uploads.
2. **Email**: Configure production email backend (SendGrid, AWS SES, etc.)
3. **Sessions**: Consider database-backed sessions for production
4. **Custom Domain**: Set up in Vercel dashboard after initial deployment

## 🆘 Need Help?

- Check [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) troubleshooting section
- [Vercel Django Docs](https://vercel.com/docs/frameworks/django)
- [Supabase Docs](https://supabase.com/docs)

