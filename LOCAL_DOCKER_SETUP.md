# Run the published image locally

This Compose configuration runs `docker.io/cise1/quiz-app:latest` from Docker
Hub with a local PostgreSQL container. It does not build the application from
the source checkout. Runtime settings are read by Compose from the project-root
`.env` file and passed to the containers; secrets are not built into the image.

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

### Docker Desktop

From the project directory:

```powershell
docker compose pull web
docker compose up -d
docker compose logs -f web
```

Open <http://localhost:8000>. To stop the containers without deleting data:

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
