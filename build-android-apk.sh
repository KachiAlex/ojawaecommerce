#!/bin/bash

# Build Ojawa Android APK using Docker
# This script builds the React web app and Android APK in Docker

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BUILD_TYPE="${1:-release}"
NO_CACHE="${2:-}"

# Functions
print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Check if Docker is installed
print_info "🔍 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "❌ Docker not found. Please install Docker."
    exit 1
fi

DOCKER_VERSION=$(docker --version)
print_success "✅ Docker found: $DOCKER_VERSION"

# Get workspace root
WORKSPACE_ROOT=$(pwd)
print_info "📁 Workspace root: $WORKSPACE_ROOT"

# Create output directory
OUTPUT_DIR="$WORKSPACE_ROOT/build-artifacts"
mkdir -p "$OUTPUT_DIR"
print_info "📁 Output directory: $OUTPUT_DIR"

# Build Docker image
print_info "🔨 Building Docker image..."
CACHE_FLAG=""
if [ "$NO_CACHE" == "--no-cache" ]; then
    CACHE_FLAG="--no-cache"
fi

docker build -f Dockerfile.android -t ojawa-android-builder:latest $CACHE_FLAG .

if [ $? -ne 0 ]; then
    print_error "❌ Docker build failed"
    exit 1
fi

print_success "✅ Docker image built successfully"

# Run Docker container
print_info "🚀 Starting Docker container to build APK..."
print_info "  Build type: $BUILD_TYPE"
print_info "  Output directory: $OUTPUT_DIR"

docker run --rm \
  -v "$OUTPUT_DIR":/output \
  -e BUILD_VARIANT="$BUILD_TYPE" \
  -e GRADLE_OPTS='-Xmx4096m' \
  ojawa-android-builder:latest

if [ $? -ne 0 ]; then
    print_error "❌ Build failed inside container"
    exit 1
fi

# Check if APK was created
print_info "
📦 Checking for generated APKs..."

if ls "$OUTPUT_DIR"/*.apk 1> /dev/null 2>&1; then
    print_success "✅ APK(s) generated successfully:
"
    for apk in "$OUTPUT_DIR"/*.apk; do
        SIZE=$(du -h "$apk" | cut -f1)
        print_success "  📱 $(basename $apk) ($SIZE)"
    done
else
    print_error "❌ No APK files found in output directory"
    print_info "Build artifacts may be in: $OUTPUT_DIR"
fi

print_success "
✅ Build process completed!"
print_info "
📍 Output location: $OUTPUT_DIR"
print_info "
💡 Next steps:
   1. Install the APK on an Android device or emulator
   2. For device: adb install -r $OUTPUT_DIR/*.apk
   3. For emulator: Use Android Studio's device manager"

exit 0
