"""Test a PostgreSQL connection supplied through DATABASE_URL."""

import os
import socket
import sys
from urllib.parse import urlparse


def main():
    try:
        import psycopg2
    except ImportError:
        print("Install psycopg2 to run this connection check.")
        return 2

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print(
            "Set DATABASE_URL to a PostgreSQL connection URI before running this check."
        )
        return 2

    parsed_url = urlparse(database_url)
    if parsed_url.scheme not in ("postgres", "postgresql") or not parsed_url.hostname:
        print("DATABASE_URL must be a PostgreSQL connection URI with a hostname.")
        return 2

    try:
        addresses = socket.getaddrinfo(
            parsed_url.hostname, parsed_url.port or 5432, type=socket.SOCK_STREAM
        )
    except socket.gaierror as exc:
        print(f"[FAILED] DNS resolution failed ({type(exc).__name__}).")
        return 1

    print(f"[SUCCESS] DNS resolved to {len(addresses)} address record(s).")

    try:
        with psycopg2.connect(database_url, connect_timeout=10):
            pass
    except psycopg2.Error as exc:
        print(f"[FAILED] PostgreSQL connection failed ({type(exc).__name__}).")
        return 1

    print("[SUCCESS] PostgreSQL connection successful.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
