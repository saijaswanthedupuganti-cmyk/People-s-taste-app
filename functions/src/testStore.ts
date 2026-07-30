import type {
  BlockRecord,
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
  const blocks = new Map<string, BlockRecord>(); // key: `${blockerUid}_${blockedUid}`

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
        createdAt: Date.now(),
      });
      return id;
    },
    async getRecommendation(id) {
      return recommendations.get(id) ?? null;
    },
    async countRecentRecommendationsByAuthor(authorId, sinceMs) {
      return [...recommendations.values()].filter((r) => r.authorId === authorId && r.createdAt > sinceMs).length;
    },
    async getRecentGeoTaggedRecommendation(authorId) {
      const authored = [...recommendations.values()]
        .filter((r) => r.authorId === authorId)
        .sort((a, b) => b.createdAt - a.createdAt);
      for (const rec of authored) {
        if (rec.geoAtPost) return { geoAtPost: rec.geoAtPost, createdAt: rec.createdAt };
      }
      return null;
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
      votes.set(`${recId}_${voterUid}`, { voterUid, weight, createdAt: Date.now() });
    },
    async deleteVote(recId, voterUid) {
      votes.delete(`${recId}_${voterUid}`);
    },
    async countRecentVotesByVoter(voterUid, sinceMs) {
      return [...votes.values()].filter((v) => v.voterUid === voterUid && v.createdAt > sinceMs).length;
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
    async createUser(input: NewUserInput, now: number) {
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
        homeArea: null,
        tierHistory: [{ tier: "explorer", enteredAt: now }],
        voteWeightPenaltyUntil: null,
        createdAt: now,
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
    async updateUserTrust(id, trustScore, tier, tierHistory, voteWeightPenaltyUntil) {
      const u = users.get(id);
      if (!u) return;
      u.trustScore = trustScore;
      u.tier = tier;
      u.tierHistory = tierHistory;
      u.voteWeightPenaltyUntil = voteWeightPenaltyUntil;
    },
    async updateUserHomeArea(id, homeArea) {
      const u = users.get(id);
      if (!u) return;
      u.homeArea = homeArea;
    },
    async createBlock(blockerUid, blockedUid, now) {
      blocks.set(`${blockerUid}_${blockedUid}`, { blockerUid, blockedUid, createdAt: now });
    },
    async deleteBlock(blockerUid, blockedUid) {
      blocks.delete(`${blockerUid}_${blockedUid}`);
    },
    async getBlock(blockerUid, blockedUid) {
      return blocks.has(`${blockerUid}_${blockedUid}`);
    },
  };

  return { store, restaurants, recommendations, users, votes, blocks };
}
