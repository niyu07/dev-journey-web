#!/bin/bash
set -e  # ここで、途中で失敗したら止まるようにする

echo "===== Python: Black (自動フォーマット) ====="
black backend/ || { echo "Black でのフォーマットに失敗"; exit 1; }

echo "===== Python: autopep8 (追加の自動修正) ====="
find backend/ -name "*.py" | xargs autopep8 --in-place --aggressive --aggressive || { echo "autopep8 での修正に失敗"; exit 1; }

echo "===== Frontend: ESLint 自動修正 ====="
cd frontend
npx eslint "src/**/*.{ts,tsx,js,jsx}" --fix || { echo "ESLint での自動修正に失敗"; exit 1; }

echo "===== Frontend: Prettier 自動整形 ====="
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss,md}" || { echo "Prettier での自動整形に失敗"; exit 1; }

echo "✅ フォーマット完了"