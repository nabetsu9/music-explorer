import { zValidator } from "@hono/zod-validator";
import { createDb, searchArtists } from "@music-explorer/db";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index";

const searchSchema = z.object({
  q: z.string().min(2),
});

export const searchRoute = new Hono<{ Bindings: Env }>().get(
  "/",
  zValidator("query", searchSchema),
  async (c) => {
    const { q } = c.req.valid("query");

    const db = createDb(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN);

    const results = await searchArtists(db, q, 20);

    return c.json(results);
  },
);
