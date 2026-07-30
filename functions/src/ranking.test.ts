import { describe, expect, it } from "vitest";
import { computeRankingScore } from "./ranking.js";

const MS_PER_DAY = 86_400_000;
const BASE_NOW = new Date("2026-07-30T00:00:00Z").getTime();

describe("computeRankingScore", () => {
  it("returns 0 when weightedHelpful is 0, regardless of trust or verification", () => {
    const score = computeRankingScore({
      weightedHelpful: 0,
      trustSnapshot: 90,
      verificationMultiplier: 1.7,
      createdAt: BASE_NOW,
      now: BASE_NOW,
    });
    expect(score).toBe(0);
  });

  it("multiplies weightedHelpful by trustSnapshot/100 and the verification multiplier with no time decay at t=0", () => {
    const score = computeRankingScore({
      weightedHelpful: 10,
      trustSnapshot: 80,
      verificationMultiplier: 1.3,
      createdAt: BASE_NOW,
      now: BASE_NOW,
    });
    // 10 * 0.8 * 1.3 * e^0 = 10.4
    expect(score).toBeCloseTo(10.4, 5);
  });

  it("decays to exactly 50% at the 365-day half-life (§11.1)", () => {
    const createdAt = BASE_NOW;
    const now = BASE_NOW + 365 * MS_PER_DAY;
    const score = computeRankingScore({
      weightedHelpful: 10,
      trustSnapshot: 100,
      verificationMultiplier: 1.0,
      createdAt,
      now,
    });
    expect(score).toBeCloseTo(5, 2); // base score is 10 * 1.0 * 1.0 = 10, half of that at 365 days
  });

  it("matches §11.1's documented decay curve within rounding: 7d≈99%, 30d≈94%, 90d≈84%, 180d≈71%", () => {
    const base = { weightedHelpful: 100, trustSnapshot: 100, verificationMultiplier: 1.0, createdAt: BASE_NOW };
    const ratioAt = (days: number) =>
      computeRankingScore({ ...base, now: BASE_NOW + days * MS_PER_DAY }) / 100;

    expect(ratioAt(7)).toBeCloseTo(0.99, 1);
    expect(ratioAt(30)).toBeCloseTo(0.94, 1);
    expect(ratioAt(90)).toBeCloseTo(0.84, 1);
    expect(ratioAt(180)).toBeCloseTo(0.71, 1);
  });

  it("never decays below 0 or produces a negative score for a createdAt in the future (clock skew safety)", () => {
    const score = computeRankingScore({
      weightedHelpful: 5,
      trustSnapshot: 50,
      verificationMultiplier: 1.0,
      createdAt: BASE_NOW + MS_PER_DAY,
      now: BASE_NOW,
    });
    expect(score).toBeGreaterThan(0);
  });
});
