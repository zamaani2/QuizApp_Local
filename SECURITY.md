# Credential rotation and deployment security

The repository history contains credential-bearing environment files. Rotate
the following values before relying on deployments that may have used them:

- The Django `SECRET_KEY`.
- The database password, including credentials embedded in a database URL.

Do not copy the previously committed values into new configuration. Generate
replacement secrets in the deployment's secret manager and update the database
credential at the database provider. Rotating `SECRET_KEY` can invalidate
existing signed sessions and tokens.

Removing the environment files from the current Git index does not erase their
contents from earlier commits. Coordinate a history rewrite and remote update
before treating repository history as purged; rotate credentials regardless.

For Vercel, keep `DEBUG` disabled and configure any custom production hostnames
as deployment environment variables. `VERCEL_URL` is also allowed by Django
when the platform supplies it. Do not use wildcard hosts. Keep local secrets in
an ignored `.env` file and configure only explicit local or LAN hostnames in
`ALLOWED_HOSTS`.
