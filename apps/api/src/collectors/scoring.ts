import type { MBRelation } from "./musicbrainz";

export const RELATION_WEIGHTS: Record<string, number> = {
  "member of band": 1.0,
  collaboration: 0.8,
  subgroup: 0.7,
  "supporting musician": 0.6,
  tribute: 0.4,
};

const DEFAULT_WEIGHT = 0.5;

export interface ScoredRelation extends MBRelation {
  strength: number;
}

export function computeRelationshipStrength(relations: MBRelation[]): ScoredRelation[] {
  return relations.map((relation) => ({
    ...relation,
    strength: RELATION_WEIGHTS[relation.type] ?? DEFAULT_WEIGHT,
  }));
}
