import { describe, expect, it } from "vitest";
import type { MBRelation } from "../musicbrainz";
import { RELATION_WEIGHTS, computeRelationshipStrength } from "../scoring";

describe("computeRelationshipStrength", () => {
  const createRelation = (
    type: string,
    direction: "forward" | "backward" = "forward",
  ): MBRelation => ({
    type,
    direction,
    artist: {
      id: "test-id",
      name: "Test Artist",
      "sort-name": "Artist, Test",
    },
  });

  it("should score 'member of band' relations as 1.0", () => {
    const relations = [createRelation("member of band")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(1.0);
  });

  it("should score 'collaboration' relations as 0.8", () => {
    const relations = [createRelation("collaboration")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(0.8);
  });

  it("should score 'subgroup' relations as 0.7", () => {
    const relations = [createRelation("subgroup")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(0.7);
  });

  it("should score 'supporting musician' relations as 0.6", () => {
    const relations = [createRelation("supporting musician")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(0.6);
  });

  it("should score 'tribute' relations as 0.4", () => {
    const relations = [createRelation("tribute")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(0.4);
  });

  it("should score unknown relation types as 0.5 (default)", () => {
    const relations = [createRelation("unknown relation type")];
    const scored = computeRelationshipStrength(relations);

    expect(scored[0].strength).toBe(0.5);
  });

  it("should preserve all original relation properties", () => {
    const relation: MBRelation = {
      type: "collaboration",
      direction: "forward",
      artist: {
        id: "artist-id",
        name: "Collaborator",
        "sort-name": "Collaborator",
        country: "GB",
      },
      attributes: ["vocals"],
    };

    const scored = computeRelationshipStrength([relation]);

    expect(scored[0]).toMatchObject({
      type: "collaboration",
      direction: "forward",
      artist: expect.objectContaining({ name: "Collaborator" }),
      attributes: ["vocals"],
      strength: 0.8,
    });
  });

  it("should handle multiple relations", () => {
    const relations = [
      createRelation("member of band"),
      createRelation("collaboration"),
      createRelation("tribute"),
    ];

    const scored = computeRelationshipStrength(relations);

    expect(scored).toHaveLength(3);
    expect(scored[0].strength).toBe(1.0);
    expect(scored[1].strength).toBe(0.8);
    expect(scored[2].strength).toBe(0.4);
  });

  it("should handle empty relations array", () => {
    const scored = computeRelationshipStrength([]);
    expect(scored).toEqual([]);
  });
});

describe("RELATION_WEIGHTS", () => {
  it("should export weights for all defined relation types", () => {
    expect(RELATION_WEIGHTS["member of band"]).toBe(1.0);
    expect(RELATION_WEIGHTS.collaboration).toBe(0.8);
    expect(RELATION_WEIGHTS.subgroup).toBe(0.7);
    expect(RELATION_WEIGHTS["supporting musician"]).toBe(0.6);
    expect(RELATION_WEIGHTS.tribute).toBe(0.4);
  });
});
