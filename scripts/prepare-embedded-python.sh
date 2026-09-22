#!/usr/bin/env bash
# PulseJam - Prepare Embedded Standalone Python Runtime for Tauri Packaging
# Downloads python-build-standalone (aarch64-apple-darwin), installs dependencies,
# and stages runtime and scripts into src-tauri/resources/
#
# IDEMPOTENT: Safe to call on every build. Each step is skipped if already done:
#   - Step 1: CPython tarball skipped if build/staging/python/bin/python3 exists
#   - Step 2: pip install skipped if magenta_rt is already importable
#   - Step 4: Resource copy skipped if src-tauri/resources/python-runtime/bin/python3 exists
#             (force re-copy by deleting src-tauri/resources/python-runtime manually)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PYTHON_TAG="20260807"
PYTHON_VERSION="cpython-3.11.15+20260807-aarch64-apple-darwin-install_only.tar.gz"
DOWNLOAD_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PYTHON_TAG}/cpython-3.11.15%2B${PYTHON_TAG}-aarch64-apple-darwin-install_only.tar.gz"

STAGING_DIR="$PROJECT_ROOT/build/staging"
PYTHON_STAGING="$STAGING_DIR/python"
RESOURCES_DIR="$PROJECT_ROOT/src-tauri/resources"

# If python-runtime is already staged and ready in src-tauri/resources, refresh sidecar script and exit 0
if [ -f "$RESOURCES_DIR/python-runtime/bin/python3" ]; then
    echo "=== [SKIP] python-runtime already staged at $RESOURCES_DIR/python-runtime ==="
    mkdir -p "$RESOURCES_DIR/scripts/sidecar"
    cp "$PROJECT_ROOT/scripts/sidecar/sidecar_server.py" "$RESOURCES_DIR/scripts/sidecar/sidecar_server.py"
    echo "=== Standalone Python Runtime verified in $RESOURCES_DIR/python-runtime ==="
    exit 0
fi

echo "=== [1/4] Preparing Staging Directory ==="
mkdir -p "$STAGING_DIR"

if [ ! -f "$PYTHON_STAGING/bin/python3" ]; then
    echo "Downloading standalone CPython build (${PYTHON_TAG})..."
    cd "$STAGING_DIR"
    curl -L -o "$PYTHON_VERSION" "$DOWNLOAD_URL"
    tar -xzf "$PYTHON_VERSION"
else
    echo "[SKIP] CPython already extracted at $PYTHON_STAGING/bin/python3"
fi

echo "=== [2/4] Verifying/Installing Dependencies into Standalone Interpreter ==="
if "$PYTHON_STAGING/bin/python3" -c "from magenta_rt import MagentaRT2StdMlxfn" 2>/dev/null; then
    echo "[SKIP] magenta_rt already importable — pip install skipped"
else
    echo "Running pip install for all dependencies..."
    "$PYTHON_STAGING/bin/python3" -m pip install --upgrade pip
    "$PYTHON_STAGING/bin/python3" -m pip install \
        mlx==0.32.0 \
        mlx-lm==0.31.3 \
        ai-edge-litert==2.1.6 \
        websockets==17.0.1 \
        soundfile scipy psutil numpy absl-py requests protobuf \
        jax jaxlib einops google-cloud-storage jaxtyping librosa resampy \
        simple-term-menu "typeguard==2.13.3" recurrentgemma
    echo "Installing magenta-realtime package..."
    "$PYTHON_STAGING/bin/python3" -m pip install "$PROJECT_ROOT/experiments/mrt2-sanity-check/magenta-realtime"
fi

echo "=== [3/4] Testing Embedded Interpreter Imports ==="
"$PYTHON_STAGING/bin/python3" -c "import mlx.core as mx; print('MLX GPU Device:', mx.default_device()); from magenta_rt import MagentaRT2StdMlxfn; print('MagentaRT2StdMlxfn imported successfully!')"

echo "=== [4/4] Staging Resources to src-tauri/resources ==="
if [ -f "$RESOURCES_DIR/python-runtime/bin/python3" ]; then
    echo "[SKIP] python-runtime already staged at $RESOURCES_DIR/python-runtime"
    # Always refresh sidecar_server.py (cheap single-file copy)
    mkdir -p "$RESOURCES_DIR/scripts/sidecar"
    cp "$PROJECT_ROOT/scripts/sidecar/sidecar_server.py" "$RESOURCES_DIR/scripts/sidecar/sidecar_server.py"
else
    echo "Staging python-runtime to src-tauri/resources (this is a 1.2G copy, takes ~30s)..."
    xattr -cr "$PYTHON_STAGING"
    rm -rf "$RESOURCES_DIR"
    mkdir -p "$RESOURCES_DIR/scripts/sidecar"
    cp -RP "$PYTHON_STAGING" "$RESOURCES_DIR/python-runtime"
    cp "$PROJECT_ROOT/scripts/sidecar/sidecar_server.py" "$RESOURCES_DIR/scripts/sidecar/sidecar_server.py"
fi

echo "=== Standalone Python Runtime successfully prepared in $RESOURCES_DIR/python-runtime ==="
