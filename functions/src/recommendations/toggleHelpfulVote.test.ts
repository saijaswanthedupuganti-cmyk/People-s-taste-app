import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { toggleHelpfulVoteHandler } from "./toggleHelpfulVote.js";

describe("toggleHelpfulVoteHandler", () => {
  it("casts a helpful vote and updates the recommendation's aggregate counts", async () => {
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
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      status: "active",
      createdAt: Date.now(),
    });

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store);

    expect(result.voted).toBe(true);
    expect(result.helpfulVoteCount).toBe(1);
    expect(result.weightedHelpful).toBeCloseTo(0.1, 5); // MVP_DEFAULT_TRUST(10) / 100
  });

  it("un-votes when called again by the same voter (toggle)", async () => {
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
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      status: "active",
      createdAt: Date.now(),
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store);

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store);

    expect(result.voted).toBe(false);
    expect(result.helpfulVoteCount).toBe(0);
    expect(result.weightedHelpful).toBeCloseTo(0, 5);
  });

  it("counts votes from different voters independently", async () => {
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
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      status: "active",
      createdAt: Date.now(),
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store);

    const result = await toggleHelpfulVoteHandler("rec1", "voter2", store);

    expect(result.helpfulVoteCount).toBe(2);
    expect(result.weightedHelpful).toBeCloseTo(0.2, 5);
  });

  it("throws when the recommendation doesn't exist", async () => {
    const { store } = createTestStore();

    await expect(toggleHelpfulVoteHandler("nonexistent", "voter1", store)).rejects.toThrow(/not found/i);
  });
});
