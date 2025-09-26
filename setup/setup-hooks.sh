#!/bin/bash
# setup-hooks.sh: install Git hooks locally

# Gitリポジトリの存在確認（現在のディレクトリまたは親ディレクトリ）
if [ -d ".git" ]; then
    GIT_ROOT="."
elif [ -d "../.git" ]; then
    GIT_ROOT=".."
else
    echo "❌ ERROR: Git repository not found"
    exit 1
fi

# pre-pushフックのファイルパス
HOOK_SOURCE="pre-push"
HOOK_DEST="$GIT_ROOT/.git/hooks/pre-push"

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