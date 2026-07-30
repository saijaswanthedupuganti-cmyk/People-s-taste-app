import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MealTag, PrimarySignal, Recommendation, Restaurant, SignalTag, Tier } from "../types";

interface RawRestaurant {
  name: string;
  source: "google" | "community";
  area: string;
  city: string;
  aggregates: { recCount: number };
}

interface RawUser {
  username: string;
  displayName: string;
  photoURL: string;
  tier: Tier;
  trustScore?: number;
  recCount?: number;
}

interface RawRecommendation {
  authorId: string;
  restaurantId: string;
  dishName: string | null;
  mealTags: string[];
  signalTags: string[];
  primarySignal: PrimarySignal;
  caption: string;
  verificationLevel: 1 | 2;
  weightedHelpful: number;
  helpfulVoteCount: number;
  status: string;
  proofUrl: string | null;
  photo: string | null;
  createdAt: Timestamp;
}

async function fetchByIds<T>(collectionName: string, ids: string[]): Promise<Map<string, T>> {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const snap = await getDoc(doc(db, collectionName, id));
      return [id, snap.exists() ? (snap.data() as T) : undefined] as const;
    }),
  );
  return new Map(entries.filter((e): e is [string, T] => e[1] !== undefined));
}

function toRecommendation(
  id: string,
  raw: RawRecommendation,
  restaurant: RawRestaurant | undefined,
  author: RawUser | undefined,
): Recommendation {
  return {
    id,
    author: {
      uid: raw.authorId,
      username: author?.username ?? "unknown",
      displayName: author?.displayName ?? "Unknown",
      photoURL: author?.photoURL ?? "",
      tier: author?.tier ?? "explorer",
    },
    restaurant: {
      id: raw.restaurantId,
      name: restaurant?.name ?? "Unknown place",
      area: restaurant?.area ?? "",
      city: restaurant?.city ?? "",
    },
    dishName: raw.dishName,
    photo: raw.photo ?? null,
    mealTags: raw.mealTags as MealTag[],
    signalTags: raw.signalTags as SignalTag[],
    primarySignal: raw.primarySignal,
    caption: raw.caption,
    verificationLevel: raw.verificationLevel,
    weightedHelpful: raw.weightedHelpful,
    helpfulVoteCount: raw.helpfulVoteCount,
    proofUrl: raw.proofUrl ?? null,
    createdAt: raw.createdAt.toDate().toISOString(),
  };
}

function restaurantDocToUi(id: string, data: RawRestaurant): Restaurant {
  return {
    id,
    name: data.name,
    source: data.source,
    area: data.area,
    city: data.city,
    priceBand: 1,
    categories: [],
    coverPhoto: "",
    aggregates: { recCount: data.aggregates.recCount, topDishName: "" },
  };
}

export async function fetchFeed(limitCount = 50): Promise<Recommendation[]> {
  const snap = await getDocs(
    query(
      collection(db, "recommendations"),
      where("status", "==", "live"),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as RawRecommendation }));
  const [restaurants, users] = await Promise.all([
    fetchByIds<RawRestaurant>("restaurants", docs.map((d) => d.data.restaurantId)),
    fetchByIds<RawUser>("users", docs.map((d) => d.data.authorId)),
  ]);
  return docs.map((d) => toRecommendation(d.id, d.data, restaurants.get(d.data.restaurantId), users.get(d.data.authorId)));
}

export async function fetchRecommendation(id: string): Promise<Recommendation | null> {
  const snap = await getDoc(doc(db, "recommendations", id));
  if (!snap.exists()) return null;
  const raw = snap.data() as RawRecommendation;
  const [restaurantSnap, authorSnap] = await Promise.all([
    getDoc(doc(db, "restaurants", raw.restaurantId)),
    getDoc(doc(db, "users", raw.authorId)),
  ]);
  return toRecommendation(
    snap.id,
    raw,
    restaurantSnap.exists() ? (restaurantSnap.data() as RawRestaurant) : undefined,
    authorSnap.exists() ? (authorSnap.data() as RawUser) : undefined,
  );
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const snap = await getDocs(collection(db, "restaurants"));
  return snap.docs.map((d) => restaurantDocToUi(d.id, d.data() as RawRestaurant));
}

export async function fetchRestaurantById(id: string): Promise<Restaurant | null> {
  const snap = await getDoc(doc(db, "restaurants", id));
  if (!snap.exists()) return null;
  return restaurantDocToUi(snap.id, snap.data() as RawRestaurant);
}

export async function fetchRecommendationsForRestaurant(restaurantId: string): Promise<Recommendation[]> {
  const [restaurantSnap, recSnap] = await Promise.all([
    getDoc(doc(db, "restaurants", restaurantId)),
    getDocs(
      query(
        collection(db, "recommendations"),
        where("restaurantId", "==", restaurantId),
        where("status", "==", "live"),
        orderBy("createdAt", "desc"),
      ),
    ),
  ]);
  const restaurant = restaurantSnap.exists() ? (restaurantSnap.data() as RawRestaurant) : undefined;
  const docs = recSnap.docs.map((d) => ({ id: d.id, data: d.data() as RawRecommendation }));
  const users = await fetchByIds<RawUser>("users", docs.map((d) => d.data.authorId));
  return docs.map((d) => toRecommendation(d.id, d.data, restaurant, users.get(d.data.authorId)));
}

export interface PersonSummary {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  tier: Tier;
  recCount: number;
}

export async function fetchPeople(limitCount = 50): Promise<PersonSummary[]> {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("trustScore", "desc"), limit(limitCount)),
  );
  return snap.docs.map((d) => {
    const data = d.data() as RawUser;
    return {
      uid: d.id,
      username: data.username,
      displayName: data.displayName,
      photoURL: data.photoURL,
      tier: data.tier,
      recCount: data.recCount ?? 0,
    };
  });
}

export async function fetchUserByUsername(
  username: string,
): Promise<{ uid: string; profile: RawUser } | null> {
  const snap = await getDocs(query(collection(db, "users"), where("username", "==", username), limit(1)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, profile: d.data() as RawUser };
}

export async function fetchRecommendationsByAuthor(authorId: string): Promise<Recommendation[]> {
  const snap = await getDocs(
    query(
      collection(db, "recommendations"),
      where("authorId", "==", authorId),
      where("status", "==", "live"),
      orderBy("createdAt", "desc"),
    ),
  );
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as RawRecommendation }));
  const [restaurants, authorSnap] = await Promise.all([
    fetchByIds<RawRestaurant>("restaurants", docs.map((d) => d.data.restaurantId)),
    getDoc(doc(db, "users", authorId)),
  ]);
  const author = authorSnap.exists() ? (authorSnap.data() as RawUser) : undefined;
  return docs.map((d) => toRecommendation(d.id, d.data, restaurants.get(d.data.restaurantId), author));
}
