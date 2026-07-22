import type { Store } from "../store.js";

// Trust engine (master doc §9) isn't built yet - see the matching constant
// and comment in createRecommendation.ts. Both go away together later.
const MVP_DEFAULT_TRUST = 10;

export async function toggleHelpfulVoteHandler(
  recId: string,
  voterUid: string,
  store: Store,
): Promise<{ voted: boolean; weightedHelpful: number; helpfulVoteCount: number }> {
  const rec = await store.getRecommendation(recId);
  if (!rec) throw new Error("recommendation not found");

  const existingVote = await store.getVote(recId, voterUid);

  if (existingVote) {
    await store.deleteVote(recId, voterUid);
    await store.applyHelpfulDelta(recId, -existingVote.weight, -1);
    const updated = await store.getRecommendation(recId);
    return { voted: false, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
  }

  const weight = MVP_DEFAULT_TRUST / 100;
  await store.createVote(recId, voterUid, weight);
  await store.applyHelpfulDelta(recId, weight, 1);
  const updated = await store.getRecommendation(recId);
  return { voted: true, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
}
