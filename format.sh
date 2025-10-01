#!/bin/bash
set -e # 途中で失敗したら止まる

echo "===== Python: Black (自動フォーマット) ====="
# Blackはディレクトリを再帰的に処理できるので、findは不要
black backend/ || { echo "Black でのフォーマットに失敗"; exit 1; }

echo "===== Python: autopep8 (追加の自動修正) ====="
# autopep8の--recursiveオプションを使用
autopep8 --in-place --recursive --aggressive backend/ || { echo "autopep8 での修正に失敗"; exit 1; }

echo "===== Frontend: ESLint & Prettier 自動修正 ====="
cd frontend
# Prettierの実行はPre-commitフックに入れるのが理想だが、ここではまとめる
npx eslint "src/**/*.{ts,tsx,js,jsx}" --fix
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss,md}"

echo "✅ フォーマット完了"