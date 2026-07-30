const MS_PER_DAY = 86_400_000;

// §11.1 locked v1 ranking formula: rankingScore = (weightedHelpful * trustSnapshot/100 *
// verificationMultiplier) * e^(-k*deltaT). k = ln(2)/365 gives a 365-day half-life -- much
// slower than a content feed's hours-long half-life (Reddit/HN ~10-12h) by design: a great
// biryani recommendation shouldn't fade like a news post. weightedHelpful=0 (a brand-new
// recommendation with no votes yet) always scores 0 -- this is a known, accepted v1 gap
// (§11.2), not a bug; it's fixed only once real usage data exists to tune a v2 formula.
const HALF_LIFE_DAYS = 365;
const DECAY_K = Math.log(2) / HALF_LIFE_DAYS;

export interface RankingScoreInputs {
  weightedHelpful: number;
  trustSnapshot: number;
  verificationMultiplier: number;
  createdAt: number;
  now: number;
}

export function computeRankingScore(inputs: RankingScoreInputs): number {
  const ageDays = Math.max(0, (inputs.now - inputs.createdAt) / MS_PER_DAY);
  const decay = Math.exp(-DECAY_K * ageDays);
  return inputs.weightedHelpful * (inputs.trustSnapshot / 100) * inputs.verificationMultiplier * decay;
}
