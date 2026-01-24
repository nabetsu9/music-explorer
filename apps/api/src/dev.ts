import { Hono } from "hono";
import { cors } from "hono/cors";
import { artistsRoute } from "./routes/artists";
import { graphRoute } from "./routes/graph";
import { searchRoute } from "./routes/search";

// Environment variables for local development
const env = {
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "file:../../packages/db/local.db",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "",
  LASTFM_API_KEY: process.env.LASTFM_API_KEY || "",
  ENVIRONMENT: "development",
};

type Env = typeof env;

const app = new Hono<{ Bindings: Env }>()
  .use("*", cors())
  .use("*", async (c, next) => {
    // Inject env bindings for local dev
    c.env = env as Env;
    await next();
  })
  .get("/", (c) => c.json({ message: "Music Explorer API" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/api/search", searchRoute)
  .route("/api/artists", artistsRoute)
  .route("/api/graph", graphRoute);

const port = 8787;
console.log(`🚀 Server running at http://localhost:${port}`);

export default {
  fetch: app.fetch,
  port,
};
