import { eq, like, or } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "../schema";
import { artistRelations, artists } from "../schema";

type Database = LibSQLDatabase<typeof schema>;

export async function searchArtists(db: Database, query: string, limit = 20) {
  return db
    .select()
    .from(artists)
    .where(or(like(artists.name, `%${query}%`), like(artists.sortName, `%${query}%`)))
    .limit(limit);
}

export async function getArtistById(db: Database, id: string) {
  const result = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

  return result[0] ?? null;
}

export async function getArtistWithRelations(db: Database, id: string) {
  const artist = await getArtistById(db, id);
  if (!artist) return null;

  const relations = await db
    .select({
      relationType: artistRelations.relationType,
      strength: artistRelations.strength,
      artist: artists,
    })
    .from(artistRelations)
    .innerJoin(artists, eq(artistRelations.toArtistId, artists.id))
    .where(eq(artistRelations.fromArtistId, id));

  return {
    ...artist,
    relations,
  };
}
