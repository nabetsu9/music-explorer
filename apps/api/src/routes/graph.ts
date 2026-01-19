import { zValidator } from "@hono/zod-validator";
import { createDb, getArtistNetwork } from "@music-explorer/db";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index";

const graphSchema = z.object({
  artistId: z.string(),
  depth: z.coerce.number().min(1).max(3).default(2),
});

export const graphRoute = new Hono<{ Bindings: Env }>().get(
  "/",
  zValidator("query", graphSchema),
  async (c) => {
    const { artistId, depth } = c.req.valid("query");

    const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

    const graphData = await getArtistNetwork(db, artistId, depth);

    return c.json(graphData);
  },
);
