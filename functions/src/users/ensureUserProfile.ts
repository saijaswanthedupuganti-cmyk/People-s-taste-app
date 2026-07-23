import type { Store } from "../store.js";
import type { UserRecord } from "../types.js";

export interface EnsureUserProfileInput {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

function usernameFromEmail(email: string, fallbackUid: string): string {
  const localPart = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_.]/g, "") ?? "";
  return localPart.length > 0 ? localPart : fallbackUid.slice(0, 8);
}

export async function ensureUserProfileHandler(input: EnsureUserProfileInput, store: Store): Promise<UserRecord> {
  const existing = await store.getUser(input.uid);
  if (existing) return existing;

  const username = usernameFromEmail(input.email, input.uid);
  await store.createUser({
    id: input.uid,
    username,
    displayName: input.displayName || username,
    photoURL: input.photoURL,
  });

  const created = await store.getUser(input.uid);
  return created!;
}
