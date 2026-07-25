export interface RestaurantRecord {
  id: string;
  name: string;
  source: "google" | "community";
  location: { lat: number; lng: number };
  area: string;
  city: string;
  aggregates: { recCount: number };
  createdBy: string;
  createdAt: number;
}

export interface NewRestaurantInput {
  name: string;
  location: { lat: number; lng: number };
  area: string;
  city: string;
  createdBy: string;
}

export type RecommendationStatus = "live" | "suppressed" | "removed";

export interface RecommendationRecord {
  id: string;
  authorId: string;
  restaurantId: string;
  dishName: string | null;
  mealTags: string[];
  signalTags: string[];
  primarySignal: "recommend" | "must_try";
  caption: string;
  verificationLevel: 1 | 2;
  /** §11.1 ranking multiplier matching verificationLevel (1.0 / 1.3). Stored so ranking can be
   * recomputed without re-deriving it from verificationLevel every read. */
  verificationMultiplier: number;
  trustSnapshot: number;
  weightedHelpful: number;
  helpfulVoteCount: number;
  status: RecommendationStatus;
  /** §10/§14 — GPS claimed at post time was implausibly far from the restaurant (different
   * city/country) or implausibly fast since the author's last geo-tagged post (impossible
   * travel). Never blocks the post; only suppresses its ranking weight (§21.1). */
  geoMismatch: boolean;
  /** §15 `geoAtPost` — private, never exposed publicly. Powers the impossible-travel check. */
  geoAtPost: { lat: number; lng: number } | null;
  proofUrl: string | null;
  photo: string | null;
  createdAt: number;
}

export interface NewRecommendationInput {
  authorId: string;
  restaurantId: string;
  dishName: string | null;
  mealTags: string[];
  signalTags: string[];
  primarySignal: "recommend" | "must_try";
  caption: string;
  verificationLevel: 1 | 2;
  verificationMultiplier: number;
  trustSnapshot: number;
  geoMismatch: boolean;
  geoAtPost: { lat: number; lng: number } | null;
  proofUrl: string | null;
  photo: string | null;
}

export interface VoteRecord {
  voterUid: string;
  weight: number;
  createdAt: number;
}

export type Tier = "explorer" | "local_foodie" | "verified_foodie" | "neighborhood_expert" | "city_expert" | "legend";

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
  tier: Tier;
  trustScore: number;
  recCount: number;
  verifiedRecCount: number;
  weightedHelpfulReceived: number;
  homeArea: string | null;
  /** §9.3 trust-velocity anti-farming check — every tier change appended here. */
  tierHistory: { tier: Tier; enteredAt: number }[];
  /** §9.3 — when set and in the future, this user's cast votes are weighted ×0.5 until then. */
  voteWeightPenaltyUntil: number | null;
  createdAt: number;
}

export interface NewUserInput {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
}

export interface BlockRecord {
  blockerUid: string;
  blockedUid: string;
  createdAt: number;
}
