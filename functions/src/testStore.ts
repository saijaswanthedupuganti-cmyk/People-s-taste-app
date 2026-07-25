import type {
  NewRecommendationInput,
  NewRestaurantInput,
  NewUserInput,
  RecommendationRecord,
  RestaurantRecord,
  UserRecord,
  VoteRecord,
} from "./types.js";
import type { Store } from "./store.js";

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}_${nextId++}`;
}

export function createTestStore() {
  const restaurants = new Map<string, RestaurantRecord>();
  const recommendations = new Map<string, RecommendationRecord>();
  const saves = new Set<string>();
  const votes = new Map<string, VoteRecord>(); // key: `${recId}_${voterUid}`
  const users = new Map<string, UserRecord>();

  const store: Store = {
    async getRestaurant(id) {
      return restaurants.get(id) ?? null;
    },
    async findNearbyRestaurants() {
      return [...restaurants.values()];
    },
    async createRestaurant(input: NewRestaurantInput) {
      const id = genId("restaurant");
      restaurants.set(id, {
        id,
        name: input.name,
        source: "community",
        location: input.location,
        area: input.area,
        city: input.city,
        aggregates: { recCount: 0 },
        createdBy: input.createdBy,
        createdAt: Date.now(),
      });
      return id;
    },
    async incrementRestaurantRecCount(id) {
      const r = restaurants.get(id);
      if (r) r.aggregates.recCount += 1;
    },
    async createRecommendation(input: NewRecommendationInput) {
      const id = genId("rec");
      recommendations.set(id, {
        id,
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
        proofUrl: input.proofUrl,
        createdAt: Date.now(),
      });
      return id;
    },
    async getRecommendation(id) {
      return recommendations.get(id) ?? null;
    },
    async getSave(id) {
      return saves.has(id);
    },
    async createSave(id) {
      saves.add(id);
    },
    async deleteSave(id) {
      saves.delete(id);
    },
    async getVote(recId, voterUid) {
      return votes.get(`${recId}_${voterUid}`) ?? null;
    },
    async createVote(recId, voterUid, weight) {
      votes.set(`${recId}_${voterUid}`, { weight });
    },
    async deleteVote(recId, voterUid) {
      votes.delete(`${recId}_${voterUid}`);
    },
    async applyHelpfulDelta(recId, weightedHelpfulDelta, voteCountDelta) {
      const rec = recommendations.get(recId);
      if (!rec) return;
      rec.weightedHelpful += weightedHelpfulDelta;
      rec.helpfulVoteCount += voteCountDelta;
    },
    async getUser(id) {
      return users.get(id) ?? null;
    },
    async createUser(input: NewUserInput) {
      users.set(input.id, {
        id: input.id,
        username: input.username,
        displayName: input.displayName,
        photoURL: input.photoURL,
        tier: "explorer",
        trustScore: 10,
        recCount: 0,
        verifiedRecCount: 0,
        weightedHelpfulReceived: 0,
        createdAt: Date.now(),
      });
    },
    async incrementUserRecCount(id, verified) {
      const u = users.get(id);
      if (!u) return;
      u.recCount += 1;
      if (verified) u.verifiedRecCount += 1;
    },
    async applyHelpfulReceivedDelta(id, delta) {
      const u = users.get(id);
      if (!u) return;
      u.weightedHelpfulReceived += delta;
    },
    async updateUserTrust(id, trustScore, tier) {
      const u = users.get(id);
      if (!u) return;
      u.trustScore = trustScore;
      u.tier = tier;
    },
  };

  return { store, restaurants, recommendations, users };
}
