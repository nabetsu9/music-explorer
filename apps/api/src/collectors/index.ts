import type * as schema from "@music-explorer/db";
import { artistRelations, artists } from "@music-explorer/db";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  type MBArtist,
  fetchArtist,
  getArtistRelationsWithTypes,
  searchArtists,
} from "./musicbrainz";
import { computeRelationshipStrength } from "./scoring";
import { fetchArtistByMBID } from "./wikidata";

type Database = LibSQLDatabase<typeof schema>;

interface CollectorOptions {
  db: Database;
}

export async function collectArtist(mbidOrName: string, options: CollectorOptions) {
  const { db } = options;

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

  const wikidataInfo = await fetchArtistByMBID(mbArtist.id);
  const imageUrl = wikidataInfo?.imageUrl || null;
  const imageSource = wikidataInfo?.imageUrl ? ("wikidata" as const) : null;
  const wikidataId = wikidataInfo?.wikidataId || null;

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
        imageSource,
        wikidataId,
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
        imageSource,
        wikidataId,
      })
      .returning();
    savedArtist = inserted[0];
  }

  const mbRelations = await getArtistRelationsWithTypes(mbArtist.id);
  const scoredRelations = computeRelationshipStrength(mbRelations);

  for (const relation of scoredRelations) {
    const existingRelated = await db
      .select()
      .from(artists)
      .where(eq(artists.mbid, relation.artist.id))
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
          relationType: relation.type,
          strength: relation.strength,
          source: "musicbrainz",
        });
      }
    }
  }

  return savedArtist;
}

export { fetchArtist, getArtistRelationsWithTypes, searchArtists } from "./musicbrainz";
export { fetchArtistByMBID } from "./wikidata";
export { computeRelationshipStrength } from "./scoring";
