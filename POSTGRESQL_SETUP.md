# PostgreSQL Setup Guide

This guide will help you set up PostgreSQL for the Quiz App.

## Prerequisites

1. **Install PostgreSQL**

   - Download from: https://www.postgresql.org/download/
   - Install PostgreSQL on your system
   - Remember the postgres user password you set during installation

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Database Setup Steps

### 1. Create PostgreSQL Database

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
-- Create database
CREATE DATABASE quiz_system_db;

-- Create user (optional, you can use the default postgres user)
CREATE USER quiz_user WITH PASSWORD 'your_password';
ALTER ROLE quiz_user SET client_encoding TO 'utf8';
ALTER ROLE quiz_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE quiz_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE quiz_system_db TO quiz_user;
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` file with your database credentials:

```env
DB_NAME=quiz_system_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

### 3. Update settings.py (Optional)

If you prefer not to use environment variables, you can directly edit `quiz_system/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "quiz_system_db",
        "USER": "postgres",
        "PASSWORD": "your_password",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

### 4. Install python-dotenv (Optional - for .env file support)

If you want to use .env files, install python-dotenv:

```bash
pip install python-dotenv
```

Then update `settings.py` to load environment variables:

```python
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
```

### 5. Create Migrations

```bash
python manage.py makemigrations
```

### 6. Run Migrations

```bash
python manage.py migrate
```

### 7. Create Superuser

```bash
python manage.py createsuperuser
```

### 8. Run the Development Server

```bash
python manage.py runserver
```

## Troubleshooting

### Connection Error

If you get a connection error, check:

1. PostgreSQL is running:

   ```bash
   # Windows
   services.msc (check PostgreSQL service)

   # Linux
   sudo systemctl status postgresql
   ```

2. Database credentials are correct
3. Database exists
4. User has proper permissions

### Migration Error

If you get migration errors:

1. Delete migration files (except `__init__.py`) in `quiz_app/migrations/`
2. Run `python manage.py makemigrations` again
3. Run `python manage.py migrate`

### Using SQLite for Development (Alternative)

If you want to use SQLite for development instead:

1. Comment out the PostgreSQL configuration in `settings.py`
2. Uncomment the SQLite configuration
3. Run migrations

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
```
