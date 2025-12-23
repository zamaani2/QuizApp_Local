# Supabase Connection Troubleshooting Guide

## Current Issue

Your system cannot resolve the Supabase hostname `db.emqcixyklluxufekncir.supabase.co`. This is a DNS resolution issue.

## Quick Solutions

### Solution 1: Verify Supabase Project Status ⭐ (Most Common)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Check if your project is **Active** (not paused)
3. If paused, click "Restore project" and wait 1-2 minutes
4. Verify the project is fully provisioned

### Solution 2: Use Connection Pooler URL (Recommended for Vercel)

Supabase provides connection pooler URLs that work better for serverless deployments:

1. Go to **Settings** → **Database** in your Supabase dashboard
2. Scroll to **Connection Pooling** section
3. Copy the **Session mode** connection string (recommended for Django)
4. It will look like:
   ```
   postgresql://postgres.xxx:password@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. **Important**: The port is `6543` (not `5432`) for connection pooler
6. Use this URL as your `DATABASE_URL` in Vercel

### Solution 3: Test DNS Resolution

Test if your system can resolve the hostname:

**Windows PowerShell:**

```powershell
nslookup db.emqcixyklluxufekncir.supabase.co
```

**Windows CMD:**

```cmd
ping db.emqcixyklluxufekncir.supabase.co
```

If this fails, it's a DNS/network issue.

### Solution 4: Check Network/Firewall

1. **Windows Firewall**:

   - Allow outbound connections on port 5432 (or 6543 for pooler)
   - Or temporarily disable to test

2. **Corporate Network**:

   - If on corporate network, it might block external database connections
   - Try from a different network (mobile hotspot, home network)

3. **DNS Settings**:
   - Try using Google DNS: `8.8.8.8` and `8.8.4.4`
   - Or Cloudflare DNS: `1.1.1.1` and `1.0.0.1`
   - Change in Windows Network Settings → Adapter Properties → IPv4 → DNS

### Solution 5: Verify Connection String Format

Make sure your `DATABASE_URL` is correctly formatted:

**Correct format:**

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Common mistakes:**

- ❌ Missing password: `postgresql://postgres@db...` (should have `:password@`)
- ❌ Wrong protocol: `postgres://` (should be `postgresql://`)
- ❌ Extra spaces or quotes in the connection string
- ❌ URL encoding issues with special characters in password

### Solution 6: Test Connection Locally

Create a test script to verify the connection:

```python
# test_supabase_connection.py
import os
import psycopg2
from urllib.parse import urlparse

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

try:
    url = urlparse(DATABASE_URL)
    print(f"Connecting to: {url.hostname}:{url.port or 5432}")
    print(f"Database: {url.path[1:]}")
    print(f"User: {url.username}")

    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:],
        user=url.username,
        password=url.password,
        sslmode='require'
    )
    print("✅ Connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

Run it:

```bash
python test_supabase_connection.py
```

### Solution 7: Use Individual Environment Variables

Instead of `DATABASE_URL`, try using individual variables:

In Vercel, set:

- `DB_HOST=db.emqcixyklluxufekncir.supabase.co`
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASSWORD=your-password`
- `DB_PORT=5432`

This helps isolate which part is causing the issue.

## For Vercel Deployment

### Recommended: Use Connection Pooler

For Vercel (serverless), always use the **Connection Pooler** URL:

1. In Supabase dashboard: **Settings** → **Database** → **Connection Pooling**
2. Copy **Session mode** connection string
3. Port will be `6543` (not `5432`)
4. Use this as `DATABASE_URL` in Vercel

### Why Connection Pooler?

- Better for serverless functions
- Handles connection limits better
- More reliable for Vercel deployments
- Same database, just different connection method

## Still Having Issues?

1. **Check Supabase Status Page**: https://status.supabase.com
2. **Verify Project Region**: Make sure you're using the correct region
3. **Check Supabase Logs**: Dashboard → Logs → Postgres Logs
4. **Contact Supabase Support**: If project is active but still can't connect

## Common Error Messages

| Error                            | Solution                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| "could not translate host name"  | DNS issue - try solutions 1, 3, or 4                           |
| "connection refused"             | Project might be paused - check solution 1                     |
| "password authentication failed" | Wrong password in connection string                            |
| "SSL connection required"        | Add `?sslmode=require` or use settings.py (already configured) |
| "timeout"                        | Network/firewall issue - try solution 4                        |
