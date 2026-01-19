import { createDb, getArtistWithRelations } from "@music-explorer/db";
import { Hono } from "hono";
import type { Env } from "../index";

export const artistsRoute = new Hono<{ Bindings: Env }>().get("/:id", async (c) => {
  const id = c.req.param("id");

  const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

  const artist = await getArtistWithRelations(db, id);

  if (!artist) {
    return c.json({ error: "Artist not found" }, 404);
  }

  return c.json(artist);
});
