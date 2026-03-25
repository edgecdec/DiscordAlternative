#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/DiscordAlternative"
LOG="/var/log/webhook_deploy_discord.log"
LOCK="/tmp/deploy_discord.lock"
PM2_NAME="discord-alt"

exec >> "$LOG" 2>&1
echo "=========================================="
echo "Deploy started: $(date)"

# Lock to prevent concurrent deploys
if [ -f "$LOCK" ]; then
  echo "Deploy already in progress, exiting."
  exit 0
fi
trap 'rm -f "$LOCK"' EXIT
touch "$LOCK"

cd "$APP_DIR"

# Capture current package.json hash before pull
OLD_PKG_HASH=$(md5sum package.json 2>/dev/null | cut -d' ' -f1 || echo "none")

git fetch origin main
git reset --hard origin/main

NEW_PKG_HASH=$(md5sum package.json | cut -d' ' -f1)

if [ "$OLD_PKG_HASH" != "$NEW_PKG_HASH" ]; then
  echo "package.json changed, running npm install..."
  npm install
fi

npx prisma generate
npx prisma migrate deploy

rm -rf .next
npm run build

pm2 restart "$PM2_NAME"

echo "Deploy finished: $(date)"
echo "=========================================="
