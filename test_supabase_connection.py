"""
Test script to verify Supabase database connection.
Run this to diagnose connection issues before deploying to Vercel.
"""
import os
import sys

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    print("\nPlease set DATABASE_URL in your environment or .env file")
    print("Format: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres")
    sys.exit(1)

print("=" * 60)
print("Testing Supabase Database Connection")
print("=" * 60)
print(f"\nDATABASE_URL: {DATABASE_URL[:50]}...")  # Show first 50 chars for security

try:
    from urllib.parse import urlparse
    url = urlparse(DATABASE_URL)
    
    print(f"\nParsed Connection Details:")
    print(f"  Host: {url.hostname}")
    print(f"  Port: {url.port or '5432 (default)'}")
    print(f"  Database: {url.path[1:] if url.path.startswith('/') else url.path}")
    print(f"  User: {url.username}")
    print(f"  Password: {'*' * len(url.password) if url.password else 'NOT SET'}")
    
    # Test DNS resolution
    print(f"\n1. Testing DNS resolution...")
    import socket
    try:
        ip = socket.gethostbyname(url.hostname)
        print(f"   [OK] DNS resolved: {url.hostname} -> {ip}")
    except socket.gaierror as e:
        print(f"   [FAIL] DNS resolution failed: {e}")
        print(f"\n   This is likely the issue!")
        print(f"   Solutions:")
        print(f"   - Check if Supabase project is active (not paused)")
        print(f"   - Try using Connection Pooler URL (port 6543)")
        print(f"   - Check network/firewall settings")
        print(f"   - Try different DNS servers (8.8.8.8, 1.1.1.1)")
        sys.exit(1)
    
    # Test PostgreSQL connection
    print(f"\n2. Testing PostgreSQL connection...")
    import psycopg2
    
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:] if url.path.startswith("/") else url.path,
        user=url.username,
        password=url.password,
        sslmode='require',
        connect_timeout=10
    )
    
    print(f"   [OK] Connection successful!")
    
    # Test query
    print(f"\n3. Testing database query...")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"   [OK] Query successful!")
    print(f"   PostgreSQL version: {version[:50]}...")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] All tests passed! Your database connection is working.")
    print("=" * 60)
    
except ImportError:
    print("\nERROR: psycopg2 not installed")
    print("Install it with: pip install psycopg2-binary")
    sys.exit(1)
    
except psycopg2.OperationalError as e:
    print(f"\n[FAIL] Connection failed: {e}")
    print("\nCommon issues:")
    print("  - Wrong password")
    print("  - Project is paused (check Supabase dashboard)")
    print("  - Network/firewall blocking connection")
    print("  - Wrong hostname or port")
    sys.exit(1)
    
except Exception as e:
    print(f"\n[ERROR] Unexpected error: {e}")
    print(f"Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

