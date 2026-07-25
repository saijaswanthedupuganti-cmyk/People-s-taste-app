import type { Store } from "../store.js";
import { haversineMeters } from "../geo.js";
import { computeTrust } from "../trust.js";

const GPS_VERIFICATION_RADIUS_METERS = 100;
const COMMUNITY_PLACE_DEDUPE_RADIUS_METERS = 150;
const PROOF_URL_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "instagram.com", "www.instagram.com"];

export interface CreateRecommendationInput {
  authorId: string;
  restaurantId?: string;
  communityPlace?: {
    name: string;
    location: { lat: number; lng: number };
    area: string;
    city: string;
  };
  dishName: string | null;
  mealTags: string[];
  signalTags: string[];
  primarySignal: "recommend" | "must_try";
  caption: string;
  userLocation?: { lat: number; lng: number };
  proofUrl?: string | null;
}

// Manual proof link only (§ per-post verification) — not tied to verificationLevel/trust,
// just an outbound link the author can attach as evidence, shown as-is on the post.
function normalizeProofUrl(proofUrl: string | null | undefined): string | null {
  const trimmed = proofUrl?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("proofUrl must be a valid URL");
  }
  if (!PROOF_URL_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error("proofUrl must be a YouTube or Instagram link");
  }
  return parsed.toString();
}

export interface CreateRecommendationResult {
  recommendationId: string;
  restaurantId: string;
  verificationLevel: 1 | 2;
}

export async function createRecommendationHandler(
  input: CreateRecommendationInput,
  store: Store,
  now: number,
): Promise<CreateRecommendationResult> {
  const caption = input.caption.trim();
  if (caption.length < 10 || caption.length > 500) {
    throw new Error("caption must be between 10 and 500 characters");
  }
  const proofUrl = normalizeProofUrl(input.proofUrl);

  let restaurantId: string;
  let restaurantLocation: { lat: number; lng: number } | null = null;

  if (input.restaurantId) {
    const restaurant = await store.getRestaurant(input.restaurantId);
    if (!restaurant) throw new Error("restaurant not found");
    restaurantId = restaurant.id;
    restaurantLocation = restaurant.location;
  } else if (input.communityPlace) {
    if (
      !input.communityPlace.location ||
      !Number.isFinite(input.communityPlace.location.lat) ||
      !Number.isFinite(input.communityPlace.location.lng)
    ) {
      throw new Error("communityPlace.location must include valid lat/lng coordinates");
    }

    const nearby = await store.findNearbyRestaurants(
      input.communityPlace.location.lat,
      input.communityPlace.location.lng,
      COMMUNITY_PLACE_DEDUPE_RADIUS_METERS,
    );
    const duplicate = nearby.find(
      (r) =>
        haversineMeters(
          r.location.lat,
          r.location.lng,
          input.communityPlace!.location.lat,
          input.communityPlace!.location.lng,
        ) <= COMMUNITY_PLACE_DEDUPE_RADIUS_METERS &&
        r.name.trim().toLowerCase() === input.communityPlace!.name.trim().toLowerCase(),
    );
    if (duplicate) {
      restaurantId = duplicate.id;
      restaurantLocation = duplicate.location;
    } else {
      restaurantId = await store.createRestaurant({
        name: input.communityPlace.name,
        location: input.communityPlace.location,
        area: input.communityPlace.area,
        city: input.communityPlace.city,
        createdBy: input.authorId,
      });
      restaurantLocation = input.communityPlace.location;
    }
  } else {
    throw new Error("either restaurantId or communityPlace is required");
  }

  let verificationLevel: 1 | 2 = 1;
  if (input.userLocation && restaurantLocation) {
    const distance = haversineMeters(
      input.userLocation.lat,
      input.userLocation.lng,
      restaurantLocation.lat,
      restaurantLocation.lng,
    );
    if (distance <= GPS_VERIFICATION_RADIUS_METERS) verificationLevel = 2;
  }

  const author = await store.getUser(input.authorId);
  const trustSnapshot = author?.trustScore ?? 10;

  const recommendationId = await store.createRecommendation({
    authorId: input.authorId,
    restaurantId,
    dishName: input.dishName,
    mealTags: input.mealTags,
    signalTags: input.signalTags,
    primarySignal: input.primarySignal,
    caption,
    verificationLevel,
    trustSnapshot,
    proofUrl,
  });

  await store.incrementRestaurantRecCount(restaurantId);

  if (author) {
    await store.incrementUserRecCount(input.authorId, verificationLevel === 2);
    const updatedAuthor = await store.getUser(input.authorId);
    const { score, tier } = computeTrust({
      accountCreatedAt: updatedAuthor!.createdAt,
      now,
      recCount: updatedAuthor!.recCount,
      verifiedRecCount: updatedAuthor!.verifiedRecCount,
      weightedHelpfulReceived: updatedAuthor!.weightedHelpfulReceived,
    });
    await store.updateUserTrust(input.authorId, score, tier);
  }

  return { recommendationId, restaurantId, verificationLevel };
}
