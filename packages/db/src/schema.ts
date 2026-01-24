import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamp = () => text("created_at").default(sql`(datetime('now'))`).notNull();

export const artists = sqliteTable("artists", {
  id: id(),
  mbid: text("mbid").unique(),
  wikidataId: text("wikidata_id"),
  name: text("name").notNull(),
  sortName: text("sort_name"),
  country: text("country"),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().default([]),
  beginDate: text("begin_date"),
  endDate: text("end_date"),
  imageUrl: text("image_url"),
  imageSource: text("image_source").$type<"wikidata" | "lastfm" | null>(),
  createdAt: timestamp(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const artistRelations = sqliteTable("artist_relations", {
  id: id(),
  fromArtistId: text("from_artist_id")
    .references(() => artists.id)
    .notNull(),
  toArtistId: text("to_artist_id")
    .references(() => artists.id)
    .notNull(),
  relationType: text("relation_type").notNull(),
  strength: real("strength").default(1.0),
  source: text("source").notNull(),
});

export const genres = sqliteTable("genres", {
  id: id(),
  name: text("name").notNull().unique(),
  parentId: text("parent_id").references(() => genres.id),
});

export const artistGenres = sqliteTable("artist_genres", {
  artistId: text("artist_id")
    .references(() => artists.id)
    .notNull(),
  genreId: text("genre_id")
    .references(() => genres.id)
    .notNull(),
  weight: real("weight").default(1.0),
  source: text("source").default("wikidata"),
});

export const songs = sqliteTable("songs", {
  id: id(),
  mbid: text("mbid").unique(),
  title: text("title").notNull(),
  duration: integer("duration"),
  artistId: text("artist_id")
    .references(() => artists.id)
    .notNull(),
  releaseDate: text("release_date"),
});
