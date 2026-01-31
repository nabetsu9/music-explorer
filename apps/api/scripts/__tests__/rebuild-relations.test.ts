import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("../../src/collectors/musicbrainz", () => ({
  getArtistRelationsWithTypes: vi.fn(),
}));

vi.mock("../../src/collectors/scoring", () => ({
  computeRelationshipStrength: vi.fn((relations) =>
    relations.map((r: { type: string }) => ({
      ...r,
      strength: r.type === "member of band" ? 1.0 : 0.5,
    })),
  ),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ and: args })),
  or: vi.fn((...args) => ({ or: args })),
}));

import { getArtistRelationsWithTypes } from "../../src/collectors/musicbrainz";
import { rebuildRelations, type RebuildOptions } from "../rebuild-relations";

describe("rebuildRelations", () => {
  let insertMock: ReturnType<typeof vi.fn>;
  let valuesMock: ReturnType<typeof vi.fn>;

  const createMockDb = (options: {
    artists?: Array<{ id: string; mbid: string | null; name: string }>;
    existingRelations?: Array<{ id: string }>;
  }) => {
    const { artists: artistsList = [], existingRelations = [] } = options;

    insertMock = vi.fn().mockReturnThis();
    valuesMock = vi.fn().mockResolvedValue([]);

    // Create a mock that tracks call count to determine which query it is
    let selectCallCount = 0;

    const mockDb = {
      select: vi.fn(() => {
        selectCallCount++;
        const isFirstCall = selectCallCount === 1;

        return {
          from: vi.fn((table) => {
            // First select call is for getting all artists
            if (isFirstCall) {
              return Promise.resolve(artistsList);
            }
            // Subsequent calls are for checking existing relations
            return {
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(existingRelations),
              }),
            };
          }),
        };
      }),
      insert: insertMock,
      values: valuesMock,
    };

    // Make insert chainable
    insertMock.mockReturnValue({ values: valuesMock });

    return mockDb;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch all artists from database", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: "mbid-1", name: "Artist 1" },
      { id: "artist-2", mbid: "mbid-2", name: "Artist 2" },
    ];

    const mockDb = createMockDb({ artists: mockArtists });
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValue([]);

    await rebuildRelations({
      db: mockDb as never,
      dryRun: true,
      sleepMs: 0,
    });

    expect(mockDb.select).toHaveBeenCalled();
  });

  it("should call MusicBrainz API for each artist with MBID", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: "mbid-1", name: "Artist 1" },
      { id: "artist-2", mbid: "mbid-2", name: "Artist 2" },
    ];

    const mockDb = createMockDb({ artists: mockArtists });
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValue([]);

    await rebuildRelations({
      db: mockDb as never,
      dryRun: true,
      sleepMs: 0,
    });

    expect(getArtistRelationsWithTypes).toHaveBeenCalledTimes(2);
    expect(getArtistRelationsWithTypes).toHaveBeenCalledWith("mbid-1");
    expect(getArtistRelationsWithTypes).toHaveBeenCalledWith("mbid-2");
  });

  it("should create relations when target artist exists in database", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: "mbid-1", name: "Radiohead" },
      { id: "artist-2", mbid: "mbid-2", name: "Thom Yorke" },
    ];

    const mockDb = createMockDb({ artists: mockArtists, existingRelations: [] });

    vi.mocked(getArtistRelationsWithTypes)
      .mockResolvedValueOnce([
        {
          type: "member of band",
          direction: "backward" as const,
          artist: { id: "mbid-2", name: "Thom Yorke", "sort-name": "Yorke, Thom" },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await rebuildRelations({
      db: mockDb as never,
      dryRun: false,
      sleepMs: 0,
    });

    expect(insertMock).toHaveBeenCalled();
    expect(result.relationsCreated).toBe(1);
  });

  it("should skip relations when target artist not in database", async () => {
    const mockArtists = [{ id: "artist-1", mbid: "mbid-1", name: "Radiohead" }];

    const mockDb = createMockDb({ artists: mockArtists });

    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([
      {
        type: "member of band",
        direction: "backward" as const,
        artist: { id: "unknown-mbid", name: "Unknown Artist", "sort-name": "Unknown" },
      },
    ]);

    const result = await rebuildRelations({
      db: mockDb as never,
      dryRun: false,
      sleepMs: 0,
    });

    expect(result.relationsSkipped).toBe(1);
  });

  it("should not create duplicate relations", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: "mbid-1", name: "Joy Division" },
      { id: "artist-2", mbid: "mbid-2", name: "New Order" },
    ];

    const mockDb = createMockDb({
      artists: mockArtists,
      existingRelations: [{ id: "existing-relation" }],
    });

    vi.mocked(getArtistRelationsWithTypes)
      .mockResolvedValueOnce([
        {
          type: "subgroup",
          direction: "forward" as const,
          artist: { id: "mbid-2", name: "New Order", "sort-name": "New Order" },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await rebuildRelations({
      db: mockDb as never,
      dryRun: false,
      sleepMs: 0,
    });

    expect(result.relationsExisting).toBe(1);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("should respect dryRun option and not insert anything", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: "mbid-1", name: "Radiohead" },
      { id: "artist-2", mbid: "mbid-2", name: "Thom Yorke" },
    ];

    const mockDb = createMockDb({ artists: mockArtists, existingRelations: [] });

    vi.mocked(getArtistRelationsWithTypes)
      .mockResolvedValueOnce([
        {
          type: "member of band",
          direction: "backward" as const,
          artist: { id: "mbid-2", name: "Thom Yorke", "sort-name": "Yorke, Thom" },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await rebuildRelations({
      db: mockDb as never,
      dryRun: true,
      sleepMs: 0,
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(result.relationsCreated).toBe(1); // Still counted, just not inserted
  });

  it("should return summary statistics", async () => {
    const mockArtists = [{ id: "artist-1", mbid: "mbid-1", name: "Test Artist" }];

    const mockDb = createMockDb({ artists: mockArtists });
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValueOnce([]);

    const result = await rebuildRelations({
      db: mockDb as never,
      dryRun: true,
      sleepMs: 0,
    });

    expect(result).toHaveProperty("artistsProcessed");
    expect(result).toHaveProperty("relationsCreated");
    expect(result).toHaveProperty("relationsSkipped");
    expect(result).toHaveProperty("relationsExisting");
    expect(result.artistsProcessed).toBe(1);
  });

  it("should skip artists without MBID", async () => {
    const mockArtists = [
      { id: "artist-1", mbid: null, name: "No MBID Artist" },
      { id: "artist-2", mbid: "mbid-2", name: "Has MBID" },
    ];

    const mockDb = createMockDb({ artists: mockArtists });
    vi.mocked(getArtistRelationsWithTypes).mockResolvedValue([]);

    await rebuildRelations({
      db: mockDb as never,
      dryRun: true,
      sleepMs: 0,
    });

    // Should only call API for artist with MBID
    expect(getArtistRelationsWithTypes).toHaveBeenCalledTimes(1);
    expect(getArtistRelationsWithTypes).toHaveBeenCalledWith("mbid-2");
  });
});
