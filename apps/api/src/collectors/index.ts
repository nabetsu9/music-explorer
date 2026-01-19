import type * as schema from "@music-explorer/db";
import { artistRelations, artists } from "@music-explorer/db";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { extractImageUrl, getArtistInfo, getSimilarArtists } from "./lastfm";
import { type MBArtist, fetchArtist, searchArtists } from "./musicbrainz";

type Database = LibSQLDatabase<typeof schema>;

interface CollectorOptions {
  db: Database;
  lastfmApiKey: string;
}

export async function collectArtist(mbidOrName: string, options: CollectorOptions) {
  const { db, lastfmApiKey } = options;

  let mbArtist: MBArtist | null = null;

  if (mbidOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    mbArtist = await fetchArtist(mbidOrName);
  }

  if (!mbArtist) {
    const results = await searchArtists(mbidOrName);
    if (results.length === 0) {
      throw new Error(`Artist not found: ${mbidOrName}`);
    }
    mbArtist = results[0];
  }

  const lfmInfo = await getArtistInfo(mbArtist.name, lastfmApiKey);
  const imageUrl = lfmInfo?.image ? extractImageUrl(lfmInfo.image) : null;

  const existingArtist = await db
    .select()
    .from(artists)
    .where(eq(artists.mbid, mbArtist.id))
    .limit(1);

  let savedArtist: typeof artists.$inferSelect;

  if (existingArtist.length > 0) {
    const updated = await db
      .update(artists)
      .set({
        name: mbArtist.name,
        sortName: mbArtist["sort-name"],
        country: mbArtist.country,
        aliases: mbArtist.aliases?.map((a) => a.name) || [],
        beginDate: mbArtist["life-span"]?.begin,
        endDate: mbArtist["life-span"]?.end,
        imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(artists.mbid, mbArtist.id))
      .returning();
    savedArtist = updated[0];
  } else {
    const inserted = await db
      .insert(artists)
      .values({
        mbid: mbArtist.id,
        name: mbArtist.name,
        sortName: mbArtist["sort-name"],
        country: mbArtist.country,
        aliases: mbArtist.aliases?.map((a) => a.name) || [],
        beginDate: mbArtist["life-span"]?.begin,
        endDate: mbArtist["life-span"]?.end,
        imageUrl,
      })
      .returning();
    savedArtist = inserted[0];
  }

  const similarArtists = await getSimilarArtists(mbArtist.name, lastfmApiKey);

  for (const similar of similarArtists.slice(0, 10)) {
    if (!similar.mbid) continue;

    const existingRelated = await db
      .select()
      .from(artists)
      .where(eq(artists.mbid, similar.mbid))
      .limit(1);

    if (existingRelated.length > 0) {
      const existingRelation = await db
        .select()
        .from(artistRelations)
        .where(eq(artistRelations.fromArtistId, savedArtist.id))
        .limit(1);

      if (existingRelation.length === 0) {
        await db.insert(artistRelations).values({
          fromArtistId: savedArtist.id,
          toArtistId: existingRelated[0].id,
          relationType: "similar",
          strength: Number.parseFloat(similar.match),
          source: "lastfm",
        });
      }
    }
  }

  return savedArtist;
}

export { fetchArtist, searchArtists, getArtistRelations } from "./musicbrainz";
export { getSimilarArtists, getArtistInfo } from "./lastfm";
