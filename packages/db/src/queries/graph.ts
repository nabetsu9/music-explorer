import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "../schema";

type Database = LibSQLDatabase<typeof schema>;

interface GraphNode {
  id: string;
  name: string;
  image_url: string | null;
  depth: number;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number | null;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function getArtistNetwork(
  db: Database,
  artistId: string,
  maxDepth = 2,
): Promise<GraphData> {
  const nodesResult = await db.all<GraphNode>(sql`
    WITH RECURSIVE artist_network AS (
      SELECT
        a.id, a.name, a.image_url,
        0 as depth
      FROM artists a
      WHERE a.id = ${artistId}

      UNION ALL

      SELECT
        a2.id, a2.name, a2.image_url,
        an.depth + 1
      FROM artist_network an
      JOIN artist_relations ar ON ar.from_artist_id = an.id
      JOIN artists a2 ON a2.id = ar.to_artist_id
      WHERE an.depth < ${maxDepth}
    )
    SELECT DISTINCT id, name, image_url, MIN(depth) as depth
    FROM artist_network
    GROUP BY id, name, image_url
  `);

  if (nodesResult.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeIds = nodesResult.map((n) => n.id);

  const edgesResult = await db.all<GraphEdge>(sql`
    SELECT
      from_artist_id as source,
      to_artist_id as target,
      strength,
      relation_type as type
    FROM artist_relations
    WHERE from_artist_id IN ${nodeIds}
      AND to_artist_id IN ${nodeIds}
  `);

  return {
    nodes: nodesResult,
    edges: edgesResult,
  };
}
