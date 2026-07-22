import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  NewRecommendationInput,
  NewRestaurantInput,
  RecommendationRecord,
  RestaurantRecord,
  VoteRecord,
} from "./types.js";

export interface Store {
  getRestaurant(id: string): Promise<RestaurantRecord | null>;
  findNearbyRestaurants(lat: number, lng: number, radiusMeters: number): Promise<RestaurantRecord[]>;
  createRestaurant(input: NewRestaurantInput): Promise<string>;
  incrementRestaurantRecCount(id: string): Promise<void>;
  createRecommendation(input: NewRecommendationInput): Promise<string>;
  getRecommendation(id: string): Promise<RecommendationRecord | null>;
  getSave(id: string): Promise<boolean>;
  createSave(id: string, uid: string, recId: string): Promise<void>;
  deleteSave(id: string): Promise<void>;
  getVote(recId: string, voterUid: string): Promise<VoteRecord | null>;
  createVote(recId: string, voterUid: string, weight: number): Promise<void>;
  deleteVote(recId: string, voterUid: string): Promise<void>;
  applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void>;
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
      trustSnapshot: input.trustSnapshot,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      status: "active",
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
    return doc.data() as VoteRecord;
  }

  async createVote(recId: string, voterUid: string, weight: number): Promise<void> {
    await this.db
      .collection("recommendations")
      .doc(recId)
      .collection("votes")
      .doc(voterUid)
      .set({ weight, createdAt: FieldValue.serverTimestamp() });
  }

  async deleteVote(recId: string, voterUid: string): Promise<void> {
    await this.db.collection("recommendations").doc(recId).collection("votes").doc(voterUid).delete();
  }

  async applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void> {
    await this.db.collection("recommendations").doc(recId).update({
      weightedHelpful: FieldValue.increment(weightedHelpfulDelta),
      helpfulVoteCount: FieldValue.increment(voteCountDelta),
    });
  }
}
