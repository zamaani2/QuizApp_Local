# Quick Setup Instructions for PostgreSQL

## Step 1: Install PostgreSQL (if not already installed)

Download and install PostgreSQL from: https://www.postgresql.org/download/windows/

During installation, remember the password you set for the `postgres` user.

## Step 2: Create the Database

Open **pgAdmin** (comes with PostgreSQL) or use **psql** command line:

### Using pgAdmin:

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name: `quiz_system_db`
5. Click "Save"

### Using psql (Command Line):

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE quiz_system_db;

# Exit psql
\q
```

## Step 3: Configure Database Credentials

You have two options:

### Option A: Edit settings.py directly (Easiest)

Edit `quiz_system/settings.py` and update the database configuration:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "quiz_system_db",
        "USER": "postgres",
        "PASSWORD": "your_postgres_password_here",  # Change this!
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

### Option B: Use .env file (Recommended for production)

1. Create a `.env` file in the project root:

```env
DB_NAME=quiz_system_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_HOST=localhost
DB_PORT=5432
```

2. The settings.py already reads from environment variables, so no changes needed!

## Step 4: Run Migrations

```bash
python manage.py migrate
```

## Step 5: Create Superuser

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user.

## Step 6: Run the Server

```bash
python manage.py runserver
```

Visit http://127.0.0.1:8000/admin/ to login with your superuser credentials.

## Troubleshooting

### "password authentication failed"

- Check that your PostgreSQL password is correct
- Make sure PostgreSQL service is running
- Verify the database name, user, and host are correct

### "database does not exist"

- Create the database using the steps in Step 2
- Make sure the database name matches in settings.py

### "connection refused"

- Make sure PostgreSQL service is running
- Check that the port (5432) is correct
- Verify PostgreSQL is listening on localhost

### To check if PostgreSQL is running (Windows):

1. Open Services (Win + R, type `services.msc`)
2. Look for "postgresql-x64-XX" service
3. Make sure it's "Running"

### Alternative: Use SQLite for Development

If you want to use SQLite instead (simpler for development):

1. In `quiz_system/settings.py`, comment out the PostgreSQL config
2. Uncomment the SQLite config:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
```

3. Run migrations: `python manage.py migrate`


