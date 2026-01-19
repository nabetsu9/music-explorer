import { createDb } from "@music-explorer/db";
import { collectArtist } from "../apps/api/src/collectors";

const SEED_ARTISTS = [
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
  "The Clash",
  "Talking Heads",
  "R.E.M.",
  "Pixies",
  "Sonic Youth",
  "Joy Division",
  "New Order",
  "The Smiths",
  "Depeche Mode",
  "Kraftwerk",
];

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_AUTH_TOKEN;
  const lastfmKey = process.env.LASTFM_API_KEY;

  if (!dbUrl || !lastfmKey) {
    console.error("Missing environment variables:");
    console.error("  TURSO_DATABASE_URL:", dbUrl ? "✓" : "✗");
    console.error("  TURSO_AUTH_TOKEN:", dbToken ? "✓" : "optional");
    console.error("  LASTFM_API_KEY:", lastfmKey ? "✓" : "✗");
    process.exit(1);
  }

  const db = createDb(dbUrl, dbToken);

  console.log("Starting data collection...\n");

  let successCount = 0;
  let failCount = 0;

  for (const artistName of SEED_ARTISTS) {
    try {
      console.log(`Collecting: ${artistName}`);
      const artist = await collectArtist(artistName, { db, lastfmApiKey: lastfmKey });
      console.log(`  ✓ ${artist.name} (${artist.country || "Unknown country"})`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ ${artistName}: ${error instanceof Error ? error.message : error}`);
      failCount++;
    }
  }

  console.log("\nData collection complete!");
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
}

main().catch(console.error);
