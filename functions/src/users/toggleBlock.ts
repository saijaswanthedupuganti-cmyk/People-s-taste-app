import type { Store } from "../store.js";

export async function toggleBlockHandler(
  blockerUid: string,
  blockedUid: string,
  store: Store,
  now: number,
): Promise<{ blocked: boolean }> {
  if (blockerUid === blockedUid) {
    throw new Error("cannot block yourself");
  }

  const alreadyBlocked = await store.getBlock(blockerUid, blockedUid);

  if (alreadyBlocked) {
    await store.deleteBlock(blockerUid, blockedUid);
    return { blocked: false };
  }

  await store.createBlock(blockerUid, blockedUid, now);
  return { blocked: true };
}
