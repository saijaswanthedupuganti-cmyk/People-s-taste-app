import type { Store } from "../store.js";
import { computeRankingScore } from "../ranking.js";

// One-off, idempotent backfill for recommendations created before `rankingScore` existed
// (this branch's Task 3 — see §11.1). Firestore's `orderBy("rankingScore", ...)` silently
// EXCLUDES documents missing that field entirely, so any pre-existing `live` recommendation
// without it would vanish from `fetchFeed` even though nothing about its status changed.
//
// Run ONCE, in this order:
//   1. Deploy the Firestore composite index for [status, rankingScore, createdAt]
//      (firestore.indexes.json) and wait for it to reach "Enabled" status.
//   2. Run this function (e.g. via the Firebase console's "Test function" panel, or a
//      one-off authenticated client call).
//   3. Only then deploy the frontend change that sorts `fetchFeed` by `rankingScore`.
// Skipping straight to step 3 means the feed query throws `failed-precondition` until the
// index finishes building; running this function before step 1 just means it queries without
// the new index (slower, but not incorrect) since the query itself only filters on `status`.
//
// Safe to re-run: only touches documents that are still missing `rankingScore`, so calling it
// again after a successful run is a no-op.
//
// Auth: gated on `request.auth` only (see index.ts) — there is no admin-role system in this
// codebase yet (D18 in the master build doc reserves a `role` field but it isn't built), so
// this follows the same "must be logged in" convention every other callable here uses. Once
// an admin role exists, this should be tightened to require it.
export async function backfillRankingScoreHandler(store: Store, now: number): Promise<{ backfilled: number }> {
  const missing = await store.getRecommendationsMissingRankingScore();
  for (const rec of missing) {
    const rankingScore = computeRankingScore({
      weightedHelpful: rec.weightedHelpful,
      trustSnapshot: rec.trustSnapshot,
      verificationMultiplier: rec.verificationMultiplier,
      createdAt: rec.createdAt,
      now,
    });
    await store.setRankingScore(rec.id, rankingScore);
  }
  return { backfilled: missing.length };
}
