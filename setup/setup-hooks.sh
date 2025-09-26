#!/bin/bash
# setup-hooks.sh: install Git hooks locally

# Gitリポジトリの存在確認
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
if [ -z "$GIT_DIR" ] || [ ! -d "$GIT_DIR" ]; then
    echo "❌ ERROR: Git repository not found"
    exit 1
fi

# pre-pushフックのファイルパス（スクリプトの場所からの相対パス）
HOOK_SOURCE="$(dirname "$0")/pre-push"
HOOK_DEST="$GIT_DIR/hooks/pre-push"

# pre-pushファイルの存在確認
if [ ! -f "$HOOK_SOURCE" ]; then
    echo "❌ ERROR: $HOOK_SOURCE file not found"
    exit 1
fi

# フックをインストール
cp "$HOOK_SOURCE" "$HOOK_DEST"
chmod +x "$HOOK_DEST"

echo "✅ Git hooks installed successfully!"
echo "   Direct push to main/develop is now blocked."