#!/bin/sh
set -eu

# Fail fast when an auth secret is missing, unreadable for this user or blank. The app reads
# these files itself (via *_FILE) only on the first auth request, so check them at startup.
require_secret_file() {
  if [ ! -r "$1" ] || ! grep -q '[^[:space:]]' "$1"; then
    echo "FATAL: $1 is missing, unreadable for uid $(id -u) or empty." >&2
    exit 1
  fi
}
require_secret_file "${KEYCLOAK_CLIENT_SECRET_FILE:-/run/secrets/keycloak_client_secret}"
require_secret_file "${NEXTAUTH_SECRET_FILE:-/run/secrets/nextauth_secret}"

DB_PASSWORD="$(cat /run/secrets/db_password)"
if [ -z "$DB_PASSWORD" ]; then
  echo "FATAL: /run/secrets/db_password is leeg of ontbreekt." >&2
  exit 1
fi
case "$DB_PASSWORD" in
  *[!A-Za-z0-9]*)
    echo "FATAL: /run/secrets/db_password bevat tekens buiten [A-Za-z0-9] (bv. / of +), dat breekt de DATABASE_URL. Gebruik 'openssl rand -hex 32'." >&2
    exit 1
    ;;
esac
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
exec node server.js
