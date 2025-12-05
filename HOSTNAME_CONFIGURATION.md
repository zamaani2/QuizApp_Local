# Hostname Configuration Guide

This guide explains how to configure your Django Quiz App to use a hostname instead of an IP address for client access.

## Overview

By default, the application is configured to accept connections from `localhost` and `127.0.0.1`. To allow clients to connect using a hostname, you need to:

1. Configure the server's hostname
2. Update Django settings to accept the hostname
3. Ensure network connectivity

## Step 1: Set Up Hostname on Server

### Windows Server

1. **Set Computer Name:**

   - Right-click "This PC" → Properties
   - Click "Change settings" → "Change"
   - Enter your desired hostname (e.g., `quiz-server`)
   - Restart if prompted

2. **Configure Network:**
   - Open Network and Sharing Center
   - Ensure your network profile is set to "Private" (not Public)
   - This allows other devices on the network to discover your computer

### Linux Server

```bash
# Set hostname
sudo hostnamectl set-hostname quiz-server

# Add to /etc/hosts (optional, for local resolution)
echo "127.0.0.1 quiz-server" | sudo tee -a /etc/hosts

# Restart network service (if needed)
sudo systemctl restart NetworkManager
```

## Step 2: Configure Django Settings

### Option A: Using .env File (Recommended)

1. **Create `.env` file** in the project root (copy from `.env.example`):

```env
# Allow connections from your hostname
ALLOWED_HOSTS=quiz-server.local,quiz-server,192.168.1.100

# Set the base URL using hostname
SITE_URL=http://quiz-server.local:8000
```

**Note:** Replace `quiz-server` with your actual hostname and `192.168.1.100` with your server's IP address.

2. **Install python-dotenv** (if not already installed):

```bash
pip install python-dotenv
```

### Option B: Set Environment Variables Directly

**Windows (PowerShell):**

```powershell
$env:ALLOWED_HOSTS="quiz-server.local,quiz-server,192.168.1.100"
$env:SITE_URL="http://quiz-server.local:8000"
python manage.py runserver 0.0.0.0:8000
```

**Windows (Command Prompt):**

```cmd
set ALLOWED_HOSTS=quiz-server.local,quiz-server,192.168.1.100
set SITE_URL=http://quiz-server.local:8000
python manage.py runserver 0.0.0.0:8000
```

**Linux/Mac:**

```bash
export ALLOWED_HOSTS="quiz-server.local,quiz-server,192.168.1.100"
export SITE_URL="http://quiz-server.local:8000"
python manage.py runserver 0.0.0.0:8000
```

## Step 3: Run Django Server

**Important:** Use `0.0.0.0` instead of `127.0.0.1` to allow external connections:

```bash
python manage.py runserver 0.0.0.0:8000
```

This makes the server accessible from other devices on your network.

## Step 4: Configure Client Computers

### Windows Clients

1. **Add hostname to hosts file** (if DNS is not configured):

   - Open Notepad as Administrator
   - Open file: `C:\Windows\System32\drivers\etc\hosts`
   - Add line: `192.168.1.100    quiz-server.local`
   - Replace `192.168.1.100` with your server's IP address
   - Save the file

2. **Access the application:**
   - Open browser and navigate to: `http://quiz-server.local:8000`
   - Or use: `http://quiz-server:8000`

### Linux/Mac Clients

1. **Add hostname to hosts file** (if DNS is not configured):

   ```bash
   sudo nano /etc/hosts
   # Add line:
   192.168.1.100    quiz-server.local
   ```

2. **Access the application:**
   - Open browser: `http://quiz-server.local:8000`

## Troubleshooting

### Issue: "DisallowedHost" error

**Solution:** Make sure your hostname is included in `ALLOWED_HOSTS`:

- Check your `.env` file or environment variables
- Verify the hostname matches exactly (case-insensitive)
- Include both the hostname and IP address for flexibility

### Issue: Cannot connect from client

**Solutions:**

1. **Check firewall:** Ensure port 8000 is open

   - Windows: Windows Defender Firewall → Allow an app → Python
   - Linux: `sudo ufw allow 8000`

2. **Verify server is listening on 0.0.0.0:**

   ```bash
   # Should show: 0.0.0.0:8000
   netstat -an | findstr 8000  # Windows
   netstat -an | grep 8000     # Linux/Mac
   ```

3. **Test connectivity:**
   ```bash
   # From client, test if server is reachable
   ping quiz-server.local
   telnet quiz-server.local 8000
   ```

### Issue: Hostname not resolving

**Solutions:**

1. **Use IP address in hosts file** (see Step 4 above)
2. **Configure local DNS** (for advanced users)
3. **Use IP address directly** in `SITE_URL` as fallback:
   ```env
   SITE_URL=http://192.168.1.100:8000
   ```

## Production Considerations

For production environments:

1. **Use a proper domain name** instead of hostname
2. **Set up proper DNS** instead of hosts file
3. **Use HTTPS** with a valid SSL certificate
4. **Set `DEBUG=False`** in production
5. **Use a production WSGI server** (Gunicorn, uWSGI) instead of `runserver`
6. **Configure reverse proxy** (Nginx, Apache) for better security

## Example Configuration

Here's a complete `.env` example for a server named `quiz-server`:

```env
SECRET_KEY=your-production-secret-key
DEBUG=False

# Allow connections from hostname and IP
ALLOWED_HOSTS=quiz-server.local,quiz-server,192.168.1.100,quiz.example.com

# Use hostname in URLs
SITE_URL=http://quiz-server.local:8000

# Database (unchanged)
DB_NAME=quiz_system_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

## Quick Reference

| Setting                  | Purpose                      | Example                           |
| ------------------------ | ---------------------------- | --------------------------------- |
| `ALLOWED_HOSTS`          | Hostnames/IPs Django accepts | `quiz-server.local,192.168.1.100` |
| `SITE_URL`               | Base URL for links/emails    | `http://quiz-server.local:8000`   |
| `runserver 0.0.0.0:8000` | Listen on all interfaces     | Required for network access       |

## Need Help?

If you encounter issues:

1. Check Django logs for specific error messages
2. Verify network connectivity between client and server
3. Ensure firewall allows port 8000
4. Test with IP address first, then move to hostname

