import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { updateHomeAreaHandler } from "./updateHomeArea.js";

describe("updateHomeAreaHandler", () => {
  it("sets the user's home area", async () => {
    const { store, users } = createTestStore();
    users.set("u1", {
      id: "u1",
      username: "priyanka.eats",
      displayName: "Priyanka R.",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: Date.now(),
    });

    const result = await updateHomeAreaHandler({ uid: "u1", homeArea: "Jubilee Hills" }, store);

    expect(result.homeArea).toBe("Jubilee Hills");
    expect(users.get("u1")?.homeArea).toBe("Jubilee Hills");
  });

  it("rejects an area that isn't in the supported list", async () => {
    const { store, users } = createTestStore();
    users.set("u1", {
      id: "u1",
      username: "priyanka.eats",
      displayName: "Priyanka R.",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      homeArea: null,
      tierHistory: [],
      voteWeightPenaltyUntil: null,
      createdAt: Date.now(),
    });

    await expect(updateHomeAreaHandler({ uid: "u1", homeArea: "Atlantis" }, store)).rejects.toThrow(/area/i);
    expect(users.get("u1")?.homeArea).toBeNull();
  });
});
