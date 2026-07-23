import { describe, expect, it } from "vitest";
import { computeTrust } from "./trust.js";

const DAY = 86_400_000;

describe("computeTrust", () => {
  it("gives a brand-new user the base score of 10 and the explorer tier", () => {
    const result = computeTrust({
      accountCreatedAt: 1000,
      now: 1000,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });

    expect(result.score).toBe(10);
    expect(result.tier).toBe("explorer");
  });

  it("adds up to +10 for account age, maxing out at 365 days", () => {
    const halfYear = computeTrust({
      accountCreatedAt: 0,
      now: 182.5 * DAY,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(halfYear.score).toBe(15); // 10 base + 5 (half of the +10 max)

    const overAYear = computeTrust({
      accountCreatedAt: 0,
      now: 400 * DAY,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(overAYear.score).toBe(20); // capped at +10, does not keep climbing
  });

  it("adds up to +25 for verification share", () => {
    const allVerified = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 4,
      verifiedRecCount: 4,
      weightedHelpfulReceived: 0,
    });
    expect(allVerified.score).toBe(35); // 10 base + 25 (100% verified)

    const halfVerified = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 4,
      verifiedRecCount: 2,
      weightedHelpfulReceived: 0,
    });
    expect(halfVerified.score).toBe(23); // 10 base + 12.5 rounded
  });

  it("does not divide by zero when recCount is 0", () => {
    const result = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(result.score).toBe(10);
  });

  it("adds up to +30 for weighted helpful votes received, capped", () => {
    const someHelpful = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 20,
    });
    expect(someHelpful.score).toBe(20); // 10 base + min(30, 20*0.5=10) = 20

    const lotsOfHelpful = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 1000,
    });
    expect(lotsOfHelpful.score).toBe(40); // capped at 10 base + 30
  });

  it("maps scores to tiers using the v1 thresholds", () => {
    expect(computeTrust({ accountCreatedAt: 0, now: 0, recCount: 0, verifiedRecCount: 0, weightedHelpfulReceived: 0 }).tier).toBe("explorer");
    expect(
      computeTrust({ accountCreatedAt: 0, now: 0, recCount: 10, verifiedRecCount: 10, weightedHelpfulReceived: 40 }).tier,
    ).toBe("neighborhood_expert"); // 10 base + 0 age + 25 verification + 20 helpful = 55 → neighborhood_expert
  });
});
