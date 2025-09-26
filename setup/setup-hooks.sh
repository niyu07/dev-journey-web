#!/bin/bash

# setup-hooks.sh: install Git hooks locally

HOOKS_DIR=".git/hooks"

mkdir -p "$HOOKS_DIR"
cp setup/pre-push "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks installed. Direct push to main/develop is now blocked."