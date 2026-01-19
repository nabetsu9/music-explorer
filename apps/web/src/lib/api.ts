const API_URL = import.meta.env.VITE_API_URL || "";

export interface Artist {
  id: string;
  name: string;
  sortName: string | null;
  country: string | null;
  aliases: string[];
  beginDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  mbid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphNode {
  id: string;
  name: string;
  image_url: string | null;
  depth: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number | null;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const api = {
  search: async (query: string): Promise<Artist[]> => {
    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      throw new Error(`Search failed: ${res.status}`);
    }
    return res.json();
  },

  getArtist: async (id: string): Promise<Artist & { relations: unknown[] }> => {
    const res = await fetch(`${API_URL}/api/artists/${id}`);
    if (!res.ok) {
      throw new Error(`Get artist failed: ${res.status}`);
    }
    return res.json();
  },

  getGraph: async (artistId: string, depth = 2): Promise<GraphData> => {
    const res = await fetch(`${API_URL}/api/graph?artistId=${artistId}&depth=${depth}`);
    if (!res.ok) {
      throw new Error(`Get graph failed: ${res.status}`);
    }
    return res.json();
  },
};
