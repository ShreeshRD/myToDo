#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/backend-springboot/target"
FRONTEND_DIR="$SCRIPT_DIR/frontend-next"
PROD_DIR="/home/arch/programs/personal_organization/todo-prod"
BACKUP_DIR="$PROD_DIR/backups"
SERVICE_NAME="todo-backend.service"

# Always rebuild the frontend first: its postbuild step copies out/ into the
# backend's src/main/resources/static, so Maven must package it afterwards.
# Without this, prod keeps serving whatever UI was last built by hand.
echo "Building frontend..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    (cd "$FRONTEND_DIR" && npm ci)
fi
(cd "$FRONTEND_DIR" && npm run build)

# Always rebuild the backend, even if a jar from a previous build is still in
# target/. This bundles the fresh static assets from the frontend build above.
echo "Building backend..."
(cd "$SCRIPT_DIR/backend-springboot" && ./mvnw clean package -DskipTests)

JAR_FILE=$(find "$TARGET_DIR" -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" -print -quit)

if [ -z "$JAR_FILE" ]; then
    echo "Build finished but no JAR file was found in $TARGET_DIR." >&2
    exit 1
fi

# Ensure destination directories exist
mkdir -p "$PROD_DIR" "$BACKUP_DIR"

# Back up every existing prod jar (its name may differ after a version bump)
# before the new one is moved in.
shopt -s nullglob
for existing in "$PROD_DIR"/*.jar; do
    BACKUP="$BACKUP_DIR/$(basename "$existing")-$(date +%d-%m-%y)"
    # Keep earlier backups from the same day instead of overwriting them.
    if [ -e "$BACKUP" ]; then
        BACKUP="$BACKUP-$(date +%H-%M-%S)"
    fi
    echo "Backing up $(basename "$existing") -> $BACKUP"
    mv "$existing" "$BACKUP"
done
shopt -u nullglob

# Only now that the old jar is safe, move the new one into place.
echo "Installing $(basename "$JAR_FILE") -> $PROD_DIR"
mv "$JAR_FILE" "$PROD_DIR/"

# Prod is always running: restart the user service so it loads the new jar.
if systemctl --user cat "$SERVICE_NAME" >/dev/null 2>&1; then
    echo "Restarting $SERVICE_NAME..."
    systemctl --user restart "$SERVICE_NAME"
    sleep 2
    if systemctl --user is-active --quiet "$SERVICE_NAME"; then
        echo "$SERVICE_NAME is running."
    else
        echo "Warning: $SERVICE_NAME is not active. Check: journalctl --user -u $SERVICE_NAME -n 50" >&2
        exit 1
    fi
else
    echo "Warning: $SERVICE_NAME not found; start the backend manually." >&2
fi
