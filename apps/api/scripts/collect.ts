import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../../packages/db/src/schema";
import { collectArtist } from "../src/collectors";

const { artists, artistRelations } = schema;

function createDb(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

// Seed artists - well-known artists with rich relationship data
const SEED_ARTISTS = [
  // Rock / Alternative
  "Radiohead",
  "The Beatles",
  "Nirvana",
  "David Bowie",
  "Queen",
  "Pink Floyd",
  "Led Zeppelin",
  "The Rolling Stones",
  "Bob Dylan",
  "Jimi Hendrix",
  // Post-Punk / New Wave
  "The Clash",
  "Talking Heads",
  "Joy Division",
  "New Order",
  "The Smiths",
  "Depeche Mode",
  // Electronic
  "Kraftwerk",
  "Daft Punk",
  "Aphex Twin",
  // Alternative / Indie
  "R.E.M.",
  "Pixies",
  "Sonic Youth",
  // Band members (high relationship potential)
  "Thom Yorke",
  "John Lennon",
  "Paul McCartney",
  "George Harrison",
  "Dave Grohl",
  "Foo Fighters",
  // Collaborators
  "Brian Eno",
  "Iggy Pop",
  "U2",
  "Roxy Music",
  // UK Post-punk / Alternative
  "The Cure",
  "Siouxsie and the Banshees",
  "Echo & the Bunnymen",
  "Wire",
  // Electronic / Trip-hop
  "Massive Attack",
  "Boards of Canada",
  "Autechre",
  "Portishead",
];

async function main() {
  console.log("🎵 Starting data collection...\n");

  // Use local SQLite for development
  const dbUrl = process.env.TURSO_DATABASE_URL || "file:../../packages/db/local.db";
  const dbToken = process.env.TURSO_AUTH_TOKEN;

  const db = createDb(dbUrl, dbToken);

  let collected = 0;
  let failed = 0;

  for (const artistName of SEED_ARTISTS) {
    try {
      console.log(`📥 Collecting: ${artistName}`);
      const artist = await collectArtist(artistName, { db });
      console.log(`   ✅ Saved: ${artist.name} (${artist.country || "Unknown"})`);
      if (artist.imageUrl) {
        console.log(`   🖼️  Image: ${artist.imageSource}`);
      }
      if (artist.wikidataId) {
        console.log(`   📚 Wikidata: ${artist.wikidataId}`);
      }
      collected++;
    } catch (error) {
      console.error(`   ❌ Failed: ${artistName}`);
      console.error(`      ${error instanceof Error ? error.message : error}`);
      failed++;
    }

    // Rate limiting: MusicBrainz = 1 req/sec, add buffer
    await sleep(2500);
  }

  console.log("\n📊 Collection complete!");
  console.log(`   Collected: ${collected}`);
  console.log(`   Failed: ${failed}`);

  // Show summary
  const allArtists = await db.select().from(artists);
  const allRelations = await db.select().from(artistRelations);

  console.log(`\n📈 Database summary:`);
  console.log(`   Artists: ${allArtists.length}`);
  console.log(`   Relations: ${allRelations.length}`);

  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
