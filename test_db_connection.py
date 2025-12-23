"""Test script to diagnose Supabase database connection"""
import os
import sys

# Test 1: Direct connection with individual parameters
print("=" * 60)
print("Test 1: Direct connection with individual parameters")
print("=" * 60)

try:
    import psycopg2
    
    conn_params = {
        'host': 'db.emqcixyklluxufekncir.supabase.co',
        'database': 'postgres',
        'user': 'postgres',
        'password': 'Sakora@12@1',
        'port': 5432,
        'connect_timeout': 10,
    }
    
    print(f"Attempting to connect to: {conn_params['host']}")
    conn = psycopg2.connect(**conn_params)
    print("[SUCCESS] Connection successful!")
    conn.close()
except Exception as e:
    print(f"[FAILED] Connection failed: {e}")
    print(f"Error type: {type(e).__name__}")

# Test 2: Connection string format
print("\n" + "=" * 60)
print("Test 2: Connection string format (URL-encoded password)")
print("=" * 60)

try:
    import urllib.parse
    encoded_password = urllib.parse.quote('Sakora@12@1', safe='')
    conn_string = f"postgresql://postgres:{encoded_password}@db.emqcixyklluxufekncir.supabase.co:5432/postgres?sslmode=require"
    print(f"Connection string: postgresql://postgres:***@db.emqcixyklluxufekncir.supabase.co:5432/postgres")
    conn = psycopg2.connect(conn_string)
    print("[SUCCESS] Connection successful!")
    conn.close()
except Exception as e:
    print(f"[FAILED] Connection failed: {e}")
    print(f"Error type: {type(e).__name__}")

# Test 3: Check DNS resolution
print("\n" + "=" * 60)
print("Test 3: DNS Resolution Check")
print("=" * 60)

try:
    import socket
    hostname = 'db.emqcixyklluxufekncir.supabase.co'
    print(f"Resolving hostname: {hostname}")
    
    # Try IPv4
    try:
        ipv4 = socket.gethostbyname(hostname)
        print(f"[SUCCESS] IPv4 address: {ipv4}")
    except socket.gaierror as e:
        print(f"[FAILED] IPv4 resolution failed: {e}")
    
    # Try IPv6
    try:
        ipv6 = socket.getaddrinfo(hostname, 5432, socket.AF_INET6)[0][4][0]
        print(f"[SUCCESS] IPv6 address: {ipv6}")
    except Exception as e:
        print(f"[FAILED] IPv6 resolution failed: {e}")
        
except Exception as e:
    print(f"[FAILED] DNS check failed: {e}")

print("\n" + "=" * 60)
print("Recommendations:")
print("=" * 60)
print("1. Verify your Supabase project is active and fully provisioned")
print("2. Check if you need to use Connection Pooling URL instead")
print("3. Verify your database password is correct")
print("4. Check Windows firewall settings")
print("5. Try using Supabase's connection pooler: aws-0-[region].pooler.supabase.com")
print("=" * 60)

