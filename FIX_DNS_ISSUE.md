# Quick Fix for Supabase DNS Issue

## Problem
Your system resolves the hostname but Django/psycopg2 can't connect. This is often due to:
1. IPv6-only resolution (your DNS returns IPv6, but connection needs IPv4)
2. Network/firewall blocking the connection
3. Supabase project might be paused

## Immediate Solutions

### Solution 1: Use Connection Pooler URL (RECOMMENDED) ⭐

The connection pooler URL works better and avoids DNS issues:

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Connection Pooling** section
3. Copy the **Session mode** connection string
4. It will look like:
   ```
   postgresql://postgres.xxx:password@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. **Important**: Port is `6543` (not `5432`)
6. Use this as your `DATABASE_URL`

**Why this works**: Connection pooler uses different hostnames that resolve better.

### Solution 2: Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Check if your project shows as **Active** (green)
3. If it shows **Paused** (gray), click "Restore project"
4. Wait 1-2 minutes for it to become active

### Solution 3: Force IPv4 Resolution

If your system only resolves IPv6, try forcing IPv4:

**Windows PowerShell:**
```powershell
# Test IPv4 connection
Test-NetConnection -ComputerName db.emqcixyklluxufekncir.supabase.co -Port 5432
```

If this fails, the connection is being blocked.

### Solution 4: Use Direct IP (Temporary Test)

1. Get the IPv4 address:
   ```powershell
   Resolve-DnsName db.emqcixyklluxufekncir.supabase.co -Type A
   ```

2. Temporarily modify settings.py to use IP instead of hostname (NOT recommended for production, but good for testing)

### Solution 5: Check Firewall/Network

1. **Windows Firewall**: Temporarily disable to test
2. **Corporate Network**: If on corporate network, try from:
   - Mobile hotspot
   - Home network
   - Different location

3. **Antivirus**: Some antivirus software blocks database connections

### Solution 6: Use Individual Environment Variables

Instead of `DATABASE_URL`, try setting individual variables:

```env
DB_HOST=db.emqcixyklluxufekncir.supabase.co
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
DB_PORT=5432
```

This helps isolate the issue.

## For Vercel Deployment

**Always use Connection Pooler URL for Vercel!**

1. Connection pooler is designed for serverless
2. Better connection handling
3. Avoids DNS issues
4. Port 6543 (not 5432)

## Test Your Fix

After trying a solution, test with:

```bash
python test_supabase_connection.py
```

Or test directly:

```bash
python manage.py check --database default
```

## Most Likely Solution

**90% of the time, the issue is one of these:**

1. ✅ **Use Connection Pooler URL** (port 6543) - This fixes most issues
2. ✅ **Project is paused** - Restore it in Supabase dashboard
3. ✅ **Network/firewall blocking** - Try different network

Try Solution 1 first (Connection Pooler) - it's the most reliable!

