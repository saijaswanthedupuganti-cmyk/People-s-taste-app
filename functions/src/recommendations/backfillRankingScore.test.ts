import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { backfillRankingScoreHandler } from "./backfillRankingScore.js";
import type { RecommendationRecord } from "../types.js";

function legacyRecommendation(overrides: Partial<RecommendationRecord>): RecommendationRecord {
  const base = {
    id: "rec_legacy",
    authorId: "u1",
    restaurantId: "r1",
    dishName: null,
    mealTags: [],
    signalTags: [],
    primarySignal: "recommend" as const,
    caption: "Great biryani, ate it last week and loved every bite.",
    verificationLevel: 1 as const,
    verificationMultiplier: 1.0,
    trustSnapshot: 80,
    weightedHelpful: 5,
    helpfulVoteCount: 3,
    status: "live" as const,
    geoMismatch: false,
    geoAtPost: null,
    proofUrl: null,
    photo: null,
    createdAt: Date.now() - 10 * 86_400_000,
    ...overrides,
  };
  // Simulates a pre-Task-3 Firestore document: the field genuinely doesn't exist on the
  // stored document, not just set to a falsy value.
  const record = base as unknown as Record<string, unknown>;
  delete record.rankingScore;
  return record as unknown as RecommendationRecord;
}

describe("backfillRankingScoreHandler", () => {
  it("computes and writes rankingScore for a live recommendation missing it", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec_legacy", legacyRecommendation({ id: "rec_legacy" }));

    const result = await backfillRankingScoreHandler(store, Date.now());

    expect(result.backfilled).toBe(1);
    expect(recommendations.get("rec_legacy")?.rankingScore).toBeGreaterThan(0);
  });

  it("is a no-op on a second run once every document has been backfilled", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec_legacy", legacyRecommendation({ id: "rec_legacy" }));

    await backfillRankingScoreHandler(store, Date.now());
    const result = await backfillRankingScoreHandler(store, Date.now());

    expect(result.backfilled).toBe(0);
  });

  it("skips recommendations that already have a rankingScore", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "u1",
      restaurantId: "r1",
      dishName: null,
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Solid choice, would order again for sure next time.",
      verificationLevel: 1,
      verificationMultiplier: 1.0,
      trustSnapshot: 80,
      weightedHelpful: 5,
      rankingScore: 42,
      helpfulVoteCount: 3,
      status: "live",
      geoMismatch: false,
      geoAtPost: null,
      proofUrl: null,
      photo: null,
      createdAt: Date.now(),
    });

    const result = await backfillRankingScoreHandler(store, Date.now());

    expect(result.backfilled).toBe(0);
    expect(recommendations.get("rec1")?.rankingScore).toBe(42);
  });

  it("ignores non-live recommendations even if they're missing rankingScore", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec_removed", legacyRecommendation({ id: "rec_removed", status: "removed" }));

    const result = await backfillRankingScoreHandler(store, Date.now());

    expect(result.backfilled).toBe(0);
    expect(recommendations.get("rec_removed")?.rankingScore).toBeUndefined();
  });

  it("matches computeRankingScore's own formula rather than reimplementing it", async () => {
    const { store, recommendations } = createTestStore();
    const now = Date.now();
    const createdAt = now; // no decay, easy to hand-check
    recommendations.set(
      "rec_legacy",
      legacyRecommendation({
        id: "rec_legacy",
        weightedHelpful: 10,
        trustSnapshot: 80,
        verificationMultiplier: 1.3,
        createdAt,
      }),
    );

    await backfillRankingScoreHandler(store, now);

    // 10 * 0.8 * 1.3 * e^0 = 10.4 (same formula as ranking.test.ts's second case)
    expect(recommendations.get("rec_legacy")?.rankingScore).toBeCloseTo(10.4, 5);
  });
});
