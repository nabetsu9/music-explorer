# Music Explorer MVP 実装タスク

## 概要

MVPは2つのフェーズで構成:
- **Phase 1**: データ収集基盤（1stステップ）
- **Phase 2**: Webインターフェース（2ndステップ）

**技術スタック**: Bun + Vite + React + Hono + Turso + Vitest

---

## 進捗状況サマリー (2026-01-24 更新)

### 完了済み ✅
- [x] Phase 1.1: プロジェクトセットアップ
- [x] Phase 1.2: データベース設定
- [x] Phase 1.3: データ収集（**Wikidata方式に変更**）
- [x] Phase 2.1: Hono APIエンドポイント
- [x] Phase 2.2: Vite + Reactフロントエンド（**グラフ表示バグ修正済み**）
- [x] Phase 2.3: Vitest設定

### 次のセッションでの作業 🔧
1. **関係性データの充実** - より多くのアーティスト収集
2. **Turso本番DB設定** - Command Line Toolsアップデート後
3. **E2Eテスト追加** - Playwright

---

## 重要な変更点

### データソース変更 (2026-01-24)

**Before (Last.fm依存)**:
- Primary: MusicBrainz
- Secondary: Last.fm (API Key必要)

**After (認証不要)**:
- Primary: MusicBrainz（コアメタデータ + 関係性）
- Secondary: Wikidata（画像 + ジャンル）

**理由**: Last.fm APIはアプリケーション登録が必要。MVPリリースを優先するため、認証不要のデータソースに変更。

**新規ファイル**:
- `apps/api/src/collectors/wikidata.ts` - Wikidata SPARQL コレクター
- `apps/api/src/collectors/scoring.ts` - 関係性スコアリング

**スキーマ変更**:
- `artists.wikidataId` 追加
- `artists.imageSource` 追加（"wikidata" | "lastfm" | null）
- `artistGenres.source` 追加

---

## Phase 1: データ収集基盤

### 1.1 プロジェクトセットアップ ✅

| タスク | 状態 |
|--------|------|
| Task 1.1.1: モノレポ初期化（Turborepo + Bun） | ✅ |
| Task 1.1.2: Vite + React フロントエンド作成 | ✅ |
| Task 1.1.3: Hono バックエンド作成 | ✅ |
| Task 1.1.4: 共有パッケージ作成 | ✅ |
| Task 1.1.5: Biome設定（Linter/Formatter） | ✅ |
| Task 1.1.6: 環境変数設定 | ✅ |

### 1.2 データベース設定 ✅

| タスク | 状態 |
|--------|------|
| Task 1.2.1: Turso/ローカルSQLite データベース | ✅ ローカルSQLite使用中 |
| Task 1.2.2: Drizzle ORM 設定 | ✅ |
| Task 1.2.3: スキーマ定義 | ✅ wikidataId, imageSource追加済み |
| Task 1.2.4: データベース接続 | ✅ |
| Task 1.2.5: マイグレーション実行 | ✅ |

### 1.3 データ収集 ✅

| タスク | 状態 | 備考 |
|--------|------|------|
| Task 1.3.1: レート制限ユーティリティ | ✅ | |
| Task 1.3.2: MusicBrainz コレクター | ✅ | getArtistRelationsWithTypes追加 |
| Task 1.3.3: ~~Last.fm コレクター~~ → Wikidata コレクター | ✅ | SPARQL経由 |
| Task 1.3.4: スコアリングモジュール | ✅ | 新規追加 |
| Task 1.3.5: データ収集オーケストレーター | ✅ | Last.fm依存除去 |
| Task 1.3.6: 初期データ収集スクリプト | ✅ | 22アーティスト収集済み |

---

## Phase 2: Webインターフェース

### 2.1 Hono API エンドポイント ✅

| タスク | 状態 |
|--------|------|
| Task 2.1.1: 検索API | ✅ |
| Task 2.1.2: アーティスト詳細API | ✅ |
| Task 2.1.3: グラフデータAPI | ✅ |
| Task 2.1.4: Hono RPC クライアント設定 | ✅ |

### 2.2 Vite + React フロントエンド ✅

| タスク | 状態 | 備考 |
|--------|------|------|
| Task 2.2.1: TanStack Router 設定 | ✅ | |
| Task 2.2.2: 検索コンポーネント | ✅ | |
| Task 2.2.3: ネットワークグラフコンポーネント | ✅ | cytoscape直接使用に変更 |
| Task 2.2.4: 探索ページ | ✅ | |

### 2.3 テスト ✅

| タスク | 状態 | 備考 |
|--------|------|------|
| Task 2.3.1: Vitest 設定 | ✅ | |
| Task 2.3.2: API テスト | ✅ | 34テスト全通過 |
| Task 2.3.3: E2E テスト | ⏳ | 未実装 |

---

## 既知のバグ・課題

### ~~1. グラフ表示エラー~~ ✅ 解決済み
**症状**: アーティスト選択後にreact-cytoscapejsでTypeError発生
**原因**: react-cytoscapejs v2.0.0とReact 19の互換性問題。COSEレイアウトのアニメーション中にコンポーネントがアンマウントされると、破棄済み要素へのアクセスでエラー発生
**解決策**: react-cytoscapejsを削除し、cytoscapeを直接使用。レイアウトアニメーションを無効化し、requestAnimationFrameでDOMの準備を待機

### 2. 関係性データが少ない (優先度: 高)
**症状**: グラフエッジが1つしかない
**原因**: 収集済みアーティスト間でのみ関係性が作成される
**対処**:
- より多くのアーティストを収集
- 収集済みアーティストの関係性を再構築するスクリプト作成

### 3. Turso CLI未インストール (優先度: 低)
**症状**: Command Line Toolsが古くてbrew install失敗
**対処**:
- Xcode CLTをアップデート
- または引き続きローカルSQLiteで開発

---

## 開発コマンド

### ローカル開発

```bash
# APIサーバー起動（ローカルSQLite使用）
cd apps/api && bun run dev:local

# フロントエンド起動
cd apps/web && bun run dev

# 全テスト実行
bun run test

# Lint
bun run lint

# データ収集
cd apps/api && bun run scripts/collect.ts
```

### データベース

```bash
# マイグレーション生成
cd packages/db && bun run db:generate

# マイグレーション適用
cd packages/db && bun run db:push

# Drizzle Studio（DB閲覧）
cd packages/db && bun run db:studio
```

---

## 次のセッションの作業計画

### 優先度1: 関係性データ充実
1. `apps/api/scripts/collect.ts` に追加アーティストを登録
2. 再収集を実行して関係性を増やす
3. 収集済みアーティストの関係性を再構築するスクリプト作成

### 優先度2: 本番環境準備
1. Xcode Command Line Tools更新
2. Turso CLIインストール
3. Turso DBを作成して環境変数設定
4. Cloudflare Pagesへのデプロイ

### 優先度3: E2Eテスト
1. Playwrightセットアップ
2. 検索・グラフ表示のE2Eテスト作成

---

## ファイル構成（更新後）

```
apps/api/
├── src/
│   ├── index.ts              # Honoアプリ
│   ├── dev.ts                # ローカル開発サーバー（新規）
│   ├── routes/
│   │   ├── search.ts
│   │   ├── artists.ts
│   │   └── graph.ts
│   └── collectors/
│       ├── index.ts          # オーケストレーター（Wikidata統合）
│       ├── musicbrainz.ts    # 強化版（getArtistRelationsWithTypes）
│       ├── wikidata.ts       # 新規
│       ├── scoring.ts        # 新規
│       ├── rate-limiter.ts
│       └── lastfm.ts         # 保持（将来用）
├── scripts/
│   └── collect.ts            # データ収集スクリプト
└── package.json              # dev:local追加

packages/db/
├── src/
│   ├── schema.ts             # wikidataId, imageSource追加
│   ├── index.ts
│   └── queries/
├── drizzle.config.ts         # ローカル/Turso切り替え対応
└── local.db                  # ローカルSQLiteファイル
```

---

## 収集済みデータ

**アーティスト数**: 22
**関係性数**: 1（関連アーティストが少ないため）

**収集済みアーティスト**:
- Radiohead, The Beatles, Nirvana, David Bowie, Queen
- Pink Floyd, Led Zeppelin, The Rolling Stones, Bob Dylan, Jimi Hendrix
- The Clash, Talking Heads, Joy Division, New Order, The Smiths
- Depeche Mode, Kraftwerk, Daft Punk, Aphex Twin
- R.E.M., Pixies, Sonic Youth

**データ品質**:
- MusicBrainz: メタデータ、関係タイプ ✅
- Wikidata: 画像URL、Wikidata ID ✅
- ジャンル: 未収集（Wikidata SPARQLクエリに追加可能）
