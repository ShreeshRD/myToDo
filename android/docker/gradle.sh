#!/usr/bin/env bash
# Runs ./gradlew inside the Android SDK container. Usage: docker/gradle.sh assembleDebug testDebugUnitTest lint
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=mytodo-android-build
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build --platform linux/amd64 -t "$IMAGE" docker
docker volume create mytodo-gradle-cache >/dev/null
exec docker run --rm --platform linux/amd64 \
  -v "$PWD":/project -v mytodo-gradle-cache:/gradle-cache \
  -w /project "$IMAGE" ./gradlew --no-daemon --no-watch-fs "$@"
