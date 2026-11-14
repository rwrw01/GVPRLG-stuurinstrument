#!/usr/bin/env bash
# Deploy gvprlg (Spinnenweb) to VPS-001: build locally, pipe the images over SSH, restart.
# The VPS never receives source code and never builds. Operational config on the VPS
# (/opt/gvprlg/docker-compose.yml, entrypoint scripts, .env, secrets/) is never touched here.
# Usage (Git Bash on the dev laptop): bash scripts/deploy.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash must not rewrite /mnt/c/... paths passed to wsl

APP_NAME="gvprlg-app"
MIGRATE_NAME="gvprlg-migrate"
VPS_HOST="ralph@100.64.0.2"                         # Tailscale
COMPOSE_DIR="/opt/gvprlg"                           # operational dir on VPS
DOMAIN="spinnenweb.gvprlg.nl"
KEYCLOAK_ISSUER="https://auth.athide.nl/realms/gvprlg"
VPS_PLATFORM="arm64"                                # VPS-001 is aarch64 (uname -m)
SSH="${SSH_BIN:-C:/Windows/System32/OpenSSH/ssh.exe} -o BatchMode=yes"   # Windows agent key
DOCKER="${DOCKER_BIN:-wsl -e docker}"               # Docker Engine runs inside WSL

cd "$(git rev-parse --show-toplevel)"
SHA=$(git rev-parse --short HEAD)

echo "== 1. Gate =="
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Tracked files have uncommitted changes — commit first." >&2; exit 1
fi
if [ "$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo 1)" != "0" ]; then
  echo "HEAD $SHA is not on origin/main — push first." >&2; exit 1
fi
npx tsc --noEmit
npx vitest run --reporter=dot

echo "== 2. Build $SHA for linux/$VPS_PLATFORM =="
WSL_DIR=$(wsl -e wslpath -a "$(pwd -W 2>/dev/null || pwd)")
$DOCKER buildx build --platform "linux/$VPS_PLATFORM" --target migrator \
  -t "$MIGRATE_NAME:$SHA" -t "$MIGRATE_NAME:latest" --load "$WSL_DIR"
$DOCKER buildx build --platform "linux/$VPS_PLATFORM" --target runner \
  -t "$APP_NAME:$SHA" -t "$APP_NAME:latest" --load "$WSL_DIR"

echo "== 3. Pipe =="
$DOCKER save "$MIGRATE_NAME:$SHA" "$APP_NAME:$SHA" | gzip | $SSH "$VPS_HOST" "gunzip | docker load"

echo "== 4. Deploy =="
PREV_APP=$($SSH "$VPS_HOST" "docker inspect gvprlg-app --format '{{.Config.Image}}' 2>/dev/null" || echo "none")
PREV_MIGRATE=$($SSH "$VPS_HOST" "docker inspect gvprlg-migrate --format '{{.Config.Image}}' 2>/dev/null" || echo "none")
PREV_APP=${PREV_APP:-none}; PREV_MIGRATE=${PREV_MIGRATE:-none}
echo "previous: app=$PREV_APP migrate=$PREV_MIGRATE"
$SSH "$VPS_HOST" "cd $COMPOSE_DIR && \
  sudo MIGRATE_IMAGE=$MIGRATE_NAME:$SHA APP_IMAGE=$APP_NAME:$SHA docker compose up -d --no-build --remove-orphans && \
  docker image prune -f --filter 'until=72h' >/dev/null"

echo "== 5. Verify =="
ok=0
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "https://$DOMAIN/api/healthz" || echo 000)
  [ "$code" = "200" ] && { ok=1; break; }
  sleep 2
done
verify() {
  [ "$ok" = 1 ] || { echo "healthz never returned 200 over valid TLS"; return 1; }
  local loc
  loc=$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 10 "https://$DOMAIN/api/auth/signin/keycloak" \
    -X POST -H 'Content-Type: application/x-www-form-urlencoded' \
    --data "csrfToken=$(curl -s -c /tmp/gvprlg-deploy.jar "https://$DOMAIN/api/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')" \
    -b /tmp/gvprlg-deploy.jar)
  rm -f /tmp/gvprlg-deploy.jar
  case "$loc" in
    "$KEYCLOAK_ISSUER/protocol/openid-connect/auth"*) echo "login redirects to Keycloak realm gvprlg" ;;
    *) echo "unexpected login redirect: $loc"; return 1 ;;
  esac
}
if verify; then
  echo "Deployed $SHA to https://$DOMAIN"
  exit 0
fi

echo "== 6. Rollback ==" >&2
if [ "$PREV_APP" = "none" ]; then
  echo "No previous version to roll back to; stopping the app container." >&2
  $SSH "$VPS_HOST" "cd $COMPOSE_DIR && sudo docker compose stop app"
else
  $SSH "$VPS_HOST" "cd $COMPOSE_DIR && \
    sudo MIGRATE_IMAGE=$PREV_MIGRATE APP_IMAGE=$PREV_APP docker compose up -d --no-build"
fi
exit 1
