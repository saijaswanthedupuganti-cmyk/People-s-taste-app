import type { Store } from "../store.js";

export async function toggleSaveHandler(
  recId: string,
  uid: string,
  store: Store,
): Promise<{ saved: boolean }> {
  const saveId = `${uid}_${recId}`;
  const alreadySaved = await store.getSave(saveId);

  if (alreadySaved) {
    await store.deleteSave(saveId);
    return { saved: false };
  }

  await store.createSave(saveId, uid, recId);
  return { saved: true };
}
