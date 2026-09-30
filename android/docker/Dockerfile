# Build image for the myToDo Android app: JDK + Android SDK 35 (platform + build-tools).
# amd64 because AGP's aapt2 is x86_64-only; on Apple Silicon it runs under Rosetta/qemu.
FROM --platform=linux/amd64 ghcr.io/cirruslabs/android-sdk:35
ENV GRADLE_USER_HOME=/gradle-cache
WORKDIR /project
