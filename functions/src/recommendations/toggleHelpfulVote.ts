import type { Store } from "../store.js";
import { computeTrust } from "../trust.js";

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

  const voter = await store.getUser(voterUid);
  const weight = (voter?.trustScore ?? 10) / 100;
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
  await store.updateUserTrust(authorId, score, tier);
}
