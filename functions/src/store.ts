import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  NewRecommendationInput,
  NewRestaurantInput,
  NewUserInput,
  RecommendationRecord,
  RestaurantRecord,
  Tier,
  UserRecord,
  VoteRecord,
} from "./types.js";

// Minimal shape needed to recompute rankingScore for a legacy recommendation document that
// predates this field (this branch's Task 3) — see backfillRankingScore.ts (C1 fix).
export interface RecommendationMissingRankingScore {
  id: string;
  weightedHelpful: number;
  trustSnapshot: number;
  verificationMultiplier: number;
  createdAt: number;
}

export interface Store {
  getRestaurant(id: string): Promise<RestaurantRecord | null>;
  findNearbyRestaurants(lat: number, lng: number, radiusMeters: number): Promise<RestaurantRecord[]>;
  createRestaurant(input: NewRestaurantInput): Promise<string>;
  incrementRestaurantRecCount(id: string): Promise<void>;
  createRecommendation(input: NewRecommendationInput): Promise<string>;
  getRecommendation(id: string): Promise<RecommendationRecord | null>;
  countRecentRecommendationsByAuthor(authorId: string, sinceMs: number): Promise<number>;
  getRecentGeoTaggedRecommendation(authorId: string): Promise<{ geoAtPost: { lat: number; lng: number }; createdAt: number } | null>;
  getRecommendationsMissingRankingScore(): Promise<RecommendationMissingRankingScore[]>;
  getSave(id: string): Promise<boolean>;
  createSave(id: string, uid: string, recId: string): Promise<void>;
  deleteSave(id: string): Promise<void>;
  getVote(recId: string, voterUid: string): Promise<VoteRecord | null>;
  createVote(recId: string, voterUid: string, weight: number): Promise<void>;
  deleteVote(recId: string, voterUid: string): Promise<void>;
  countRecentVotesByVoter(voterUid: string, sinceMs: number): Promise<number>;
  applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void>;
  setRankingScore(recId: string, rankingScore: number): Promise<void>;
  getUser(id: string): Promise<UserRecord | null>;
  createUser(input: NewUserInput, now: number): Promise<void>;
  incrementUserRecCount(id: string, verified: boolean): Promise<void>;
  applyHelpfulReceivedDelta(id: string, delta: number): Promise<void>;
  updateUserTrust(
    id: string,
    trustScore: number,
    tier: Tier,
    tierHistory: { tier: Tier; enteredAt: number }[],
    voteWeightPenaltyUntil: number | null,
  ): Promise<void>;
  updateUserHomeArea(id: string, homeArea: string): Promise<void>;
  createBlock(blockerUid: string, blockedUid: string, now: number): Promise<void>;
  deleteBlock(blockerUid: string, blockedUid: string): Promise<void>;
  getBlock(blockerUid: string, blockedUid: string): Promise<boolean>;
}

// Real Firestore-backed implementation. Deliberately thin - every method is a
// direct 1:1 mapping to a Firestore call, no business logic lives here (that's
// in the handler files, which is what the tests exercise via the in-memory
// fake in testStore.ts instead of this class).
export class FirestoreStore implements Store {
  constructor(private db: Firestore) {}

  async getRestaurant(id: string): Promise<RestaurantRecord | null> {
    const doc = await this.db.collection("restaurants").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...(data as Omit<RestaurantRecord, "id" | "createdAt">),
      createdAt: (data.createdAt as Timestamp).toMillis(),
    };
  }

  async findNearbyRestaurants(_lat: number, _lng: number, _radiusMeters: number): Promise<RestaurantRecord[]> {
    // Fetches everything and filters by distance in the caller (createRecommendation.ts).
    // Fine at beta scale (dozens of restaurants); revisit with a geohash-bucketed
    // query (geofire-common) once the restaurant count is in the hundreds+.
    const snap = await this.db.collection("restaurants").get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...(data as Omit<RestaurantRecord, "id" | "createdAt">),
        createdAt: (data.createdAt as Timestamp).toMillis(),
      };
    });
  }

  async createRestaurant(input: NewRestaurantInput): Promise<string> {
    const ref = this.db.collection("restaurants").doc();
    await ref.set({
      name: input.name,
      source: "community",
      location: input.location,
      area: input.area,
      city: input.city,
      createdBy: input.createdBy,
      aggregates: { recCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async incrementRestaurantRecCount(id: string): Promise<void> {
    await this.db.collection("restaurants").doc(id).update({
      "aggregates.recCount": FieldValue.increment(1),
    });
  }

  async createRecommendation(input: NewRecommendationInput): Promise<string> {
    const ref = this.db.collection("recommendations").doc();
    await ref.set({
      authorId: input.authorId,
      restaurantId: input.restaurantId,
      dishName: input.dishName,
      mealTags: input.mealTags,
      signalTags: input.signalTags,
      primarySignal: input.primarySignal,
      caption: input.caption,
      verificationLevel: input.verificationLevel,
      verificationMultiplier: input.verificationMultiplier,
      trustSnapshot: input.trustSnapshot,
      weightedHelpful: 0,
      rankingScore: input.rankingScore,
      helpfulVoteCount: 0,
      status: "live",
      geoMismatch: input.geoMismatch,
      geoAtPost: input.geoAtPost,
      proofUrl: input.proofUrl,
      photo: input.photo,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getRecommendation(id: string): Promise<RecommendationRecord | null> {
    const doc = await this.db.collection("recommendations").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...(data as Omit<RecommendationRecord, "id" | "createdAt">),
      createdAt: (data.createdAt as Timestamp).toMillis(),
    };
  }

  async countRecentRecommendationsByAuthor(authorId: string, sinceMs: number): Promise<number> {
    const snap = await this.db
      .collection("recommendations")
      .where("authorId", "==", authorId)
      .where("createdAt", ">", Timestamp.fromMillis(sinceMs))
      .count()
      .get();
    return snap.data().count;
  }

  async getRecentGeoTaggedRecommendation(
    authorId: string,
  ): Promise<{ geoAtPost: { lat: number; lng: number }; createdAt: number } | null> {
    const snap = await this.db
      .collection("recommendations")
      .where("authorId", "==", authorId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data() as RecommendationRecord;
      if (data.geoAtPost) {
        return { geoAtPost: data.geoAtPost, createdAt: (doc.data().createdAt as Timestamp).toMillis() };
      }
    }
    return null;
  }

  async getRecommendationsMissingRankingScore(): Promise<RecommendationMissingRankingScore[]> {
    // Firestore has no efficient "field does not exist" query at scale (same tradeoff as
    // findNearbyRestaurants above) — query all `live` recommendations and filter in code.
    // Fine at dev/beta scale; revisit if this collection grows into the tens of thousands.
    const snap = await this.db.collection("recommendations").where("status", "==", "live").get();
    const missing: RecommendationMissingRankingScore[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.rankingScore === undefined) {
        missing.push({
          id: doc.id,
          weightedHelpful: data.weightedHelpful,
          trustSnapshot: data.trustSnapshot,
          verificationMultiplier: data.verificationMultiplier,
          createdAt: (data.createdAt as Timestamp).toMillis(),
        });
      }
    }
    return missing;
  }

  async getSave(id: string): Promise<boolean> {
    const doc = await this.db.collection("saves").doc(id).get();
    return doc.exists;
  }

  async createSave(id: string, uid: string, recId: string): Promise<void> {
    await this.db.collection("saves").doc(id).set({ uid, recId, createdAt: FieldValue.serverTimestamp() });
  }

  async deleteSave(id: string): Promise<void> {
    await this.db.collection("saves").doc(id).delete();
  }

  async getVote(recId: string, voterUid: string): Promise<VoteRecord | null> {
    const doc = await this.db.collection("recommendations").doc(recId).collection("votes").doc(voterUid).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return { ...(data as Omit<VoteRecord, "createdAt">), createdAt: (data.createdAt as Timestamp).toMillis() };
  }

  async createVote(recId: string, voterUid: string, weight: number): Promise<void> {
    await this.db
      .collection("recommendations")
      .doc(recId)
      .collection("votes")
      .doc(voterUid)
      .set({ voterUid, weight, createdAt: FieldValue.serverTimestamp() });
  }

  async deleteVote(recId: string, voterUid: string): Promise<void> {
    await this.db.collection("recommendations").doc(recId).collection("votes").doc(voterUid).delete();
  }

  async countRecentVotesByVoter(voterUid: string, sinceMs: number): Promise<number> {
    const snap = await this.db
      .collectionGroup("votes")
      .where("voterUid", "==", voterUid)
      .where("createdAt", ">", Timestamp.fromMillis(sinceMs))
      .count()
      .get();
    return snap.data().count;
  }

  async applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void> {
    await this.db.collection("recommendations").doc(recId).update({
      weightedHelpful: FieldValue.increment(weightedHelpfulDelta),
      helpfulVoteCount: FieldValue.increment(voteCountDelta),
    });
  }

  async setRankingScore(recId: string, rankingScore: number): Promise<void> {
    await this.db.collection("recommendations").doc(recId).update({ rankingScore });
  }

  async getUser(id: string): Promise<UserRecord | null> {
    const doc = await this.db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...(data as Omit<UserRecord, "id" | "createdAt">),
      createdAt: (data.createdAt as Timestamp).toMillis(),
    };
  }

  async createUser(input: NewUserInput, now: number): Promise<void> {
    await this.db.collection("users").doc(input.id).set({
      username: input.username,
      displayName: input.displayName,
      photoURL: input.photoURL,
      tier: "explorer",
      trustScore: 10,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [{ tier: "explorer", enteredAt: now }],
      voteWeightPenaltyUntil: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  async incrementUserRecCount(id: string, verified: boolean): Promise<void> {
    const update: Record<string, FieldValue> = { recCount: FieldValue.increment(1) };
    if (verified) update.verifiedRecCount = FieldValue.increment(1);
    await this.db.collection("users").doc(id).update(update);
  }

  async applyHelpfulReceivedDelta(id: string, delta: number): Promise<void> {
    await this.db.collection("users").doc(id).update({
      weightedHelpfulReceived: FieldValue.increment(delta),
    });
  }

  async updateUserTrust(
    id: string,
    trustScore: number,
    tier: Tier,
    tierHistory: { tier: Tier; enteredAt: number }[],
    voteWeightPenaltyUntil: number | null,
  ): Promise<void> {
    await this.db.collection("users").doc(id).update({ trustScore, tier, tierHistory, voteWeightPenaltyUntil });
  }

  async updateUserHomeArea(id: string, homeArea: string): Promise<void> {
    await this.db.collection("users").doc(id).update({ homeArea });
  }

  async createBlock(blockerUid: string, blockedUid: string, now: number): Promise<void> {
    await this.db
      .collection("blocks")
      .doc(`${blockerUid}_${blockedUid}`)
      .set({ blockerUid, blockedUid, createdAt: Timestamp.fromMillis(now) });
  }

  async deleteBlock(blockerUid: string, blockedUid: string): Promise<void> {
    await this.db.collection("blocks").doc(`${blockerUid}_${blockedUid}`).delete();
  }

  async getBlock(blockerUid: string, blockedUid: string): Promise<boolean> {
    const doc = await this.db.collection("blocks").doc(`${blockerUid}_${blockedUid}`).get();
    return doc.exists;
  }
}
