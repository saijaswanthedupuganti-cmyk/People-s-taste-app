export type Tier = "explorer" | "local_foodie" | "verified_foodie" | "neighborhood_expert" | "city_expert" | "legend";

export type MealTag = "breakfast" | "lunch" | "dinner" | "late_night" | "cafe" | "dessert" | "drinks" | "brunch";

export type SignalTag =
  | "hidden_gem"
  | "worth_traveling_for"
  | "best_value"
  | "would_return"
  | "late_night_favorite"
  | "family_friendly"
  | "solo_friendly"
  | "overrated";

export type PrimarySignal = "recommend" | "must_try";

export type VerificationLevel = 1 | 2 | 3 | 4;

export interface Author {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  tier: Tier;
}

export interface Restaurant {
  id: string;
  name: string;
  source: "google" | "community";
  area: string;
  city: string;
  priceBand: 1 | 2 | 3;
  categories: string[];
  coverPhoto: string;
  aggregates: {
    recCount: number;
    topDishName: string;
  };
}

export interface Recommendation {
  id: string;
  author: Author;
  restaurant: Pick<Restaurant, "id" | "name" | "area" | "city">;
  dishName: string | null;
  photo: string | null;
  mealTags: MealTag[];
  signalTags: SignalTag[];
  primarySignal: PrimarySignal;
  caption: string;
  verificationLevel: VerificationLevel;
  /** Trust-weighted sum used for ranking (§11.1) — internal only, never rendered directly. */
  weightedHelpful: number;
  /** Plain count of Helpful votes — this is what the UI displays. */
  helpfulVoteCount: number;
  createdAt: string;
}

export const TIER_LABEL: Record<Tier, string> = {
  explorer: "Explorer",
  local_foodie: "Local Foodie",
  verified_foodie: "Verified Foodie",
  neighborhood_expert: "Neighborhood Expert",
  city_expert: "City Expert",
  legend: "Legend",
};

export const MEAL_LABEL: Record<MealTag, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  late_night: "Late Night",
  cafe: "Café",
  dessert: "Dessert",
  drinks: "Drinks",
  brunch: "Brunch",
};

export const SIGNAL_LABEL: Record<SignalTag, string> = {
  hidden_gem: "Hidden Gem",
  worth_traveling_for: "Worth Traveling For",
  best_value: "Best Value",
  would_return: "Would Return",
  late_night_favorite: "Late-Night Favorite",
  family_friendly: "Family-Friendly",
  solo_friendly: "Solo-Friendly",
  overrated: "Overrated",
};
