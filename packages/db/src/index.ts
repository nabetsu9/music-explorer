import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(url: string, authToken?: string) {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

export * from "./schema";
export * from "./queries";
export type { InferInsertModel, InferSelectModel } from "drizzle-orm";
