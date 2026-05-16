#!/bin/bash
# Build a plugin from the repo root. Handles spaces in iCloud path.
# Usage: ./build.sh [PluginName]  (defaults to SuperTask)

PLUGIN="${1:-SuperTask}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$REPO_DIR/plugins/$PLUGIN"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "Error: Plugin directory not found: $PLUGIN_DIR"
  exit 1
fi

cd "$PLUGIN_DIR" && bash buildPlugin.sh
