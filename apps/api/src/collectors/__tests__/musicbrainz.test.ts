import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock rate-limiter module
vi.mock("../rate-limiter", () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    wait: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { getArtistRelationsWithTypes } from "../musicbrainz";

describe("getArtistRelationsWithTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return relations with type and direction", async () => {
    const mockResponse = {
      relations: [
        {
          type: "member of band",
          direction: "backward",
          artist: {
            id: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
            name: "Radiohead",
            "sort-name": "Radiohead",
          },
          attributes: ["lead vocals"],
        },
        {
          type: "collaboration",
          direction: "forward",
          artist: {
            id: "b8a7c51f-362c-4dcb-a259-bc6f0d4a2e5b",
            name: "Björk",
            "sort-name": "Björk",
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const relations = await getArtistRelationsWithTypes("test-mbid");

    expect(relations).toHaveLength(2);
    expect(relations[0]).toMatchObject({
      type: "member of band",
      direction: "backward",
      artist: expect.objectContaining({ name: "Radiohead" }),
      attributes: ["lead vocals"],
    });
    expect(relations[1]).toMatchObject({
      type: "collaboration",
      direction: "forward",
      artist: expect.objectContaining({ name: "Björk" }),
    });
  });

  it("should return empty array when no relations", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ relations: [] }),
    });

    const relations = await getArtistRelationsWithTypes("test-mbid");

    expect(relations).toEqual([]);
  });

  it("should filter out non-artist relations", async () => {
    const mockResponse = {
      relations: [
        {
          type: "member of band",
          direction: "forward",
          // No artist property - this is a non-artist relation
          label: { id: "label-id", name: "Some Label" },
        },
        {
          type: "collaboration",
          direction: "forward",
          artist: {
            id: "artist-id",
            name: "Test Artist",
            "sort-name": "Artist, Test",
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const relations = await getArtistRelationsWithTypes("test-mbid");

    expect(relations).toHaveLength(1);
    expect(relations[0].artist.name).toBe("Test Artist");
  });

  it("should throw error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getArtistRelationsWithTypes("test-mbid")).rejects.toThrow(
      "MusicBrainz API error: 500",
    );
  });
});
