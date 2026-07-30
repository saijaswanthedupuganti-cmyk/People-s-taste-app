import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { toggleHelpfulVoteHandler } from "./toggleHelpfulVote.js";

const FIXED_NOW = new Date("2026-07-23T00:00:00Z").getTime();

describe("toggleHelpfulVoteHandler", () => {
  it("casts a helpful vote and updates the recommendation's aggregate counts", async () => {
    const { store, recommendations, users } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      verificationMultiplier: 1.0,
      trustSnapshot: 10,
      weightedHelpful: 0,
      rankingScore: 0,
      helpfulVoteCount: 0,
      status: "live",
      geoMismatch: false,
      geoAtPost: null,
      proofUrl: null,
      photo: null,
      createdAt: Date.now(),
    });
    users.set("author1", {
      id: "author1",
      username: "author",
      displayName: "Author",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 1,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    users.set("voter1", {
      id: "voter1",
      username: "voter",
      displayName: "Voter",
      photoURL: "",
      tier: "explorer",
      trustScore: 80,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

    expect(result.voted).toBe(true);
    expect(result.helpfulVoteCount).toBe(1);
    expect(result.weightedHelpful).toBeCloseTo(0.8, 5); // voter1's trust(80) / 100
    expect(users.get("author1")?.weightedHelpfulReceived).toBeCloseTo(0.8, 5);
  });

  it("un-votes when called again by the same voter (toggle)", async () => {
    const { store, recommendations, users } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      verificationMultiplier: 1.0,
      trustSnapshot: 10,
      weightedHelpful: 0,
      rankingScore: 0,
      helpfulVoteCount: 0,
      status: "live",
      geoMismatch: false,
      geoAtPost: null,
      proofUrl: null,
      photo: null,
      createdAt: Date.now(),
    });
    users.set("author1", {
      id: "author1",
      username: "author",
      displayName: "Author",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 1,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    users.set("voter1", {
      id: "voter1",
      username: "voter",
      displayName: "Voter",
      photoURL: "",
      tier: "explorer",
      trustScore: 80,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

    expect(result.voted).toBe(false);
    expect(result.helpfulVoteCount).toBe(0);
    expect(result.weightedHelpful).toBeCloseTo(0, 5);
    expect(users.get("author1")?.weightedHelpfulReceived).toBeCloseTo(0, 5);
  });

  it("counts votes from different voters independently", async () => {
    const { store, recommendations, users } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      verificationMultiplier: 1.0,
      trustSnapshot: 10,
      weightedHelpful: 0,
      rankingScore: 0,
      helpfulVoteCount: 0,
      status: "live",
      geoMismatch: false,
      geoAtPost: null,
      proofUrl: null,
      photo: null,
      createdAt: Date.now(),
    });
    users.set("author1", {
      id: "author1",
      username: "author",
      displayName: "Author",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 1,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    users.set("voter1", {
      id: "voter1",
      username: "voter",
      displayName: "Voter",
      photoURL: "",
      tier: "explorer",
      trustScore: 80,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    users.set("voter2", {
      id: "voter2",
      username: "voter2",
      displayName: "Voter2",
      photoURL: "",
      tier: "explorer",
      trustScore: 40,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: FIXED_NOW,
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

    const result = await toggleHelpfulVoteHandler("rec1", "voter2", store, FIXED_NOW);

    expect(result.helpfulVoteCount).toBe(2);
    expect(result.weightedHelpful).toBeCloseTo(1.2, 5); // 0.8 (voter1) + 0.4 (voter2)
    expect(users.get("author1")?.weightedHelpfulReceived).toBeCloseTo(1.2, 5);
  });

  it("falls back to trust score 10 when the voter has no profile doc yet", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      verificationMultiplier: 1.0,
      trustSnapshot: 10,
      weightedHelpful: 0,
      rankingScore: 0,
      helpfulVoteCount: 0,
      status: "live",
      geoMismatch: false,
      geoAtPost: null,
      proofUrl: null,
      photo: null,
      createdAt: Date.now(),
    });

    const result = await toggleHelpfulVoteHandler("rec1", "no-profile-voter", store, FIXED_NOW);

    expect(result.weightedHelpful).toBeCloseTo(0.1, 5); // 10 / 100
  });

  it("throws when the recommendation doesn't exist", async () => {
    const { store } = createTestStore();

    await expect(toggleHelpfulVoteHandler("nonexistent", "voter1", store, FIXED_NOW)).rejects.toThrow(/not found/i);
  });
});
