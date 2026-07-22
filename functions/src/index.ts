import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./admin.js";
import { FirestoreStore } from "./store.js";
import { createRecommendationHandler, type CreateRecommendationInput } from "./recommendations/createRecommendation.js";
import { toggleHelpfulVoteHandler } from "./recommendations/toggleHelpfulVote.js";
import { toggleSaveHandler } from "./saves/toggleSave.js";

const store = new FirestoreStore(db);

export const createRecommendation = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const input = request.data as Omit<CreateRecommendationInput, "authorId">;
  try {
    return await createRecommendationHandler({ ...input, authorId: request.auth.uid }, store);
  } catch (err) {
    throw new HttpsError("invalid-argument", err instanceof Error ? err.message : "Invalid request");
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
    return await toggleHelpfulVoteHandler(recId, request.auth.uid, store);
  } catch (err) {
    throw new HttpsError("not-found", err instanceof Error ? err.message : "Not found");
  }
});
