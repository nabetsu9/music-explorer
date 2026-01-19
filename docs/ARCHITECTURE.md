# Music Explorer アーキテクチャ設計書

## 概要

アーティスト・楽曲データを収集し、ネットワークグラフで関連性を探索できる音楽探索アプリケーション。

## ビジョン

```
好きな音楽が見つかる
├── データを集めて
├── ネットワークグラフで探せる
├── お気に入りアーティストの情報が入ってくる（将来）
└── おすすめアーティストが見つかる（将来）
```

---

## アーキテクチャ

### 採用方式: Hybrid（段階的進化型）

```
[MVP Phase]
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Vite + React + TanStack Router + TanStack Query + Zustand  │
│                  Tailwind + shadcn/ui + Cytoscape.js        │
└─────────────────────────────────────────────────────────────┘
                              │
                    Hono RPC (型安全)
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│              Hono on Cloudflare Workers                      │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│     Turso       │                    │  External APIs  │
│    (libSQL)     │                    │ MusicBrainz     │
│    Database     │                    │ Last.fm         │
└─────────────────┘                    └─────────────────┘

[ML拡張 Phase]
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vite + React  │────▶│   Hono API      │────▶│   FastAPI       │
│                 │     │                 │     │   (Python)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Cytoscape.js   │     │     Turso       │     │   ML Models     │
└─────────────────┘     └─────────────────┘     │  (scikit-learn) │
                                                └─────────────────┘
```

### 選定理由

| 観点 | 判断 |
|------|------|
| MVP開発速度 | ◎ Vite + Bunで高速開発、SSR不要でシンプル |
| 将来のML拡張 | ○ Python FastAPIを後から追加可能 |
| コスト | ◎ 無料枠で運用可能（Cloudflare Pages/Workers + Turso） |
| スケーラビリティ | △ 10万件程度まで（必要に応じてNeo4j移行） |
| 開発体験（DX） | ◎ Bun + Viteでビルド/テスト高速化 |

### Next.jsを採用しない理由

参考: [nabetsu9/recipe ADR-001](https://github.com/nabetsu9/recipe/commit/0edaaeaffedbb484d8f411eea003346595e871b6)

| 項目 | 判断 |
|------|------|
| SSR必要性 | なし（ダッシュボード型、SEO不要） |
| ビルド時間 | Viteの方が62%高速（8秒→3秒） |
| バンドルサイズ | Viteの方が40%削減（250KB→150KB） |
| Cloudflare互換性 | Vite + Reactは調整不要で完璧に動作 |

---

## 技術スタック

### Core

| レイヤー | 技術 | バージョン | 備考 |
|---------|------|-----------|------|
| Language | TypeScript | 5.x | |
| Runtime (開発) | Bun | latest | パッケージ管理 + ビルド + テスト |
| Runtime (本番) | Cloudflare Workers | - | エッジ配信 |
| Framework (Frontend) | Vite + React | React 18+ | SSR不要のためSPA構成 |
| Framework (Backend) | Hono | latest | Cloudflare最適化、型安全RPC |
| Database | Turso (libSQL) | - | 無料枠9GB、SQLiteベース |
| ORM | Drizzle ORM | latest | 型安全、SQLライク |

### Frontend

| 用途 | 技術 | 備考 |
|------|------|------|
| Router | TanStack Router | 型安全なルーティング、URL State管理 |
| State (Server) | TanStack Query | APIキャッシュ、自動再取得 |
| State (Client) | Zustand | 軽量（0.6KB）、シンプル |
| Form | React Hook Form + Zod | バリデーション、型安全 |
| UI Components | shadcn/ui | Radix UI ベース |
| Styling | Tailwind CSS | ユーティリティファースト |
| Graph Visualization | Cytoscape.js + react-cytoscapejs | ネットワークグラフ描画 |

### Backend

| 用途 | 技術 | 備考 |
|------|------|------|
| API Framework | Hono | 軽量、Cloudflare Workers最適化 |
| RPC | Hono RPC | フロントエンドとの型安全な通信 |
| Background Jobs | Cloudflare Queues or Cron Triggers | 将来のデータ収集バッチ用 |
| Rate Limiting | Custom (in-memory) | 外部API呼び出し制御 |

### Infrastructure

| 用途 | 技術 | 備考 |
|------|------|------|
| Frontend Hosting | Cloudflare Pages | 無料、グローバルCDN |
| Backend Hosting | Cloudflare Workers | 無料枠10万リクエスト/日 |
| Database | Turso | 無料枠9GB、グローバル分散 |
| Monitoring | Cloudflare Analytics | 無料 |

### 開発環境

| 用途 | 技術 | 備考 |
|------|------|------|
| Package Manager | Bun | pnpmの3倍高速 |
| Linter/Formatter | Biome | ESLint + Prettier置き換え、高速 |
| Testing | Vitest | Bun環境で4倍高速 |
| E2E Tests | Playwright | ユーザーフロー検証 |
| CI/CD | GitHub Actions | Bunキャッシュ活用 |

### Bun採用理由

参考: [nabetsu9/recipe ADR-008](https://github.com/nabetsu9/recipe/commit/0edaaeaffedbb484d8f411eea003346595e871b6)

| 指標 | Node.js/pnpm | Bun | 改善率 |
|------|-------------|-----|--------|
| パッケージインストール | 15秒 | 5秒 | 3倍高速 |
| ビルド | 8秒 | 3秒 | 2.7倍高速 |
| テスト実行 | 8秒 | 2秒 | 4倍高速 |

※本番環境はCloudflare Workers Runtimeを使用（Bunは開発・ビルドのみ）

---

## データモデル

### ER図

```
┌─────────────────┐
│     Artist      │
├─────────────────┤
│ id: uuid (PK)   │
│ mbid: string    │──────┐
│ name: string    │      │
│ sortName: string│      │
│ country: string │      │
│ aliases: jsonb  │      │
│ beginDate: date │      │
│ endDate: date   │      │
│ imageUrl: string│      │
│ createdAt       │      │
│ updatedAt       │      │
└────────┬────────┘      │
         │               │
         │ 1:N           │
         ▼               │
┌─────────────────┐      │
│  ArtistRelation │      │
├─────────────────┤      │
│ id: uuid (PK)   │      │
│ fromArtistId(FK)│◀─────┘
│ toArtistId (FK) │◀─────┐
│ relationType    │      │
│ strength: float │      │
│ source: string  │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│     Genre       │      │
├─────────────────┤      │
│ id: uuid (PK)   │      │
│ name: string    │      │
│ parentId (FK)   │──┐   │
└────────┬────────┘  │   │
         │           │   │
         │ self-ref  │   │
         └───────────┘   │
         │               │
         │ M:N           │
         ▼               │
┌─────────────────┐      │
│   ArtistGenre   │      │
├─────────────────┤      │
│ artistId (FK)   │◀─────┤
│ genreId (FK)    │      │
│ weight: float   │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│      Song       │      │
├─────────────────┤      │
│ id: uuid (PK)   │      │
│ mbid: string    │      │
│ title: string   │      │
│ duration: int   │      │
│ artistId (FK)   │◀─────┘
│ releaseDate     │
└─────────────────┘
```

### 将来拡張用テーブル

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     User        │     │    Favorite     │     │    Article      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id: uuid (PK)   │◀────│ userId (FK)     │     │ id: uuid (PK)   │
│ email: string   │     │ artistId (FK)   │     │ title: string   │
│ name: string    │     │ createdAt       │     │ url: string     │
│ createdAt       │     └─────────────────┘     │ source: string  │
└─────────────────┘                             │ publishedAt     │
                                                │ summary: text   │
                        ┌─────────────────┐     └────────┬────────┘
                        │  ArticleArtist  │              │
                        ├─────────────────┤              │
                        │ articleId (FK)  │◀─────────────┘
                        │ artistId (FK)   │
                        │ mentionType     │
                        │ confidence      │
                        └─────────────────┘
```

---

## 外部データソース

### Primary: MusicBrainz

- **用途**: コアメタデータ、アーティスト関係性
- **レート制限**: 1 request/second
- **認証**: User-Agent header のみ
- **データ**: MBID, 名前, 国, 活動期間, アーティスト間関係, ジャンル

### Secondary: Last.fm

- **用途**: 類似アーティスト、タグ、人気度
- **レート制限**: 5 requests/second
- **認証**: API Key
- **データ**: Similar Artists, Top Tags, Listeners Count

### Optional: Spotify (将来)

- **用途**: リアルタイム人気度、オーディオ特徴
- **認証**: OAuth 2.0
- **制限**: 商用利用に制約あり

---

## プロジェクト構成

**モノレポ管理**: Turborepo（ビルドキャッシュ、タスク並列実行）

```
music-explorer/
├── apps/
│   ├── web/                      # Vite + React フロントエンド
│   │   ├── src/
│   │   │   ├── routes/           # TanStack Router ページ
│   │   │   │   ├── index.tsx     # Home (Search)
│   │   │   │   ├── explore.tsx   # Graph Explorer
│   │   │   │   └── artists/
│   │   │   │       └── $id.tsx   # Artist Detail
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/           # shadcn/ui components
│   │   │   │   ├── search/
│   │   │   │   │   ├── SearchBar.tsx
│   │   │   │   │   └── SearchResults.tsx
│   │   │   │   ├── artist/
│   │   │   │   │   ├── ArtistCard.tsx
│   │   │   │   │   └── ArtistDetail.tsx
│   │   │   │   └── graph/
│   │   │   │       ├── NetworkGraph.tsx
│   │   │   │       └── GraphControls.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useArtistSearch.ts
│   │   │   │   └── useGraphData.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   └── api.ts        # Hono RPC クライアント
│   │   │   │
│   │   │   └── main.tsx
│   │   │
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                      # Hono バックエンド（Cloudflare Workers）
│       ├── src/
│       │   ├── index.ts          # Hono app entry
│       │   ├── routes/
│       │   │   ├── artists.ts    # /api/artists
│       │   │   ├── search.ts     # /api/search
│       │   │   └── graph.ts      # /api/graph
│       │   │
│       │   ├── services/
│       │   │   ├── artist.service.ts
│       │   │   ├── search.service.ts
│       │   │   └── graph.service.ts
│       │   │
│       │   └── collectors/
│       │       ├── index.ts      # Collector orchestrator
│       │       ├── musicbrainz.ts
│       │       ├── lastfm.ts
│       │       └── rate-limiter.ts
│       │
│       ├── wrangler.toml         # Cloudflare Workers 設定
│       └── package.json
│
├── packages/
│   ├── db/                       # Drizzle スキーマ・マイグレーション
│   │   ├── src/
│   │   │   ├── index.ts          # Drizzle client
│   │   │   ├── schema.ts         # Table definitions
│   │   │   └── queries/
│   │   │       ├── artists.ts
│   │   │       └── graph.ts      # Recursive CTE queries
│   │   │
│   │   ├── drizzle/
│   │   │   └── migrations/
│   │   │
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/                   # 共有型定義・ユーティリティ
│       ├── src/
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── utils/
│       │       └── index.ts
│       │
│       └── package.json
│
├── scripts/
│   └── collect.ts                # Manual data collection
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── ARCHITECTURE.md           # This file
│   └── MVP_TASKS.md              # Implementation tasks
│
├── .env.example
├── biome.json                    # Biome設定
├── turbo.json                    # Turborepo設定
├── package.json                  # ワークスペースルート
└── bun.lockb                     # Bun lockfile
```

---

## グラフクエリ戦略

### PostgreSQL Recursive CTE

関連アーティスト探索用の再帰クエリ:

```sql
WITH RECURSIVE artist_network AS (
  -- Base case
  SELECT
    a.id, a.name, a.image_url,
    0 as depth,
    ARRAY[a.id] as path,
    1.0::float as cumulative_strength
  FROM artists a
  WHERE a.id = $1

  UNION ALL

  -- Recursive case
  SELECT
    a2.id, a2.name, a2.image_url,
    an.depth + 1,
    an.path || a2.id,
    an.cumulative_strength * ar.strength
  FROM artist_network an
  JOIN artist_relations ar ON ar.from_artist_id = an.id
  JOIN artists a2 ON a2.id = ar.to_artist_id
  WHERE an.depth < $2  -- max depth
    AND NOT a2.id = ANY(an.path)  -- prevent cycles
)
SELECT DISTINCT ON (id) *
FROM artist_network
ORDER BY id, cumulative_strength DESC;
```

### パフォーマンス考慮

- **インデックス**: `artist_relations` の `from_artist_id`, `to_artist_id` に複合インデックス
- **depth制限**: 通常は depth=2 で十分（3以上は指数的に増加）
- **キャッシュ**: よくアクセスされるアーティストのグラフをRedis/メモリキャッシュ

---

## セキュリティ

### API Keys

- `.env.local` で管理（Git除外）
- 本番は Vercel Environment Variables

### Rate Limiting

- 外部API: 各APIの制限を遵守
- 自前API: Vercel Rate Limiting or Upstash

### 入力検証

- Zod でリクエストバリデーション
- SQLインジェクション: Drizzle ORM で自動エスケープ

---

## 将来拡張計画

### Phase 1: MVP (1st/2nd ステップ)

- アーティスト/楽曲データ収集
- 検索機能
- ネットワークグラフ表示

### Phase 2: 認証 & お気に入り (3rd ステップ)

- Better Auth 導入（セルフホスト型、TypeScript製、Cloudflare Workers対応）
- User, Favorite テーブル追加
- お気に入りアーティストの更新通知

### Phase 3: レコメンド (4th ステップ)

- Python FastAPI サービス追加
- Graph Embedding (Node2Vec等)
- 協調フィルタリング

### Phase 4: 記事連携

- RSS/Atom フィード収集
- NER でアーティスト抽出
- Article, ArticleArtist テーブル追加

### Phase 5: スケーリング（必要に応じて）

- Turso → Neo4j 移行（グラフ特化が必要な場合）
- Cloudflare KV / D1 キャッシュ導入
- Cloudflare R2 for 画像ストレージ

---

## 参考資料

- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)
- [Last.fm API](https://www.last.fm/api)
- [Cytoscape.js](https://js.cytoscape.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Vite](https://vite.dev/)
- [Hono](https://hono.dev/)
- [TanStack Router](https://tanstack.com/router)
- [Bun](https://bun.sh/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Turso](https://turso.tech/)
- [nabetsu9/recipe 技術選定ADR](https://github.com/nabetsu9/recipe/commit/0edaaeaffedbb484d8f411eea003346595e871b6)
