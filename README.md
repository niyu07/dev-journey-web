# dev-journey-web

## リポジトリのクローン方法

GitHub 上で「Code」ボタンから URL をコピーし、以下のコマンドでクローンしてください。

```sh
git clone https://github.com/niyu07/dev-journey-web.git
cd dev-journey-web
```

## 改行コード（LF）推奨について

本プロジェクトでは、OS 間の互換性やスクリプト実行エラー防止のため、改行コードは「LF（Unix）」で統一することを推奨します。

### VS Code での設定方法

- 右下の「CRLF」または「LF」と表示されている部分をクリックし、「LF」を選択してください。
- `.sh` などのスクリプトや設定ファイルを保存する際も LF で保存してください。

### Git での推奨設定

グローバル設定で以下を実行すると、コミット時に自動で LF に変換されます。

```sh
git config --global core.autocrlf input
```

### 補足

Windows でファイルを編集した場合、意図せず CRLF になることがあります。エラーが出た場合は改行コードを LF に修正してください。

## main/develop への直接 push 防止のセットアップ

このリポジトリでは、main や develop ブランチへの直接 push を防ぐための Git フックを用意しています。

初回 clone 後、必ず以下を実行してください:

### macOS/Linux の場合

```sh
sh setup/setup-hooks.sh
```

### Windows の場合

Windows ユーザーは、まず WSL（Windows Subsystem for Linux）の設定・インストールを行ってください。
（[公式ガイド](https://docs.microsoft.com/en-us/windows/wsl/install)）を参考にしてください）

WSL（Windows Subsystem for Linux）上では、macOS や Linux と同様に `sh` コマンドやシェルスクリプト（sh setup/setup-hooks.sh など）がそのまま利用できます。
そのため、WSL 環境での作業を推奨します。

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
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom prettier
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
# 開発用ツール（black, flake8, autopep8 など）もまとめてインストールするため，requirements.txt を使ってください
pip install -r requirements.txt
```

4. サーバー起動

```sh
uvicorn app.main:app --reload
```

サーバー起動後、API 仕様や動作確認はブラウザで [http://localhost:8000/docs](http://localhost:8000/docs)（Swagger UI）にアクセスすると、インタラクティブな API ドキュメントが利用できます。
また、[http://localhost:8000/redoc](http://localhost:8000/redoc) でも別デザインの API ドキュメントが確認できます。

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

## よくあるトラブルと対処法（FAQ）

- **仮想環境が有効化できない**
  - PowerShell の場合：`venv\Scripts\Activate.ps1`
  - コマンドプロンプトの場合：`venv\Scripts\activate.bat`
  - macOS/Linux/WSL の場合：`source venv/bin/activate` または `. .venv/bin/activate`
- **pip コマンドが見つからない**
  - Python のインストールパスが通っているか確認してください。
- **sh コマンドが使えない（Windows）**
  - WSL や Git Bash をインストールしてください。
- **スクリプト実行時に「bad interpreter」エラー**
  - 改行コードが CRLF になっていないか確認し、LF に修正してください。
- **依存パッケージのインストールでエラー**
  - `pip install --upgrade pip` で pip を最新版にしてから再度お試しください。

## 推奨エディタ・拡張機能

- Visual Studio Code（VS Code）
  - ESLint 拡張
  - Prettier 拡張
    - Japanese Language Pack for Visual Studio Code：日本 g の語化
    - Live Preview：HTML のライブプレビュー

## プロジェクト構成（主要ディレクトリ）

- `frontend/` : フロントエンド（React, Vite）
- `backend/` : バックエンド（FastAPI）
- `setup/` : セットアップ用スクリプトや Git フック
- `format.sh` : コードフォーマット一括実行スクリプト

---
