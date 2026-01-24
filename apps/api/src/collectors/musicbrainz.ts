import { RateLimiter } from "./rate-limiter";

const BASE_URL = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MusicExplorer/1.0.0 (music-explorer@example.com)";

const rateLimiter = new RateLimiter(1);

export interface MBArtist {
  id: string;
  name: string;
  "sort-name": string;
  country?: string;
  "life-span"?: {
    begin?: string;
    end?: string;
  };
  aliases?: Array<{ name: string }>;
}

interface MBSearchResponse {
  artists: MBArtist[];
}

export async function fetchArtist(mbid: string): Promise<MBArtist | null> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist/${mbid}?fmt=json&inc=aliases`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  return response.json() as Promise<MBArtist>;
}

export async function searchArtists(query: string, limit = 10): Promise<MBArtist[]> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  const data = (await response.json()) as MBSearchResponse;
  return data.artists || [];
}

export async function getArtistRelations(mbid: string): Promise<MBArtist[]> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist/${mbid}?fmt=json&inc=artist-rels`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  interface RelationsResponse {
    relations?: Array<{
      type: string;
      artist?: MBArtist;
    }>;
  }

  const data = (await response.json()) as RelationsResponse;
  return (data.relations || []).filter((r) => r.artist).map((r) => r.artist as MBArtist);
}

export interface MBRelation {
  type: string;
  direction: "forward" | "backward";
  artist: MBArtist;
  attributes?: string[];
}

export async function getArtistRelationsWithTypes(mbid: string): Promise<MBRelation[]> {
  await rateLimiter.wait();

  const url = `${BASE_URL}/artist/${mbid}?fmt=json&inc=artist-rels`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  interface RelationsResponse {
    relations?: Array<{
      type: string;
      direction: "forward" | "backward";
      artist?: MBArtist;
      attributes?: string[];
    }>;
  }

  const data = (await response.json()) as RelationsResponse;
  return (data.relations || [])
    .filter((r) => r.artist)
    .map((r) => ({
      type: r.type,
      direction: r.direction,
      artist: r.artist as MBArtist,
      attributes: r.attributes,
    }));
}
