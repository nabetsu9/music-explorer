import { z } from "zod";

export const artistSchema = z.object({
  id: z.string().uuid(),
  mbid: z.string().nullable(),
  name: z.string(),
  sortName: z.string().nullable(),
  country: z.string().nullable(),
  aliases: z.array(z.string()),
  beginDate: z.string().nullable(),
  endDate: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Artist = z.infer<typeof artistSchema>;

export const artistRelationSchema = z.object({
  id: z.string().uuid(),
  fromArtistId: z.string().uuid(),
  toArtistId: z.string().uuid(),
  relationType: z.string(),
  strength: z.number().nullable(),
  source: z.string(),
});

export type ArtistRelation = z.infer<typeof artistRelationSchema>;

export const graphNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  depth: z.number(),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;

export const graphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  strength: z.number().nullable(),
  type: z.string(),
});

export type GraphEdge = z.infer<typeof graphEdgeSchema>;

export const graphDataSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export type GraphData = z.infer<typeof graphDataSchema>;
