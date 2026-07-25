import type { Store } from "../store.js";
import { computeTrust, updateTierHistory } from "../trust.js";

// §14 velocity limit: max 30 Helpful votes/minute per voter. Only gates casting a new vote —
// removing one is always allowed, since it can't be used to spam influence.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_VOTES = 30;

export async function toggleHelpfulVoteHandler(
  recId: string,
  voterUid: string,
  store: Store,
  now: number,
): Promise<{ voted: boolean; weightedHelpful: number; helpfulVoteCount: number }> {
  const rec = await store.getRecommendation(recId);
  if (!rec) throw new Error("recommendation not found");

  const existingVote = await store.getVote(recId, voterUid);

  if (existingVote) {
    await store.deleteVote(recId, voterUid);
    await store.applyHelpfulDelta(recId, -existingVote.weight, -1);
    await recomputeAuthorTrust(rec.authorId, -existingVote.weight, store, now);
    const updated = await store.getRecommendation(recId);
    return { voted: false, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
  }

  const recentVotes = await store.countRecentVotesByVoter(voterUid, now - RATE_LIMIT_WINDOW_MS);
  if (recentVotes >= RATE_LIMIT_MAX_VOTES) {
    throw new Error("Too many votes too fast — try again in a minute.");
  }

  const voter = await store.getUser(voterUid);
  // §9.3 trust velocity: an account that climbed two tiers within 30 days has its votes
  // weighted at half for 60 days — discounts influence, never blocks the vote itself.
  const isPenalized = !!voter?.voteWeightPenaltyUntil && voter.voteWeightPenaltyUntil > now;
  const weight = ((voter?.trustScore ?? 10) / 100) * (isPenalized ? 0.5 : 1);
  await store.createVote(recId, voterUid, weight);
  await store.applyHelpfulDelta(recId, weight, 1);
  await recomputeAuthorTrust(rec.authorId, weight, store, now);
  const updated = await store.getRecommendation(recId);
  return { voted: true, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
}

async function recomputeAuthorTrust(authorId: string, weightDelta: number, store: Store, now: number): Promise<void> {
  const author = await store.getUser(authorId);
  if (!author) return;

  await store.applyHelpfulReceivedDelta(authorId, weightDelta);
  const updated = await store.getUser(authorId);
  const { score, tier } = computeTrust({
    accountCreatedAt: updated!.createdAt,
    now,
    recCount: updated!.recCount,
    verifiedRecCount: updated!.verifiedRecCount,
    weightedHelpfulReceived: updated!.weightedHelpfulReceived,
  });
  const { tierHistory, voteWeightPenaltyUntil } = updateTierHistory(
    updated!.tierHistory,
    tier,
    now,
    updated!.voteWeightPenaltyUntil,
  );
  await store.updateUserTrust(authorId, score, tier, tierHistory, voteWeightPenaltyUntil);
}
