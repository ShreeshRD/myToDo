#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/backend-springboot/target"
PROD_DIR="/home/arch/programs/personal_organization/todo-prod"

JAR_FILE=$(find "$TARGET_DIR" -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" | head -n 1)

if [ -z "$JAR_FILE" ]; then
    echo "No JAR file found in $TARGET_DIR. Building project..."
    (cd "$SCRIPT_DIR/backend-springboot" && ./mvnw clean package -DskipTests)
    JAR_FILE=$(find "$TARGET_DIR" -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" | head -n 1)
fi

# Ensure destination directory exists and copy the JAR file
mkdir -p "$PROD_DIR"
cp "$JAR_FILE" "$PROD_DIR/"