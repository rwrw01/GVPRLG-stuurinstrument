#!/bin/sh
set -eu
DB_PASSWORD="$(cat /run/secrets/db_password)"
if [ -z "$DB_PASSWORD" ]; then
  echo "FATAL: /run/secrets/db_password is leeg of ontbreekt." >&2
  exit 1
fi
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
exec node server.js
