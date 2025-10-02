# dev-journey-web

## リポジトリのクローン方法

GitHub 上で「Code」ボタンから URL をコピーし、以下のコマンドでクローンしてください。

```sh
git clone https://github.com/niyu07/dev-journey-web.git
cd dev-journey-web
```

## main/develop への直接 push 防止のセットアップ

このリポジトリでは、main や develop ブランチへの直接 push を防ぐための Git フックを用意しています。
初回 clone 後、必ず以下を実行してください:

```sh
sh setup/setup-hooks.sh
```

これにより、main や develop への直接 push をローカルで防止できます（PR 運用推奨）。

## プロジェクト概要

dev-journey-web は、フロントエンドとバックエンドで構成された Web アプリケーションプロジェクトです。開発効率と品質向上のため、CI や Lint、Format などの自動化も導入しています。

---

## 環境構築

### フロントエンド

1. Node.js（推奨バージョン: 18.x 以上）をインストール

2. `frontend` ディレクトリで依存パッケージをインストール

```sh
cd frontend
npm install
# テスト・フォーマット用パッケージも追加でインストールしてください
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
npm install --save-dev prettier
```

3. 開発サーバー起動

```sh
npm run dev
```

#### よく使うコマンド

- Lint（静的解析）: `npm run lint`
- テスト: `npm run test`
- 本番ビルド: `npm run build`
- 本番ビルドのプレビュー: `npm run preview`
- コードフォーマット: `npx prettier --write src/`

### バックエンド

1. Python（推奨バージョン: 3.10 以上）をインストール
2. 仮想環境を作成・有効化

```sh
cd backend
python -m venv venv
source venv/bin/activate  # Windowsの場合は `venv\Scripts\activate`

. .venv/bin/activate # macOS/Linuxはこっちでもいけます
```

3. 依存パッケージをインストール

```sh
# アプリ・テスト・フォーマット用パッケージをまとめてインストールしてください
pip install -r requirements.txt
pip install black flake8 autopep8
```

4. サーバー起動

```sh
python app/main.py
```

### CI / Lint / Format

- フロントエンド: ESLint, Prettier, Vitest（テスト）
- バックエンド: flake8, black, autopep8
- CI: GitHub Actions で自動テスト・Lint・Format チェックを実施
- フォーマット自動化: `format.sh` で一括実行可能

#### フォーマット自動化

プロジェクトルートの `format.sh` を実行すると、フロントエンド・バックエンド両方のコードフォーマットが一括で行えます。

```sh
./format.sh
```

---

## 開発フロー

### ブランチ戦略

- `main`: 本番用ブランチ
- `develop`: 開発用ブランチ
- `feature/*`: 機能追加・修正用ブランチ
- `bugfix/*`: バグ修正用ブランチ
- `docs/*`: ドキュメント用ブランチ

### PR の作り方

1. `develop` ブランチから作業用ブランチを作成
2. コミット・プッシュ後、`develop` への Pull Request を作成
3. レビュー・CI 通過後にマージ

### Issue の作り方

- タイトルと内容を明確に記載
- 必要に応じてラベルや担当者を設定
- 関連する PR やコミットを紐付け

---

ご不明点はプロジェクト管理者までご連絡ください。
