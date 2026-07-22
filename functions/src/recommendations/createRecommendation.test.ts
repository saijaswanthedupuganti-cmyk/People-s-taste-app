import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { createRecommendationHandler } from "./createRecommendation.js";

describe("createRecommendationHandler", () => {
  it("creates a recommendation against an existing restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: ["worth_traveling_for"],
        primarySignal: "must_try",
        caption: "Order the mutton, not chicken.",
      },
      store,
    );

    expect(result.restaurantId).toBe("r1");
    expect(result.verificationLevel).toBe(1);
    const rec = await store.getRecommendation(result.recommendationId);
    expect(rec?.dishName).toBe("Mutton Biryani");
    expect(rec?.trustSnapshot).toBe(10);
    expect(restaurants.get("r1")?.aggregates.recCount).toBe(1);
  });

  it("computes verification level 2 when GPS is within 100m of the restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "Great biryani here.",
        userLocation: { lat: 17.3999, lng: 78.4118 },
      },
      store,
    );

    expect(result.verificationLevel).toBe(2);
  });

  it("falls back to verification level 1 when GPS is far from the restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "Great biryani here.",
        userLocation: { lat: 17.4326, lng: 78.4071 }, // Jubilee Hills, ~5km away
      },
      store,
    );

    expect(result.verificationLevel).toBe(1);
  });

  it("creates a new community place when no restaurantId is given", async () => {
    const { store, restaurants } = createTestStore();

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        communityPlace: {
          name: "Nimrah Cafe",
          location: { lat: 17.3616, lng: 78.4747 },
          area: "Charminar",
          city: "Hyderabad",
        },
        dishName: "Osmania Biscuit",
        mealTags: ["cafe"],
        signalTags: ["hidden_gem"],
        primarySignal: "recommend",
        caption: "Come after Charminar closes, sit outside.",
      },
      store,
    );

    expect(restaurants.size).toBe(1);
    expect(restaurants.get(result.restaurantId)?.name).toBe("Nimrah Cafe");
    expect(restaurants.get(result.restaurantId)?.source).toBe("community");
  });

  it("dedupes to an existing nearby community place instead of creating a duplicate", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Nimrah Cafe",
      source: "community",
      location: { lat: 17.3616, lng: 78.4747 },
      area: "Charminar",
      city: "Hyderabad",
      aggregates: { recCount: 3 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u2",
        communityPlace: {
          name: "Nimrah Cafe", // same name, ~30m away - should dedupe, not duplicate
          location: { lat: 17.3617, lng: 78.4747 },
          area: "Charminar",
          city: "Hyderabad",
        },
        dishName: "Irani Chai",
        mealTags: ["cafe"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "The chai alone is worth it.",
      },
      store,
    );

    expect(result.restaurantId).toBe("r1");
    expect(restaurants.size).toBe(1);
  });

  it("rejects a caption shorter than 10 characters", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    await expect(
      createRecommendationHandler(
        {
          authorId: "u1",
          restaurantId: "r1",
          dishName: "Biryani",
          mealTags: ["dinner"],
          signalTags: [],
          primarySignal: "recommend",
          caption: "good",
          userLocation: undefined,
        },
        store,
      ),
    ).rejects.toThrow(/caption/i);
  });

  it("rejects a communityPlace with invalid (NaN) location coordinates", async () => {
    const { store } = createTestStore();

    await expect(
      createRecommendationHandler(
        {
          authorId: "u1",
          communityPlace: {
            name: "Nimrah Cafe",
            location: { lat: NaN, lng: 78.47 },
            area: "Charminar",
            city: "Hyderabad",
          },
          dishName: "Osmania Biscuit",
          mealTags: ["cafe"],
          signalTags: [],
          primarySignal: "recommend",
          caption: "Come after Charminar closes, sit outside.",
        },
        store,
      ),
    ).rejects.toThrow(/location/i);
  });

  it("rejects when neither restaurantId nor communityPlace is given", async () => {
    const { store } = createTestStore();

    await expect(
      createRecommendationHandler(
        {
          authorId: "u1",
          dishName: "Biryani",
          mealTags: ["dinner"],
          signalTags: [],
          primarySignal: "recommend",
          caption: "Great biryani here, really.",
        },
        store,
      ),
    ).rejects.toThrow(/restaurant/i);
  });
});
