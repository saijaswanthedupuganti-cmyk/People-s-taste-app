import type { Tier } from "./types.js";

export interface TrustInputs {
  accountCreatedAt: number;
  now: number;
  recCount: number;
  verifiedRecCount: number;
  weightedHelpfulReceived: number;
}

export interface TrustResult {
  score: number;
  tier: Tier;
}

const MS_PER_DAY = 86_400_000;

// v1 formula per master doc §9.1. consistencyFactor and communityFactor are
// fixed at 0 - they need posting-cadence history and the Following system,
// neither of which exist yet. The §9.3 velocity-check penalty is likewise
// deferred. All three get wired in once their inputs exist.
export function computeTrust(inputs: TrustInputs): TrustResult {
  const accountAgeDays = Math.max(0, (inputs.now - inputs.accountCreatedAt) / MS_PER_DAY);
  const accountAgeFactor = Math.min(10, (accountAgeDays / 365) * 10);

  const verificationFactor =
    inputs.recCount === 0 ? 0 : Math.min(25, (inputs.verifiedRecCount / inputs.recCount) * 25);

  // Scale is a v1 placeholder - tune once real weighted-helpful distributions exist.
  const helpfulReceivedFactor = Math.min(30, inputs.weightedHelpfulReceived * 0.5);

  const score = Math.round(10 + accountAgeFactor + verificationFactor + helpfulReceivedFactor);
  return { score, tier: tierForScore(score) };
}

// v1 thresholds - the master doc lists tiers with no numeric cutoffs yet
// (§9.1), so these are a placeholder spanning the 0-100 trust range. Revisit
// once real trust-score distributions exist across actual users.
const TIER_THRESHOLDS: [number, Tier][] = [
  [80, "legend"],
  [65, "city_expert"],
  [50, "neighborhood_expert"],
  [35, "verified_foodie"],
  [20, "local_foodie"],
  [0, "explorer"],
];

function tierForScore(score: number): Tier {
  for (const [min, tier] of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return "explorer";
}
