# Run the published image locally

This Compose configuration runs `docker.io/cise1/quiz-app:latest` from Docker
Hub with a local PostgreSQL container. It does not build the application from
the source checkout. Runtime settings are read by Compose from the project-root
`.env` file when present, or from explicitly supplied shell environment
variables. Secrets are not built into the image and the `.env` file is not
required.

## First run

The project-root `.env` is intentionally ignored by Git. For a **brand-new
database volume**, create your own from the template:

```powershell
Copy-Item .env.example .env
$secret = python -c "import secrets; print(secrets.token_urlsafe(64))"
$dbPassword = python -c "import secrets; print(secrets.token_hex(32))"
(Get-Content .env).Replace('SECRET_KEY=', "SECRET_KEY=$secret").Replace('DB_PASSWORD=', "DB_PASSWORD=$dbPassword") | Set-Content -Encoding ascii .env
```

The Compose file requires non-empty `SECRET_KEY` and `DB_PASSWORD`; it will
fail configuration rather than start with a shared placeholder secret. Keep
`.env` private and never commit or send it with the image.

If reusing an existing `postgres_data` volume, do not replace its database
password with a newly generated one. The Postgres image applies
`POSTGRES_PASSWORD` only when the data volume is initialized; the value must
match the password already set for that volume's database user. Rotate that
database password in PostgreSQL before changing `.env`.

### Optional `.env` file

Compose automatically reads a project-root `.env` for variable substitution
when the file exists. It is optional. To use shell-provided values instead,
set the required variables in PowerShell before starting Compose:

```powershell
$env:SECRET_KEY = '<your-generated-secret-key>'
$env:DB_PASSWORD = '<the-password-for-this-database-volume>'
docker compose up -d
```

Set `DB_NAME` and `DB_USER` too if the database volume was initialized with
non-default values. These environment variables take precedence over values
from `.env`.

### Email delivery

Account creation sends a password setup link, never a password. Configure
`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and the
appropriate TLS setting in the ignored `.env` before creating accounts.
`EMAIL_BACKEND` uses SMTP so reset tokens are not printed to console logs.
If SMTP delivery fails, the account remains created; users can request a new
link from the login page's **Forgot your password?** link. Password reset
responses do not reveal whether an email address has an account.

The host port defaults to `8000`. If another local service already uses it,
set `APP_PORT` to an available port (for example `18080`) and update
`CSRF_TRUSTED_ORIGINS` and `SITE_URL` to use that port:

```powershell
$env:APP_PORT = '18080'
$env:CSRF_TRUSTED_ORIGINS = 'http://localhost:18080'
$env:SITE_URL = 'http://localhost:18080'
```

### Docker Desktop

From the project directory:

```powershell
docker compose pull web
docker compose up -d
docker compose logs -f web
```

Open <http://localhost:8000> (or the configured `APP_PORT`). To stop the
containers without deleting data:

```powershell
docker compose down
```

### Podman Desktop

Start the Podman machine in Podman Desktop first, then use its Compose
provider from the project directory:

```powershell
podman compose pull web
podman compose up -d
podman compose logs -f web
```

Podman Compose requires a working Podman machine and a Compose provider. The
exact provider installation/setup depends on the Podman Desktop installation.

## Updating and data

Run `docker compose pull web` (or `podman compose pull web`) before `up -d` to
download the current published `latest` image. Pulling an image does not
rebuild it. Local source edits are not included; use a separate development
Compose configuration with a `build:` section to run local code.

PostgreSQL and uploaded media are stored in named volumes and remain when
containers are stopped or recreated. Do not use `down -v` unless you intend to
delete those volumes and their data. `DB_PASSWORD` initializes the PostgreSQL
user only when its data volume is first created; changing it in `.env` later
does not rotate the password in an existing database.
