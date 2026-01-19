import { Hono } from "hono";
import { cors } from "hono/cors";
import { artistsRoute } from "./routes/artists";
import { graphRoute } from "./routes/graph";
import { searchRoute } from "./routes/search";

export type Env = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  LASTFM_API_KEY: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>()
  .use("*", cors())
  .get("/", (c) => c.json({ message: "Music Explorer API" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/api/search", searchRoute)
  .route("/api/artists", artistsRoute)
  .route("/api/graph", graphRoute);

export type AppType = typeof app;
export default app;
