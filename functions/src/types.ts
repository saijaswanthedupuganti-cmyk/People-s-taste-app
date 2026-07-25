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
  trustSnapshot: number;
  weightedHelpful: number;
  helpfulVoteCount: number;
  status: string;
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
  trustSnapshot: number;
  proofUrl: string | null;
  photo: string | null;
}

export interface VoteRecord {
  weight: number;
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
  createdAt: number;
}

export interface NewUserInput {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
}
