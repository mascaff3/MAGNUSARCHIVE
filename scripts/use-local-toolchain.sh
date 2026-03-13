#!/bin/zsh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$PROJECT_DIR/.local/node/bin:$PROJECT_DIR/.local/git-lfs:$PATH"

exec "$@"
