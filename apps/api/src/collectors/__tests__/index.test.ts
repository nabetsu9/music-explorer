import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("../musicbrainz", () => ({
  fetchArtist: vi.fn(),
  searchArtists: vi.fn(),
  getArtistRelationsWithTypes: vi.fn(),
}));

vi.mock("../wikidata", () => ({
  fetchArtistByMBID: vi.fn(),
}));

vi.mock("../scoring", () => ({
  computeRelationshipStrength: vi.fn((relations) =>
    relations.map((r: { type: string }) => ({
      ...r,
      strength: r.type === "member of band" ? 1.0 : 0.5,
    })),
  ),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { collectArtist } from "../index";
import { fetchArtist, getArtistRelationsWithTypes, searchArtists } from "../musicbrainz";
import { fetchArtistByMBID } from "../wikidata";

describe("collectArtist", () => {
  const createMockDb = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "new-artist-id",
        mbid: "test-mbid",
        name: "Test Artist",
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  });

  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch artist by MBID when valid UUID provided", async () => {
    const mbid = "a74b1b7f-71a5-4011-9441-d0b5e4122711";

    vi.mocked(fetchArtist).mockResolvedValueOnce({
      id: mbid,
      name: "Radiohead",
      "sort-name": "Radiohead",
      country: "GB",
    });

    vi.mocked(fetchArtistByMBID).mockResolvedValueOnce({
      wikidataId: "Q44190",
      imageUrl: "https://example.com/image.jpg",
      genres: ["alternative rock"],
    });

    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([]);

    await collectArtist(mbid, { db: mockDb as never });

    expect(fetchArtist).toHaveBeenCalledWith(mbid);
    expect(searchArtists).not.toHaveBeenCalled();
  });

  it("should search artist by name when non-UUID provided", async () => {
    vi.mocked(fetchArtist).mockResolvedValueOnce(null);
    vi.mocked(searchArtists).mockResolvedValueOnce([
      {
        id: "test-mbid",
        name: "Test Artist",
        "sort-name": "Artist, Test",
      },
    ]);

    vi.mocked(fetchArtistByMBID).mockResolvedValueOnce(null);
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([]);

    await collectArtist("Test Artist", { db: mockDb as never });

    expect(searchArtists).toHaveBeenCalledWith("Test Artist");
  });

  it("should throw error when artist not found", async () => {
    vi.mocked(fetchArtist).mockResolvedValueOnce(null);
    vi.mocked(searchArtists).mockResolvedValueOnce([]);

    await expect(collectArtist("Unknown Artist", { db: mockDb as never })).rejects.toThrow(
      "Artist not found: Unknown Artist",
    );
  });

  it("should use Wikidata image when available", async () => {
    const mbid = "b8a7c51f-362c-4dcb-a259-bc6f0d4a2e5b";

    vi.mocked(fetchArtist).mockResolvedValueOnce({
      id: mbid,
      name: "Test Artist",
      "sort-name": "Test Artist",
    });

    vi.mocked(fetchArtistByMBID).mockResolvedValueOnce({
      wikidataId: "Q12345",
      imageUrl: "https://wikidata.org/image.jpg",
      genres: ["rock"],
    });

    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([]);

    await collectArtist(mbid, { db: mockDb as never });

    expect(mockDb.insert).toHaveBeenCalled();
    const insertCall = mockDb.values.mock.calls[0][0];
    expect(insertCall.imageUrl).toBe("https://wikidata.org/image.jpg");
    expect(insertCall.imageSource).toBe("wikidata");
    expect(insertCall.wikidataId).toBe("Q12345");
  });

  it("should handle missing Wikidata data gracefully", async () => {
    const mbid = "c9b8d62e-473d-5ecc-b36a-cf7e1b3f6c7d";

    vi.mocked(fetchArtist).mockResolvedValueOnce({
      id: mbid,
      name: "Test Artist",
      "sort-name": "Test Artist",
    });

    vi.mocked(fetchArtistByMBID).mockResolvedValueOnce(null);
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([]);

    await collectArtist(mbid, { db: mockDb as never });

    const insertCall = mockDb.values.mock.calls[0][0];
    expect(insertCall.imageUrl).toBeNull();
    expect(insertCall.imageSource).toBeNull();
  });
});
