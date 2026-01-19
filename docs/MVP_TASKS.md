# Music Explorer MVP 実装タスク

## 概要

MVPは2つのフェーズで構成:
- **Phase 1**: データ収集基盤（1stステップ）
- **Phase 2**: Webインターフェース（2ndステップ）

各タスクは検証可能な単位に分割されています。

**技術スタック**: Bun + Vite + React + Hono + Turso + Vitest

---

## Phase 1: データ収集基盤

### 1.1 プロジェクトセットアップ

#### Task 1.1.1: モノレポ初期化（Turborepo + Bun）

**作業内容**:
```bash
# Bunがインストールされていない場合
curl -fsSL https://bun.sh/install | bash

# Turborepoでモノレポ作成
bunx create-turbo@latest music-explorer --package-manager bun

# または手動で初期化
mkdir music-explorer && cd music-explorer
bun init -y

# turbo.json作成
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
EOF

# ワークスペース設定
cat > package.json << 'EOF'
{
  "name": "music-explorer",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
EOF
```

**検証方法**:
```bash
bun --version
# Bun x.x.x

ls turbo.json package.json
# ファイルが存在する
```

**完了条件**:
- [ ] Bun がインストールされている
- [ ] turbo.json が作成されている
- [ ] ワークスペース構成が設定されている

---

#### Task 1.1.2: Vite + React フロントエンド作成

**作業内容**:
```bash
mkdir -p apps/web && cd apps/web

# Vite + React + TypeScript
bun create vite . --template react-ts

# TanStack Router
bun add @tanstack/react-router @tanstack/router-devtools

# TanStack Query
bun add @tanstack/react-query @tanstack/react-query-devtools

# Zustand
bun add zustand

# Form + Validation
bun add react-hook-form @hookform/resolvers zod

# UI
bunx shadcn-ui@latest init
bunx shadcn-ui@latest add button input card

# Graph
bun add cytoscape react-cytoscapejs
bun add -D @types/cytoscape
```

**検証方法**:
```bash
cd apps/web && bun run dev
# http://localhost:5173 でViteのデフォルトページが表示される
```

**完了条件**:
- [ ] Vite + React が動作する
- [ ] TanStack Router がインストールされている
- [ ] shadcn/ui が初期化されている
- [ ] `bun run dev` で起動できる

---

#### Task 1.1.3: Hono バックエンド作成

**作業内容**:
```bash
mkdir -p apps/api && cd apps/api
bun init -y

# Hono
bun add hono
bun add @hono/zod-validator zod

# Cloudflare Workers
bun add -D wrangler @cloudflare/workers-types

# wrangler.toml作成
cat > wrangler.toml << 'EOF'
name = "music-explorer-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"
EOF

# src/index.ts作成
mkdir src
cat > src/index.ts << 'EOF'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => c.json({ message: 'Music Explorer API' }))

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
EOF
```

**検証方法**:
```bash
cd apps/api && bun run wrangler dev
# http://localhost:8787 でAPIが応答する
curl http://localhost:8787/health
# {"status":"ok"}
```

**完了条件**:
- [ ] Hono アプリケーションが作成されている
- [ ] wrangler.toml が設定されている
- [ ] ローカルでAPIが起動できる

---

#### Task 1.1.4: 共有パッケージ作成

**作業内容**:
```bash
# DB パッケージ
mkdir -p packages/db/src && cd packages/db
bun init -y
bun add drizzle-orm @libsql/client
bun add -D drizzle-kit

# Shared パッケージ
mkdir -p packages/shared/src && cd packages/shared
bun init -y
bun add zod
```

**完了条件**:
- [ ] packages/db が作成されている
- [ ] packages/shared が作成されている

---

#### Task 1.1.5: Biome設定（Linter/Formatter）

**作業内容**:
```bash
# ルートディレクトリで
bun add -D @biomejs/biome

# biome.json作成
cat > biome.json << 'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
EOF

# package.jsonにスクリプト追加
# "lint": "biome check .",
# "lint:fix": "biome check --write ."
```

**検証方法**:
```bash
bun run lint
# エラーなし
```

**完了条件**:
- [ ] Biome が設定されている
- [ ] `bun run lint` が動作する

---

#### Task 1.1.6: 環境変数設定

**作業内容**:
`.env` を作成:
```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# Last.fm API
LASTFM_API_KEY=your_api_key
```

`.env.example` を作成（Git追跡用）:
```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token
LASTFM_API_KEY=your_lastfm_api_key
```

**完了条件**:
- [ ] `.env` が作成されている
- [ ] `.env.example` が作成されている
- [ ] `.gitignore` に `.env` が含まれている

---

### 1.2 データベース設定

#### Task 1.2.1: Turso データベース作成

**作業内容**:
```bash
# Turso CLIインストール
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login

# データベース作成
turso db create music-explorer

# 接続情報取得
turso db show music-explorer --url
turso db tokens create music-explorer

# .envに追加
# TURSO_DATABASE_URL=libsql://music-explorer-xxx.turso.io
# TURSO_AUTH_TOKEN=xxx
```

**完了条件**:
- [ ] Turso CLIがインストールされている
- [ ] データベースが作成されている
- [ ] 接続情報が.envに設定されている

---

#### Task 1.2.2: Drizzle ORM 設定

**作業内容**:
`packages/db/drizzle.config.ts` を作成:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

**検証方法**:
```bash
cd packages/db && bunx drizzle-kit check
# No errors
```

**完了条件**:
- [ ] `drizzle.config.ts` が作成されている
- [ ] `bunx drizzle-kit check` がエラーなく完了

---

#### Task 1.2.3: スキーマ定義

**作業内容**:
`packages/db/src/schema.ts` を作成:
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// SQLiteではUUIDがないのでtext + nanoidで代用
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamp = () => text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull();

export const artists = sqliteTable('artists', {
  id: id(),
  mbid: text('mbid').unique(),
  name: text('name').notNull(),
  sortName: text('sort_name'),
  country: text('country'),
  aliases: text('aliases', { mode: 'json' }).$type<string[]>().default([]),
  beginDate: text('begin_date'),
  endDate: text('end_date'),
  imageUrl: text('image_url'),
  createdAt: timestamp(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const artistRelations = sqliteTable('artist_relations', {
  id: id(),
  fromArtistId: text('from_artist_id').references(() => artists.id).notNull(),
  toArtistId: text('to_artist_id').references(() => artists.id).notNull(),
  relationType: text('relation_type').notNull(),
  strength: real('strength').default(1.0),
  source: text('source').notNull(),
});

export const genres = sqliteTable('genres', {
  id: id(),
  name: text('name').notNull().unique(),
  parentId: text('parent_id').references(() => genres.id),
});

export const artistGenres = sqliteTable('artist_genres', {
  artistId: text('artist_id').references(() => artists.id).notNull(),
  genreId: text('genre_id').references(() => genres.id).notNull(),
  weight: real('weight').default(1.0),
});

export const songs = sqliteTable('songs', {
  id: id(),
  mbid: text('mbid').unique(),
  title: text('title').notNull(),
  duration: integer('duration'),
  artistId: text('artist_id').references(() => artists.id).notNull(),
  releaseDate: text('release_date'),
});
```

**検証方法**:
```bash
cd packages/db && bunx drizzle-kit generate
# Migration files generated in drizzle/migrations
```

**完了条件**:
- [ ] スキーマファイルが作成されている
- [ ] マイグレーションが生成できる
- [ ] 型エラーがない

---

#### Task 1.2.4: データベース接続

**作業内容**:
`packages/db/src/index.ts` を作成:
```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export function createDb(url: string, authToken?: string) {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

export * from './schema';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
```

**検証方法**:
```typescript
// 簡単な接続テスト
import { createDb, artists } from '@music-explorer/db';

const db = createDb(process.env.TURSO_DATABASE_URL!, process.env.TURSO_AUTH_TOKEN);
const result = await db.select().from(artists).limit(1);
console.log('Connection successful:', result);
```

**完了条件**:
- [ ] DBクライアントが作成されている
- [ ] 接続テストが成功する

---

#### Task 1.2.5: マイグレーション実行

**作業内容**:
```bash
cd packages/db && bunx drizzle-kit push
```

**検証方法**:
```bash
# Turso CLIでテーブル確認
turso db shell music-explorer
> .tables
# artists artist_relations genres artist_genres songs が表示される
```

**完了条件**:
- [ ] 全テーブルが作成されている
- [ ] 外部キー制約が設定されている

---

### 1.3 データ収集

#### Task 1.3.1: レート制限ユーティリティ

**作業内容**:
`apps/api/src/collectors/rate-limiter.ts` を作成:
```typescript
export class RateLimiter {
  private lastRequest: number = 0;
  private minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minInterval - elapsed)
      );
    }
    this.lastRequest = Date.now();
  }
}
```

**検証方法**:
```typescript
// Unit test
import { RateLimiter } from './rate-limiter';

test('rate limiter waits between requests', async () => {
  const limiter = new RateLimiter(2); // 2 req/sec = 500ms間隔
  const start = Date.now();
  await limiter.wait();
  await limiter.wait();
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(500);
});
```

**完了条件**:
- [ ] RateLimiter クラスが実装されている
- [ ] テストが通る

---

#### Task 1.3.2: MusicBrainz コレクター

**作業内容**:
`apps/api/src/collectors/musicbrainz.ts` を作成:
```typescript
import { RateLimiter } from './rate-limiter';

const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'MusicExplorer/1.0.0 (your@email.com)';

const rateLimiter = new RateLimiter(1); // 1 req/sec

interface MBArtist {
  id: string;
  name: string;
  'sort-name': string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
  aliases?: Array<{ name: string }>;
}

export async function fetchArtist(mbid: string): Promise<MBArtist | null> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist/${mbid}?fmt=json&inc=aliases`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  return response.json();
}

export async function searchArtists(query: string, limit = 10): Promise<MBArtist[]> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  const data = await response.json();
  return data.artists || [];
}
```

**検証方法**:
```typescript
// Integration test
import { fetchArtist, searchArtists } from './musicbrainz';

test('fetch artist by MBID', async () => {
  // Radiohead's MBID
  const artist = await fetchArtist('a74b1b7f-71a5-4011-9441-d0b5e4122711');
  expect(artist?.name).toBe('Radiohead');
});

test('search artists', async () => {
  const results = await searchArtists('radiohead');
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].name.toLowerCase()).toContain('radiohead');
});
```

**完了条件**:
- [ ] fetchArtist が動作する
- [ ] searchArtists が動作する
- [ ] レート制限が適用されている
- [ ] テストが通る

---

#### Task 1.3.3: Last.fm コレクター

**作業内容**:
`apps/api/src/collectors/lastfm.ts` を作成:
```typescript
import { RateLimiter } from './rate-limiter';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const rateLimiter = new RateLimiter(5); // 5 req/sec

interface LFMSimilarArtist {
  name: string;
  mbid?: string;
  match: string; // 0-1の類似度
}

export async function getSimilarArtists(artistName: string): Promise<LFMSimilarArtist[]> {
  await rateLimiter.wait();

  const params = new URLSearchParams({
    method: 'artist.getsimilar',
    artist: artistName,
    api_key: process.env.LASTFM_API_KEY!,
    format: 'json',
    limit: '30',
  });

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json();
  return data.similarartists?.artist || [];
}

export async function getArtistInfo(artistName: string) {
  await rateLimiter.wait();

  const params = new URLSearchParams({
    method: 'artist.getinfo',
    artist: artistName,
    api_key: process.env.LASTFM_API_KEY!,
    format: 'json',
  });

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = await response.json();
  return data.artist;
}
```

**検証方法**:
```typescript
// Integration test (requires API key)
import { getSimilarArtists, getArtistInfo } from './lastfm';

test('get similar artists', async () => {
  const similar = await getSimilarArtists('Radiohead');
  expect(similar.length).toBeGreaterThan(0);
});

test('get artist info', async () => {
  const info = await getArtistInfo('Radiohead');
  expect(info.name).toBe('Radiohead');
});
```

**完了条件**:
- [ ] getSimilarArtists が動作する
- [ ] getArtistInfo が動作する
- [ ] レート制限が適用されている
- [ ] テストが通る

---

#### Task 1.3.4: データ収集オーケストレーター

**作業内容**:
`apps/api/src/collectors/index.ts` を作成:
```typescript
import { db } from '@/lib/db';
import { artists, artistRelations } from '@/lib/db/schema';
import { fetchArtist, searchArtists } from './musicbrainz';
import { getSimilarArtists } from './lastfm';
import { eq } from 'drizzle-orm';

export async function collectArtist(mbidOrName: string) {
  // 1. MusicBrainzからアーティスト情報取得
  let mbArtist = await fetchArtist(mbidOrName);

  if (!mbArtist) {
    // MBIDでなければ検索
    const results = await searchArtists(mbidOrName);
    if (results.length === 0) {
      throw new Error(`Artist not found: ${mbidOrName}`);
    }
    mbArtist = results[0];
  }

  // 2. DBに保存
  const [savedArtist] = await db.insert(artists).values({
    mbid: mbArtist.id,
    name: mbArtist.name,
    sortName: mbArtist['sort-name'],
    country: mbArtist.country,
    aliases: mbArtist.aliases?.map(a => a.name) || [],
    beginDate: mbArtist['life-span']?.begin,
    endDate: mbArtist['life-span']?.end,
  }).onConflictDoUpdate({
    target: artists.mbid,
    set: { updatedAt: new Date() },
  }).returning();

  // 3. Last.fmから類似アーティスト取得
  const similarArtists = await getSimilarArtists(mbArtist.name);

  // 4. 類似アーティストを関係として保存
  for (const similar of similarArtists.slice(0, 10)) {
    if (!similar.mbid) continue;

    // 類似アーティストがDBに存在するか確認
    const [existingArtist] = await db
      .select()
      .from(artists)
      .where(eq(artists.mbid, similar.mbid))
      .limit(1);

    if (existingArtist) {
      await db.insert(artistRelations).values({
        fromArtistId: savedArtist.id,
        toArtistId: existingArtist.id,
        relationType: 'similar',
        strength: parseFloat(similar.match),
        source: 'lastfm',
      }).onConflictDoNothing();
    }
  }

  return savedArtist;
}
```

**検証方法**:
```typescript
// Integration test
import { collectArtist } from './collectors';

test('collect artist data', async () => {
  const artist = await collectArtist('Radiohead');
  expect(artist.name).toBe('Radiohead');
  expect(artist.mbid).toBeDefined();
});
```

**完了条件**:
- [ ] collectArtist がMusicBrainz + Last.fmからデータを取得できる
- [ ] アーティストがDBに保存される
- [ ] 類似アーティスト関係がDBに保存される
- [ ] テストが通る

---

#### Task 1.3.5: 初期データ収集スクリプト

**作業内容**:
`scripts/collect.ts` を作成:
```typescript
import { collectArtist } from '@/lib/collectors';

const SEED_ARTISTS = [
  'Radiohead',
  'The Beatles',
  'Nirvana',
  'David Bowie',
  'Queen',
  // ... 20-30 アーティスト
];

async function main() {
  console.log('Starting data collection...');

  for (const artistName of SEED_ARTISTS) {
    try {
      console.log(`Collecting: ${artistName}`);
      await collectArtist(artistName);
      console.log(`  ✓ ${artistName}`);
    } catch (error) {
      console.error(`  ✗ ${artistName}: ${error}`);
    }
  }

  console.log('Data collection complete!');
}

main();
```

**検証方法**:
```bash
bun run scripts/collect.ts
# 各アーティストが収集される

# Turso CLIで確認
turso db shell music-explorer
> SELECT COUNT(*) FROM artists;
# 20件以上
```

**完了条件**:
- [ ] 収集スクリプトが実行できる
- [ ] 20件以上のアーティストがDBに保存される
- [ ] アーティスト関係が保存される

---

## Phase 2: Webインターフェース

### 2.1 Hono API エンドポイント

#### Task 2.1.1: 検索API

**作業内容**:
`apps/api/src/routes/search.ts` を作成:
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { like, or } from 'drizzle-orm';
import { createDb, artists } from '@music-explorer/db';

const searchSchema = z.object({
  q: z.string().min(2),
});

export const searchRoute = new Hono<{ Bindings: Env }>()
  .get('/', zValidator('query', searchSchema), async (c) => {
    const { q } = c.req.valid('query');

    const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

    const results = await db
      .select()
      .from(artists)
      .where(
        or(
          like(artists.name, `%${q}%`),
          like(artists.sortName, `%${q}%`)
        )
      )
      .limit(20);

    return c.json(results);
  });
```

**検証方法**:
```bash
curl "http://localhost:8787/api/search?q=radio"
# アーティストの配列が返る
```

**完了条件**:
- [ ] `/api/search?q=xxx` が動作する
- [ ] 部分一致検索ができる
- [ ] 適切なエラーハンドリングがある

---

#### Task 2.1.2: アーティスト詳細API

**作業内容**:
`apps/api/src/routes/artists.ts` を作成:
```typescript
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, artists, artistRelations } from '@music-explorer/db';

export const artistsRoute = new Hono<{ Bindings: Env }>()
  .get('/:id', async (c) => {
    const id = c.req.param('id');

    const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    if (artist.length === 0) {
      return c.json({ error: 'Artist not found' }, 404);
    }

    // 関連アーティスト取得
    const relations = await db
      .select({
        relationType: artistRelations.relationType,
        strength: artistRelations.strength,
        artist: artists,
      })
      .from(artistRelations)
      .innerJoin(artists, eq(artistRelations.toArtistId, artists.id))
      .where(eq(artistRelations.fromArtistId, id));

    return c.json({
      ...artist[0],
      relations,
    });
  });
```

**検証方法**:
```bash
# まずアーティストIDを取得
curl "http://localhost:8787/api/search?q=radiohead"
# そのIDで詳細取得
curl "http://localhost:8787/api/artists/{id}"
```

**完了条件**:
- [ ] `/api/artists/:id` が動作する
- [ ] 関連アーティストも含まれる
- [ ] 存在しないIDで404が返る

---

#### Task 2.1.3: グラフデータAPI

**作業内容**:
`apps/api/src/routes/graph.ts` を作成:
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { createDb } from '@music-explorer/db';

const graphSchema = z.object({
  artistId: z.string(),
  depth: z.coerce.number().min(1).max(3).default(2),
});

export const graphRoute = new Hono<{ Bindings: Env }>()
  .get('/', zValidator('query', graphSchema), async (c) => {
    const { artistId, depth } = c.req.valid('query');

    const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

    // SQLite用の再帰CTE（PostgreSQLと若干異なる）
    const result = await db.all(sql`
      WITH RECURSIVE artist_network AS (
        SELECT
          a.id, a.name, a.image_url,
          0 as depth
        FROM artists a
        WHERE a.id = ${artistId}

        UNION ALL

        SELECT
          a2.id, a2.name, a2.image_url,
          an.depth + 1
        FROM artist_network an
        JOIN artist_relations ar ON ar.from_artist_id = an.id
        JOIN artists a2 ON a2.id = ar.to_artist_id
        WHERE an.depth < ${depth}
      )
      SELECT DISTINCT id, name, image_url, depth
      FROM artist_network
    `);

    // エッジ（関係）も取得
    const nodeIds = result.map((r: any) => r.id);
    const edges = await db.all(sql`
      SELECT
        from_artist_id as source,
        to_artist_id as target,
        strength,
        relation_type as type
      FROM artist_relations
      WHERE from_artist_id IN (${sql.join(nodeIds, sql`, `)})
        AND to_artist_id IN (${sql.join(nodeIds, sql`, `)})
    `);

    return c.json({
      nodes: result,
      edges: edges,
    });
  });
```

**検証方法**:
```bash
curl "http://localhost:8787/api/graph?artistId={id}&depth=2"
# { nodes: [...], edges: [...] }
```

**完了条件**:
- [ ] `/api/graph?artistId=xxx` が動作する
- [ ] depth パラメータが機能する
- [ ] nodes と edges が正しい形式で返る

---

#### Task 2.1.4: Hono RPC クライアント設定

**作業内容**:
`apps/api/src/index.ts` を更新:
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { searchRoute } from './routes/search';
import { artistsRoute } from './routes/artists';
import { graphRoute } from './routes/graph';

const app = new Hono()
  .use('*', cors())
  .route('/api/search', searchRoute)
  .route('/api/artists', artistsRoute)
  .route('/api/graph', graphRoute);

export type AppType = typeof app;
export default app;
```

`apps/web/src/lib/api.ts` を作成:
```typescript
import { hc } from 'hono/client';
import type { AppType } from '@music-explorer/api';

export const client = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:8787');
```

**完了条件**:
- [ ] 型安全なAPIクライアントが生成される
- [ ] フロントエンドからAPIを呼び出せる

---

### 2.2 Vite + React フロントエンド

#### Task 2.2.1: TanStack Router 設定

**作業内容**:
`apps/web/src/routes/__root.tsx` を作成:
```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
```

`apps/web/src/routes/index.tsx` を作成:
```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Music Explorer</h1>
      <p className="text-gray-600 mb-8">
        アーティストの関連ネットワークを探索しよう
      </p>
      <Link to="/explore">
        <Button size="lg">探索を始める</Button>
      </Link>
    </div>
  );
}
```

**完了条件**:
- [ ] TanStack Router が設定されている
- [ ] ホームページが表示される
- [ ] 探索ページへのリンクが動作する

---

#### Task 2.2.2: 検索コンポーネント（TanStack Query使用）

**作業内容**:
`apps/web/src/components/search/SearchBar.tsx` を作成:
```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { client } from '@/lib/api';

interface Artist {
  id: string;
  name: string;
  country?: string;
}

interface SearchBarProps {
  onSelect: (artist: Artist) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      const res = await client.api.search.$get({ query: { q: searchTerm } });
      return res.json();
    },
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = () => {
    setSearchTerm(query);
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex gap-2">
        <Input
          placeholder="アーティスト名を検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? '検索中...' : '検索'}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="mt-2 border rounded-md divide-y">
          {results.map((artist) => (
            <li
              key={artist.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onSelect(artist)}
            >
              {artist.name}
              {artist.country && (
                <span className="text-sm text-gray-500 ml-2">
                  ({artist.country})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**検証方法**:
- ブラウザで検索を実行
- 結果が表示される
- 項目をクリックで選択できる

**完了条件**:
- [ ] 検索入力ができる
- [ ] 検索結果が表示される
- [ ] ローディング状態が表示される
- [ ] TanStack Query でキャッシュが効く

---

#### Task 2.2.3: ネットワークグラフコンポーネント

**作業内容**:
`apps/web/src/components/graph/NetworkGraph.tsx` を作成:
```typescript
import { useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

interface Node {
  id: string;
  name: string;
  depth: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
  type: string;
}

interface NetworkGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
}

export function NetworkGraph({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);

  const elements = [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name,
        depth: node.depth,
      },
    })),
    ...edges.map((edge) => ({
      data: {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        strength: edge.strength,
      },
    })),
  ];

  const layout = {
    name: 'cose',
    animate: true,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
  };

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(label)',
        'font-size': '12px',
        'width': 40,
        'height': 40,
      },
    },
    {
      selector: 'node[depth = 0]',
      style: {
        'background-color': '#ef4444',
        'width': 60,
        'height': 60,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#94a3b8',
        'curve-style': 'bezier',
      },
    },
  ];

  return (
    <CytoscapeComponent
      elements={elements}
      layout={layout}
      stylesheet={stylesheet}
      style={{ width: '100%', height: '600px' }}
      cy={(cy) => {
        cyRef.current = cy;
        cy.on('tap', 'node', (evt) => {
          const nodeId = evt.target.id();
          onNodeClick?.(nodeId);
        });
      }}
    />
  );
}
```

**検証方法**:
- ブラウザでグラフが表示される
- ノードをドラッグできる
- ノードクリックでイベントが発火する

**完了条件**:
- [ ] グラフが描画される
- [ ] 中心ノードが強調表示される
- [ ] エッジが表示される
- [ ] インタラクションが動作する

---

#### Task 2.2.4: 探索ページ（TanStack Query使用）

**作業内容**:
`apps/web/src/routes/explore.tsx` を作成:
```typescript
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { SearchBar } from '@/components/search/SearchBar';
import { NetworkGraph } from '@/components/graph/NetworkGraph';
import { client } from '@/lib/api';

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
});

function ExplorePage() {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', selectedArtistId],
    queryFn: async () => {
      if (!selectedArtistId) return null;
      const res = await client.api.graph.$get({
        query: { artistId: selectedArtistId, depth: '2' },
      });
      return res.json();
    },
    enabled: !!selectedArtistId,
  });

  const handleNodeClick = (nodeId: string) => {
    setSelectedArtistId(nodeId);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Music Explorer</h1>

      <SearchBar onSelect={(artist) => setSelectedArtistId(artist.id)} />

      <div className="mt-4">
        {isLoading && <p>グラフを読み込み中...</p>}

        {graphData && (
          <NetworkGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
          />
        )}

        {!graphData && !isLoading && (
          <p className="text-gray-500">
            アーティストを検索して、関連ネットワークを探索しましょう
          </p>
        )}
      </div>
    </div>
  );
}
```

**検証方法**:
```bash
cd apps/web && bun run dev
# http://localhost:5173/explore にアクセス
# 検索 → グラフ表示 → ノードクリックで再探索
```

**完了条件**:
- [ ] 検索からグラフ表示までの一連の流れが動作する
- [ ] ノードクリックで別のアーティストのグラフに遷移できる
- [ ] ローディング状態が適切に表示される
- [ ] TanStack Query でグラフデータがキャッシュされる

---

### 2.3 テスト（Vitest）

#### Task 2.3.1: Vitest 設定

**作業内容**:
`apps/api/vitest.config.ts` を作成:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

`apps/web/vitest.config.ts` を作成:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**完了条件**:
- [ ] Vitest が設定されている
- [ ] `bun run test` で実行できる

---

#### Task 2.3.2: API テスト

**作業内容**:
`apps/api/src/routes/search.test.ts` を作成:
```typescript
import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Search API', () => {
  it('should return artists matching query', async () => {
    const res = await app.request('/api/search?q=radio');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return 400 for short query', async () => {
    const res = await app.request('/api/search?q=a');
    expect(res.status).toBe(400);
  });
});
```

**完了条件**:
- [ ] 検索APIのテスト
- [ ] アーティスト詳細APIのテスト
- [ ] グラフAPIのテスト

---

#### Task 2.3.3: E2E テスト

**作業内容**:
`tests/e2e/explore.spec.ts` を作成（Playwright）

**完了条件**:
- [ ] 検索→グラフ表示のE2Eテスト
- [ ] ノードクリックのテスト

---

## 完了チェックリスト

### Phase 1 完了条件
- [ ] Bun + Turborepo でモノレポがセットアップされている
- [ ] Vite + React フロントエンドが動作する
- [ ] Hono バックエンドが動作する
- [ ] Turso DBがセットアップされている
- [ ] Drizzle スキーマがマイグレーションされている
- [ ] MusicBrainz コレクターが動作する
- [ ] Last.fm コレクターが動作する
- [ ] 20件以上のアーティストがDBに保存されている
- [ ] アーティスト関係がDBに保存されている

### Phase 2 完了条件
- [ ] Hono 検索APIが動作する
- [ ] Hono グラフAPIが動作する
- [ ] Hono RPC クライアントが型安全に動作する
- [ ] TanStack Router でルーティングが動作する
- [ ] TanStack Query で検索が動作する
- [ ] ネットワークグラフが表示される
- [ ] ノードクリックで再探索できる
- [ ] Vitest テストが全て通る

### MVP 完了条件
- [ ] 上記全てが満たされている
- [ ] Biome でLint/Formatエラーがない
- [ ] README.md にセットアップ手順がある

### デプロイ準備
- [ ] Cloudflare Pages にフロントエンドがデプロイできる
- [ ] Cloudflare Workers にAPIがデプロイできる
- [ ] 環境変数が正しく設定されている
