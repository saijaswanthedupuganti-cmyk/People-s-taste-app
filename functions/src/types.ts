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
}

export interface VoteRecord {
  weight: number;
}
