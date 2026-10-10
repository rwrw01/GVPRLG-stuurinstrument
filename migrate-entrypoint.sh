#!/bin/sh
set -eu
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
exec npx prisma migrate deploy
