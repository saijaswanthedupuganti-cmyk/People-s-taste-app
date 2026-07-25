import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./admin.js";
import { FirestoreStore } from "./store.js";
import { createRecommendationHandler, type CreateRecommendationInput } from "./recommendations/createRecommendation.js";
import { toggleHelpfulVoteHandler } from "./recommendations/toggleHelpfulVote.js";
import { toggleSaveHandler } from "./saves/toggleSave.js";
import { ensureUserProfileHandler } from "./users/ensureUserProfile.js";
import { updateHomeAreaHandler } from "./users/updateHomeArea.js";
import { toggleBlockHandler } from "./users/toggleBlock.js";

const store = new FirestoreStore(db);

export const createRecommendation = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const input = request.data as Omit<CreateRecommendationInput, "authorId">;
  try {
    return await createRecommendationHandler({ ...input, authorId: request.auth.uid }, store, Date.now());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    throw new HttpsError(message.includes("posting a bit fast") ? "resource-exhausted" : "invalid-argument", message);
  }
});

export const toggleSave = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { recId } = request.data as { recId: string };
  if (!recId) throw new HttpsError("invalid-argument", "recId is required");
  return toggleSaveHandler(recId, request.auth.uid, store);
});

export const toggleHelpfulVote = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { recId } = request.data as { recId: string };
  if (!recId) throw new HttpsError("invalid-argument", "recId is required");
  try {
    return await toggleHelpfulVoteHandler(recId, request.auth.uid, store, Date.now());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    throw new HttpsError(message.includes("fast") ? "resource-exhausted" : "not-found", message);
  }
});

export const ensureUserProfile = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { displayName, photoURL, email } = request.data as { displayName: string; photoURL: string; email: string };
  if (!email) throw new HttpsError("invalid-argument", "email is required");
  return ensureUserProfileHandler({ uid: request.auth.uid, displayName, photoURL, email }, store, Date.now());
});

export const toggleBlock = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { blockedUid } = request.data as { blockedUid: string };
  if (!blockedUid) throw new HttpsError("invalid-argument", "blockedUid is required");
  try {
    return await toggleBlockHandler(request.auth.uid, blockedUid, store, Date.now());
  } catch (err) {
    throw new HttpsError("invalid-argument", err instanceof Error ? err.message : "Invalid request");
  }
});

export const updateHomeArea = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { homeArea } = request.data as { homeArea: string };
  try {
    return await updateHomeAreaHandler({ uid: request.auth.uid, homeArea }, store);
  } catch (err) {
    throw new HttpsError("invalid-argument", err instanceof Error ? err.message : "Invalid request");
  }
});
