import { createClient } from "@libsql/client";
import { and, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../../../packages/db/src/schema";
import { getArtistRelationsWithTypes } from "../src/collectors/musicbrainz";
import { computeRelationshipStrength } from "../src/collectors/scoring";

const { artists, artistRelations } = schema;

type Database = LibSQLDatabase<typeof schema>;

export interface RebuildOptions {
  db: Database;
  dryRun?: boolean;
  sleepMs?: number;
  verbose?: boolean;
}

export interface RebuildResult {
  artistsProcessed: number;
  relationsCreated: number;
  relationsSkipped: number;
  relationsExisting: number;
  errors: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rebuildRelations(options: RebuildOptions): Promise<RebuildResult> {
  const { db, dryRun = false, sleepMs = 1500, verbose = false } = options;

  const result: RebuildResult = {
    artistsProcessed: 0,
    relationsCreated: 0,
    relationsSkipped: 0,
    relationsExisting: 0,
    errors: [],
  };

  // Get all artists
  const allArtists = await db.select().from(artists);

  // Create MBID -> artist mapping for fast lookup
  const mbidToArtist = new Map<string, (typeof allArtists)[0]>();
  for (const artist of allArtists) {
    if (artist.mbid) {
      mbidToArtist.set(artist.mbid, artist);
    }
  }

  if (verbose) {
    console.log(`Found ${allArtists.length} artists (${mbidToArtist.size} with MBIDs)`);
  }

  // Process each artist
  for (const artist of allArtists) {
    if (!artist.mbid) {
      continue;
    }

    if (verbose) {
      console.log(`Processing: ${artist.name}`);
    }

    try {
      // Fetch relations from MusicBrainz
      const mbRelations = await getArtistRelationsWithTypes(artist.mbid);
      const scoredRelations = computeRelationshipStrength(mbRelations);

      for (const relation of scoredRelations) {
        const targetArtist = mbidToArtist.get(relation.artist.id);

        if (!targetArtist) {
          result.relationsSkipped++;
          continue;
        }

        // Skip self-references
        if (targetArtist.id === artist.id) {
          continue;
        }

        // Check if relation already exists (in either direction)
        const existingRelation = await db
          .select()
          .from(artistRelations)
          .where(
            or(
              and(
                eq(artistRelations.fromArtistId, artist.id),
                eq(artistRelations.toArtistId, targetArtist.id),
              ),
              and(
                eq(artistRelations.fromArtistId, targetArtist.id),
                eq(artistRelations.toArtistId, artist.id),
              ),
            ),
          )
          .limit(1);

        if (existingRelation.length > 0) {
          result.relationsExisting++;
          if (verbose) {
            console.log(`  - Relation exists: ${artist.name} <-> ${targetArtist.name}`);
          }
          continue;
        }

        // Create new relation
        if (!dryRun) {
          await db.insert(artistRelations).values({
            fromArtistId: artist.id,
            toArtistId: targetArtist.id,
            relationType: relation.type,
            strength: relation.strength,
            source: "musicbrainz",
          });
        }

        result.relationsCreated++;
        if (verbose) {
          console.log(
            `  + Created: ${artist.name} -> ${targetArtist.name} (${relation.type}, ${relation.strength})`,
          );
        }
      }

      result.artistsProcessed++;

      // Rate limiting
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    } catch (error) {
      const errorMsg = `Error processing ${artist.name}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      if (verbose) {
        console.error(`  ! ${errorMsg}`);
      }
    }
  }

  return result;
}

// CLI entrypoint
async function main() {
  console.log("🔗 Rebuilding artist relations...\n");

  const dbUrl = process.env.TURSO_DATABASE_URL || "file:../../packages/db/local.db";
  const dbToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url: dbUrl, authToken: dbToken });
  const db = drizzle(client, { schema });

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("🏃 DRY RUN MODE - No changes will be made\n");
  }

  const result = await rebuildRelations({
    db,
    dryRun,
    verbose: true,
  });

  console.log("\n📊 Summary:");
  console.log(`   Artists processed: ${result.artistsProcessed}`);
  console.log(`   Relations created: ${result.relationsCreated}`);
  console.log(`   Relations skipped (target not in DB): ${result.relationsSkipped}`);
  console.log(`   Relations already existing: ${result.relationsExisting}`);

  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`);
    for (const error of result.errors) {
      console.log(`     - ${error}`);
    }
  }

  // Show final count
  const finalRelations = await db.select().from(artistRelations);
  console.log(`\n📈 Total relations in database: ${finalRelations.length}`);

  process.exit(result.errors.length > 0 ? 1 : 0);
}

// Only run main if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
