import { RateLimiter } from "./rate-limiter";

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const rateLimiter = new RateLimiter(5);

export interface LFMSimilarArtist {
  name: string;
  mbid?: string;
  match: string;
}

interface SimilarArtistsResponse {
  similarartists?: {
    artist: LFMSimilarArtist[];
  };
}

interface ArtistInfoResponse {
  artist?: {
    name: string;
    mbid?: string;
    url: string;
    image?: Array<{ "#text": string; size: string }>;
    tags?: {
      tag: Array<{ name: string }>;
    };
    bio?: {
      summary: string;
    };
  };
}

export async function getSimilarArtists(
  artistName: string,
  apiKey: string,
): Promise<LFMSimilarArtist[]> {
  await rateLimiter.wait();

  const params = new URLSearchParams({
    method: "artist.getsimilar",
    artist: artistName,
    api_key: apiKey,
    format: "json",
    limit: "30",
  });

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = (await response.json()) as SimilarArtistsResponse;
  return data.similarartists?.artist || [];
}

export async function getArtistInfo(artistName: string, apiKey: string) {
  await rateLimiter.wait();

  const params = new URLSearchParams({
    method: "artist.getinfo",
    artist: artistName,
    api_key: apiKey,
    format: "json",
  });

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  const data = (await response.json()) as ArtistInfoResponse;
  return data.artist;
}

export function extractImageUrl(
  images: Array<{ "#text": string; size: string }> | undefined,
): string | null {
  if (!images || images.length === 0) return null;

  const large = images.find((img) => img.size === "extralarge" || img.size === "large");
  return large?.["#text"] || images[0]["#text"] || null;
}
