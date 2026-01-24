import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { fetchArtistByMBID } from "../wikidata";

describe("fetchArtistByMBID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return artist data with image and genres", async () => {
    const mockSparqlResponse = {
      results: {
        bindings: [
          {
            artist: { value: "http://www.wikidata.org/entity/Q44190" },
            image: { value: "https://commons.wikimedia.org/wiki/File:Radiohead.jpg" },
            genreLabel: { value: "alternative rock" },
          },
          {
            artist: { value: "http://www.wikidata.org/entity/Q44190" },
            image: { value: "https://commons.wikimedia.org/wiki/File:Radiohead.jpg" },
            genreLabel: { value: "art rock" },
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSparqlResponse),
    });

    const result = await fetchArtistByMBID("a74b1b7f-71a5-4011-9441-d0b5e4122711");

    expect(result).toEqual({
      wikidataId: "Q44190",
      imageUrl: "https://commons.wikimedia.org/wiki/File:Radiohead.jpg",
      genres: ["alternative rock", "art rock"],
    });
  });

  it("should return null when artist not found", async () => {
    const mockSparqlResponse = {
      results: {
        bindings: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSparqlResponse),
    });

    const result = await fetchArtistByMBID("invalid-mbid");

    expect(result).toBeNull();
  });

  it("should handle artist without image", async () => {
    const mockSparqlResponse = {
      results: {
        bindings: [
          {
            artist: { value: "http://www.wikidata.org/entity/Q12345" },
            genreLabel: { value: "rock" },
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSparqlResponse),
    });

    const result = await fetchArtistByMBID("test-mbid");

    expect(result).toEqual({
      wikidataId: "Q12345",
      imageUrl: null,
      genres: ["rock"],
    });
  });

  it("should handle artist without genres", async () => {
    const mockSparqlResponse = {
      results: {
        bindings: [
          {
            artist: { value: "http://www.wikidata.org/entity/Q12345" },
            image: { value: "https://example.com/image.jpg" },
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSparqlResponse),
    });

    const result = await fetchArtistByMBID("test-mbid");

    expect(result).toEqual({
      wikidataId: "Q12345",
      imageUrl: "https://example.com/image.jpg",
      genres: [],
    });
  });

  it("should deduplicate genres", async () => {
    const mockSparqlResponse = {
      results: {
        bindings: [
          {
            artist: { value: "http://www.wikidata.org/entity/Q12345" },
            genreLabel: { value: "rock" },
          },
          {
            artist: { value: "http://www.wikidata.org/entity/Q12345" },
            genreLabel: { value: "rock" },
          },
          {
            artist: { value: "http://www.wikidata.org/entity/Q12345" },
            genreLabel: { value: "pop" },
          },
        ],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSparqlResponse),
    });

    const result = await fetchArtistByMBID("test-mbid");

    expect(result?.genres).toEqual(["rock", "pop"]);
  });

  it("should throw error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchArtistByMBID("test-mbid")).rejects.toThrow("Wikidata API error: 500");
  });
});
