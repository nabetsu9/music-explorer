/**
 * Large-scale data collection script
 * Features:
 * - Progress tracking with resumability
 * - Relationship following to discover new artists
 * - Detailed logging
 * - Estimated time remaining
 */

import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as fs from "node:fs";
import * as schema from "../../../packages/db/src/schema";
import { collectArtist } from "../src/collectors";
import { getArtistRelationsWithTypes } from "../src/collectors/musicbrainz";
import { UNIQUE_SEED_ARTISTS } from "./seeds/artists";

const { artists, artistRelations } = schema;

const PROGRESS_FILE = "./collection-progress.json";
const SLEEP_MS = 2500; // MusicBrainz rate limit buffer

interface Progress {
  completed: string[];
  failed: string[];
  discovered: string[];
  startedAt: string;
  lastUpdatedAt: string;
}

function createDb(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, "utf-8");
    return JSON.parse(data);
  }
  return {
    completed: [],
    failed: [],
    discovered: [],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function saveProgress(progress: Progress) {
  progress.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const followRelations = args.includes("--follow");
  const maxArtists = args.find((a) => a.startsWith("--max="));
  const maxCount = maxArtists ? Number.parseInt(maxArtists.split("=")[1], 10) : undefined;
  const resetProgress = args.includes("--reset");

  console.log("🎵 Large-scale data collection\n");
  console.log("Options:");
  console.log(`  --follow: ${followRelations ? "Yes" : "No"} (discover artists from relationships)`);
  console.log(`  --max: ${maxCount || "Unlimited"}`);
  console.log(`  --reset: ${resetProgress ? "Yes" : "No"}\n`);

  if (resetProgress && fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log("Progress reset.\n");
  }

  const dbUrl = process.env.TURSO_DATABASE_URL || "file:../../packages/db/local.db";
  const dbToken = process.env.TURSO_AUTH_TOKEN;
  const db = createDb(dbUrl, dbToken);

  const progress = loadProgress();
  const completedSet = new Set(progress.completed);
  const failedSet = new Set(progress.failed);

  // Get existing artists from DB to avoid duplicates
  const existingArtists = await db.select({ name: artists.name }).from(artists);
  const existingNames = new Set(existingArtists.map((a) => a.name.toLowerCase()));

  // Build collection queue
  let queue = UNIQUE_SEED_ARTISTS.filter(
    (name) =>
      !completedSet.has(name) &&
      !failedSet.has(name) &&
      !existingNames.has(name.toLowerCase()),
  );

  // Add discovered artists if following relations
  if (followRelations) {
    const discoveredNotProcessed = progress.discovered.filter(
      (name) =>
        !completedSet.has(name) &&
        !failedSet.has(name) &&
        !existingNames.has(name.toLowerCase()),
    );
    queue = [...queue, ...discoveredNotProcessed];
  }

  // Apply max limit
  if (maxCount) {
    queue = queue.slice(0, maxCount);
  }

  console.log(`📊 Status:`);
  console.log(`   Seed artists: ${UNIQUE_SEED_ARTISTS.length}`);
  console.log(`   Already in DB: ${existingNames.size}`);
  console.log(`   Previously completed: ${completedSet.size}`);
  console.log(`   Previously failed: ${failedSet.size}`);
  console.log(`   Queue size: ${queue.length}`);

  const estimatedTime = queue.length * SLEEP_MS;
  console.log(`   Estimated time: ${formatTime(estimatedTime)}\n`);

  if (queue.length === 0) {
    console.log("✅ Nothing to collect. All artists are already processed.");
    await showSummary(db);
    return;
  }

  console.log("Starting collection...\n");
  const startTime = Date.now();
  let processed = 0;

  for (const artistName of queue) {
    processed++;
    const elapsed = Date.now() - startTime;
    const avgTime = elapsed / processed;
    const remaining = avgTime * (queue.length - processed);

    console.log(
      `[${processed}/${queue.length}] 📥 ${artistName} (ETA: ${formatTime(remaining)})`,
    );

    try {
      const artist = await collectArtist(artistName, { db });
      console.log(`   ✅ ${artist.name} (${artist.country || "?"})`);

      progress.completed.push(artistName);

      // Discover related artists
      if (followRelations && artist.mbid) {
        try {
          const relations = await getArtistRelationsWithTypes(artist.mbid);
          for (const rel of relations) {
            const relatedName = rel.artist.name;
            if (
              !completedSet.has(relatedName) &&
              !failedSet.has(relatedName) &&
              !existingNames.has(relatedName.toLowerCase()) &&
              !progress.discovered.includes(relatedName)
            ) {
              progress.discovered.push(relatedName);
            }
          }
          if (relations.length > 0) {
            console.log(`   🔗 Discovered ${relations.length} related artists`);
          }
        } catch {
          // Ignore relation fetch errors
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`);
      progress.failed.push(artistName);
    }

    saveProgress(progress);
    await sleep(SLEEP_MS);
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n⏱️  Total time: ${formatTime(totalTime)}`);

  await showSummary(db);

  // Run rebuild-relations if we collected new artists
  if (processed > 0) {
    console.log("\n🔗 Rebuilding relations...");
    const { rebuildRelations } = await import("./rebuild-relations");
    const result = await rebuildRelations({ db, sleepMs: 1500, verbose: false });
    console.log(`   Created: ${result.relationsCreated} new relations`);
  }

  console.log("\n✅ Collection complete!");
}

async function showSummary(db: ReturnType<typeof createDb>) {
  const allArtists = await db.select().from(artists);
  const allRelations = await db.select().from(artistRelations);

  console.log(`\n📈 Database summary:`);
  console.log(`   Artists: ${allArtists.length}`);
  console.log(`   Relations: ${allRelations.length}`);

  // Show artists with most relations
  const relationCounts = new Map<string, number>();
  for (const rel of allRelations) {
    relationCounts.set(rel.fromArtistId, (relationCounts.get(rel.fromArtistId) || 0) + 1);
    relationCounts.set(rel.toArtistId, (relationCounts.get(rel.toArtistId) || 0) + 1);
  }

  const artistMap = new Map(allArtists.map((a) => [a.id, a.name]));
  const topArtists = [...relationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ name: artistMap.get(id) || id, count }));

  if (topArtists.length > 0) {
    console.log(`\n🏆 Top connected artists:`);
    for (const { name, count } of topArtists) {
      console.log(`   ${name}: ${count} connections`);
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
