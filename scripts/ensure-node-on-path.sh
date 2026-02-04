#!/usr/bin/env bash
# Makes 'node' available at /usr/local/bin/node so Android Studio and Gradle can find it.
# Run once: ./scripts/ensure-node-on-path.sh (will prompt for sudo if needed)

set -e
NODE=$(which node 2>/dev/null || true)
if [ -z "$NODE" ]; then
  echo "Error: 'node' not found in PATH. Install Node (e.g. nvm install) and run this script from a shell where 'which node' works."
  exit 1
fi

TARGET="/usr/local/bin/node"
if [ -e "$TARGET" ]; then
  CURRENT=$(readlink "$TARGET" 2>/dev/null || true)
  if [ -n "$CURRENT" ] && [ "$CURRENT" = "$NODE" ]; then
    echo "OK: $TARGET already points to $NODE"
    exit 0
  fi
  if [ -x "$TARGET" ] && "$TARGET" --version >/dev/null 2>&1; then
    echo "OK: $TARGET is a working node."
    exit 0
  fi
fi

if [ ! -d /usr/local/bin ]; then
  echo "Creating /usr/local/bin (may need sudo)..."
  sudo mkdir -p /usr/local/bin
fi

echo "Linking: $TARGET -> $NODE"
sudo ln -sf "$NODE" "$TARGET"
echo "Done. You can now sync Gradle in Android Studio."
exit 0
