# Recommendation Write Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make posting a recommendation, saving one, and voting Helpful actually persist to Firestore — today all three are UI-only (Post shows "saved locally, not wired"; Save/Helpful buttons have local React state only). This is the prerequisite for the home-feed-personalization plan, which needs real signals to personalize from.

**Architecture:** Firebase Cloud Functions v2 (callable functions), Firestore as the data store. Each function's business logic is written against a narrow `Store` interface (not the Firestore SDK directly) so it can be unit-tested with a fast in-memory fake — no Firestore emulator required (this machine has no Java runtime, which the emulator needs). The real Firestore-backed implementation of `Store` is a thin adapter written once and used only in production wiring, never exercised by the test suite directly (that's an accepted trade-off — see Task 8 note).

**Tech Stack:** firebase-functions v2, firebase-admin, TypeScript, Vitest (already used by neither this repo nor its sibling — this introduces it fresh for `functions/`).

## Global Constraints

- Trust engine (master doc §9) is not built yet. Every user's effective trust defaults to the documented base score of **10** (§9.1: "Every user starts at 10") until the real trust engine ships — this is a named placeholder, not a silent guess, and every place it's used says so in a comment.
- Verification levels follow master doc §10 exactly: L1 claimed (×1.0, no proof), L2 GPS (×1.3, device location within 100m of the restaurant at post time), L3/L3+ (photo/receipt) are **not** implemented in this plan — no Storage upload path exists yet, so every recommendation created here is capped at L1 or L2.
- Community Places (§5.1): a `createRecommendation` call may include inline place fields (name + lat/lng) instead of an existing `restaurantId`, dedupe-checked against restaurants within 150m before creating a new one. This is how restaurants get into Firestore at all right now — there's no Google Places API key configured, so Google-sourced restaurant creation is out of scope for this plan.
- All security-relevant fields (`weightedHelpful`, `helpfulVoteCount`, `trustSnapshot`, `aggregates.recCount`) are Cloud-Function-written only. Firestore rules deny direct client writes to `recommendations`, `restaurants`, `saves`, and `votes` — this plan replaces the current blanket `allow write: if false` placeholder rules with the same deny, scoped correctly per collection instead of one catch-all.
- Home Feed / Search continue reading `MOCK_FEED` (unchanged) — wiring the feed itself to real Firestore data is explicitly the personalization plan's job (it rewrites the feed-fetch logic anyway to add `tasteBoost`), not this one. Rewiring it twice would be wasted work.

---

## File Structure

```
functions/
  package.json
  tsconfig.json
  vitest.config.ts
  firestore.rules            <- moved here conceptually; actual file stays at repo root (Firebase requirement), see Task 2
  src/
    admin.ts                 Initializes firebase-admin once, exports the Admin Firestore instance
    geo.ts                   Pure haversine distance helper (server-side twin of src/lib/geo.ts)
    types.ts                 Shared TS types for the Store interface and Cloud Function payloads
    store.ts                 Store interface + real Firestore-backed implementation (FirestoreStore)
    testStore.ts             In-memory fake implementing Store, for tests only
    recommendations/
      createRecommendation.ts
      createRecommendation.test.ts
      toggleHelpfulVote.ts
      toggleHelpfulVote.test.ts
    saves/
      toggleSave.ts
      toggleSave.test.ts
    index.ts                 Exports the three onCall-wrapped functions
src/
  lib/
    firebase.ts               MODIFY: add `functions` export
  pages/
    Post.tsx                  MODIFY: real submit via httpsCallable
firebase.json                 MODIFY: add functions config
```

**Deliberately not touched by this plan:** `RecommendationCard.tsx`'s Save button and `RecommendationDetail.tsx`'s Save/Helpful buttons. They currently render `MOCK_FEED` data with fake IDs (`"rec1"`, `"rec2"`...) — wiring them to the real `toggleSave`/`toggleHelpfulVote` functions now would mean clicking Save on a mock card either silently writes a save pointing at nothing, or clicking Helpful throws a visible "recommendation not found" error. Both buttons get wired for real in the personalization plan, at the same time the feed itself switches from `MOCK_FEED` to real Firestore reads — doing it here would mean wiring it twice.

---

## Task 1: Cloud Functions project scaffolding + test harness

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/vitest.config.ts`
- Create: `functions/src/geo.ts`
- Create: `functions/src/geo.test.ts`
- Modify: `firebase.json`

**Interfaces:**
- Produces: `haversineMeters(lat1, lng1, lat2, lng2): number` — used by Task 4 (GPS verification) and Task 4/community-place dedupe.

- [ ] **Step 1: Create the functions package**

```json
{
  "name": "peoples-taste-functions",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^5.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.1.1",
    "@types/node": "^20.14.15"
  }
}
```

Save as `functions/package.json`.

- [ ] **Step 2: Create the TypeScript config**

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

Save as `functions/tsconfig.json`.

- [ ] **Step 3: Create the Vitest config**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Save as `functions/vitest.config.ts`.

- [ ] **Step 4: Install dependencies**

```bash
cd functions && npm install
```

Expected: installs cleanly, creates `functions/package-lock.json` and `functions/node_modules/`.

- [ ] **Step 5: Write the failing test for the geo helper**

```typescript
import { describe, expect, it } from "vitest";
import { haversineMeters } from "./geo.js";

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(17.4326, 78.4071, 17.4326, 78.4071)).toBe(0);
  });

  it("returns roughly correct distance for two known points", () => {
    // Jubilee Hills to Banjara Hills, Hyderabad - roughly 3.1km apart
    const d = haversineMeters(17.4326, 78.4071, 17.4156, 78.4347);
    expect(d).toBeGreaterThan(2800);
    expect(d).toBeLessThan(3400);
  });

  it("is symmetric", () => {
    const a = haversineMeters(17.4326, 78.4071, 17.4156, 78.4347);
    const b = haversineMeters(17.4156, 78.4347, 17.4326, 78.4071);
    expect(a).toBeCloseTo(b, 6);
  });
});
```

Save as `functions/src/geo.test.ts`.

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd functions && npx vitest run src/geo.test.ts`
Expected: FAIL — `Cannot find module './geo.js'` (file doesn't exist yet).

- [ ] **Step 7: Implement the geo helper**

```typescript
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

Save as `functions/src/geo.ts`.

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd functions && npx vitest run src/geo.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 9: Wire functions into firebase.json**

Read the current `firebase.json` first (it only has a `firestore` block from Phase 0). Add a `functions` block alongside it:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "asia-south1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ]
}
```

- [ ] **Step 10: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/tsconfig.json functions/vitest.config.ts functions/src/geo.ts functions/src/geo.test.ts firebase.json
git commit -m "Scaffold Cloud Functions project with Vitest test harness"
```

---

## Task 2: Firestore security rules for the write path

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- No code interfaces — this is a rules-only task, verified by manual emulator inspection since the Firestore emulator (which `firebase emulators:exec` would use to run `@firebase/rules-unit-testing`) needs a JRE this machine doesn't have. See the note in Step 3.

- [ ] **Step 1: Read the current rules**

The Phase 0 placeholder (`firestore.rules` at repo root) currently denies all writes with one catch-all rule. Read it before editing so the replacement is a deliberate rewrite, not a blind overwrite.

- [ ] **Step 2: Replace with per-collection rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow write: if false;

      match /votes/{voterUid} {
        allow read: if true;
        allow write: if false;
      }
    }

    match /dishes/{dishId} {
      allow read: if true;
      allow write: if false;
    }

    match /recommendations/{recId} {
      allow read: if true;
      allow write: if false;

      match /votes/{voterUid} {
        allow read: if true;
        allow write: if false;
      }
    }

    match /saves/{saveId} {
      allow read: if request.auth != null && saveId.matches(request.auth.uid + '_.*');
      allow write: if false;
    }

    match /{document=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

Every collection Cloud Functions write to is explicitly `allow write: if false` for clients — the Admin SDK (which every function in this plan uses) bypasses rules entirely, so this correctly locks out direct client writes while Functions keep working. Visitors (no `request.auth`) can read `restaurants`, `dishes`, and `recommendations` — matches the locked Visitor role (§7: "Browse, search, view everything"). `saves` are private to their owner (doc ID is `{uid}_{recId}`, so the match pattern only allows a signed-in user to read their own).

**Correction (found in Task 2's review, fixed before Task 3 began):** the catch-all originally read `allow read: if request.auth != null;`. Firestore ORs every matching rule block for a path rather than letting a more specific block shadow a broader one — that catch-all was granting any signed-in user read access to `/saves/{anything}`, defeating the ownership check right above it. Fixed to deny-by-default (`allow read: if false;`). The named, explicit-read collections (`restaurants`/`dishes`/`recommendations`/`votes`) are unaffected — they already grant read via their own specific blocks, not via the catch-all.

- [ ] **Step 3: Verify with a manual local check (no emulator available)**

Since the Firestore emulator needs a JRE this machine doesn't have, rules can't be exercised by an automated test here. Instead, sanity-check the rules file directly:

Run: `firebase deploy --only firestore:rules --project peoplestaste8 --dry-run 2>&1 || echo "no --dry-run support, will validate on real deploy"`

If `--dry-run` isn't supported by the installed CLI version, that's fine — the rules will be validated for syntax errors at actual deploy time in Task 8. Flag to the user in the handoff message (end of this plan) that installing a JRE and running `firebase emulators:start --only firestore` locally is the way to interactively test these rules before relying on them in production; not blocking this plan, but worth doing before the beta opens signups.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "Replace blanket-deny Firestore rules with per-collection rules for the write path"
```

---

## Task 3: Store interface + in-memory test fake

**Files:**
- Create: `functions/src/types.ts`
- Create: `functions/src/store.ts`
- Create: `functions/src/testStore.ts`

**Interfaces:**
- Produces: the `Store` interface and `createTestStore()` factory that Tasks 4-6 depend on.

- [ ] **Step 1: Define shared types**

```typescript
export interface RestaurantRecord {
  id: string;
  name: string;
  source: "google" | "community";
  location: { lat: number; lng: number };
  area: string;
  city: string;
  aggregates: { recCount: number };
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
```

Save as `functions/src/types.ts`.

- [ ] **Step 2: Define the Store interface and its real Firestore-backed implementation**

```typescript
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type {
  NewRecommendationInput,
  NewRestaurantInput,
  RecommendationRecord,
  RestaurantRecord,
  VoteRecord,
} from "./types.js";

export interface Store {
  getRestaurant(id: string): Promise<RestaurantRecord | null>;
  findNearbyRestaurants(lat: number, lng: number, radiusMeters: number): Promise<RestaurantRecord[]>;
  createRestaurant(input: NewRestaurantInput): Promise<string>;
  incrementRestaurantRecCount(id: string): Promise<void>;
  createRecommendation(input: NewRecommendationInput): Promise<string>;
  getRecommendation(id: string): Promise<RecommendationRecord | null>;
  getSave(id: string): Promise<boolean>;
  createSave(id: string, uid: string, recId: string): Promise<void>;
  deleteSave(id: string): Promise<void>;
  getVote(recId: string, voterUid: string): Promise<VoteRecord | null>;
  createVote(recId: string, voterUid: string, weight: number): Promise<void>;
  deleteVote(recId: string, voterUid: string): Promise<void>;
  applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void>;
}

// Real Firestore-backed implementation. Deliberately thin - every method is a
// direct 1:1 mapping to a Firestore call, no business logic lives here (that's
// in the handler files, which is what the tests exercise via the in-memory
// fake in testStore.ts instead of this class).
export class FirestoreStore implements Store {
  constructor(private db: Firestore) {}

  async getRestaurant(id: string): Promise<RestaurantRecord | null> {
    const doc = await this.db.collection("restaurants").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<RestaurantRecord, "id">) };
  }

  async findNearbyRestaurants(_lat: number, _lng: number, _radiusMeters: number): Promise<RestaurantRecord[]> {
    // Fetches everything and filters by distance in the caller (createRecommendation.ts).
    // Fine at beta scale (dozens of restaurants); revisit with a geohash-bucketed
    // query (geofire-common) once the restaurant count is in the hundreds+.
    const snap = await this.db.collection("restaurants").get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RestaurantRecord, "id">) }));
  }

  async createRestaurant(input: NewRestaurantInput): Promise<string> {
    const ref = this.db.collection("restaurants").doc();
    await ref.set({
      name: input.name,
      source: "community",
      location: input.location,
      area: input.area,
      city: input.city,
      createdBy: input.createdBy,
      aggregates: { recCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async incrementRestaurantRecCount(id: string): Promise<void> {
    await this.db.collection("restaurants").doc(id).update({
      "aggregates.recCount": FieldValue.increment(1),
    });
  }

  async createRecommendation(input: NewRecommendationInput): Promise<string> {
    const ref = this.db.collection("recommendations").doc();
    await ref.set({
      authorId: input.authorId,
      restaurantId: input.restaurantId,
      dishName: input.dishName,
      mealTags: input.mealTags,
      signalTags: input.signalTags,
      primarySignal: input.primarySignal,
      caption: input.caption,
      verificationLevel: input.verificationLevel,
      trustSnapshot: input.trustSnapshot,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getRecommendation(id: string): Promise<RecommendationRecord | null> {
    const doc = await this.db.collection("recommendations").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<RecommendationRecord, "id">) };
  }

  async getSave(id: string): Promise<boolean> {
    const doc = await this.db.collection("saves").doc(id).get();
    return doc.exists;
  }

  async createSave(id: string, uid: string, recId: string): Promise<void> {
    await this.db.collection("saves").doc(id).set({ uid, recId, createdAt: FieldValue.serverTimestamp() });
  }

  async deleteSave(id: string): Promise<void> {
    await this.db.collection("saves").doc(id).delete();
  }

  async getVote(recId: string, voterUid: string): Promise<VoteRecord | null> {
    const doc = await this.db.collection("recommendations").doc(recId).collection("votes").doc(voterUid).get();
    if (!doc.exists) return null;
    return doc.data() as VoteRecord;
  }

  async createVote(recId: string, voterUid: string, weight: number): Promise<void> {
    await this.db
      .collection("recommendations")
      .doc(recId)
      .collection("votes")
      .doc(voterUid)
      .set({ weight, createdAt: FieldValue.serverTimestamp() });
  }

  async deleteVote(recId: string, voterUid: string): Promise<void> {
    await this.db.collection("recommendations").doc(recId).collection("votes").doc(voterUid).delete();
  }

  async applyHelpfulDelta(recId: string, weightedHelpfulDelta: number, voteCountDelta: number): Promise<void> {
    await this.db.collection("recommendations").doc(recId).update({
      weightedHelpful: FieldValue.increment(weightedHelpfulDelta),
      helpfulVoteCount: FieldValue.increment(voteCountDelta),
    });
  }
}
```

Save as `functions/src/store.ts`.

- [ ] **Step 3: Write the in-memory test fake**

```typescript
import type {
  NewRecommendationInput,
  NewRestaurantInput,
  RecommendationRecord,
  RestaurantRecord,
  VoteRecord,
} from "./types.js";
import type { Store } from "./store.js";

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}_${nextId++}`;
}

export function createTestStore() {
  const restaurants = new Map<string, RestaurantRecord>();
  const recommendations = new Map<string, RecommendationRecord>();
  const saves = new Set<string>();
  const votes = new Map<string, VoteRecord>(); // key: `${recId}_${voterUid}`

  const store: Store = {
    async getRestaurant(id) {
      return restaurants.get(id) ?? null;
    },
    async findNearbyRestaurants() {
      return [...restaurants.values()];
    },
    async createRestaurant(input: NewRestaurantInput) {
      const id = genId("restaurant");
      restaurants.set(id, {
        id,
        name: input.name,
        source: "community",
        location: input.location,
        area: input.area,
        city: input.city,
        aggregates: { recCount: 0 },
      });
      return id;
    },
    async incrementRestaurantRecCount(id) {
      const r = restaurants.get(id);
      if (r) r.aggregates.recCount += 1;
    },
    async createRecommendation(input: NewRecommendationInput) {
      const id = genId("rec");
      recommendations.set(id, {
        id,
        authorId: input.authorId,
        restaurantId: input.restaurantId,
        dishName: input.dishName,
        mealTags: input.mealTags,
        signalTags: input.signalTags,
        primarySignal: input.primarySignal,
        caption: input.caption,
        verificationLevel: input.verificationLevel,
        trustSnapshot: input.trustSnapshot,
        weightedHelpful: 0,
        helpfulVoteCount: 0,
        createdAt: Date.now(),
      });
      return id;
    },
    async getRecommendation(id) {
      return recommendations.get(id) ?? null;
    },
    async getSave(id) {
      return saves.has(id);
    },
    async createSave(id) {
      saves.add(id);
    },
    async deleteSave(id) {
      saves.delete(id);
    },
    async getVote(recId, voterUid) {
      return votes.get(`${recId}_${voterUid}`) ?? null;
    },
    async createVote(recId, voterUid, weight) {
      votes.set(`${recId}_${voterUid}`, { weight });
    },
    async deleteVote(recId, voterUid) {
      votes.delete(`${recId}_${voterUid}`);
    },
    async applyHelpfulDelta(recId, weightedHelpfulDelta, voteCountDelta) {
      const rec = recommendations.get(recId);
      if (!rec) return;
      rec.weightedHelpful += weightedHelpfulDelta;
      rec.helpfulVoteCount += voteCountDelta;
    },
  };

  return { store, restaurants, recommendations };
}
```

Save as `functions/src/testStore.ts`. Exposing the underlying `restaurants`/`recommendations` maps alongside `store` lets tests seed fixture data directly (e.g. `restaurants.set("r1", {...})`) without going through the store's own write methods.

- [ ] **Step 4: Verify the project still builds**

Run: `cd functions && npx tsc --noEmit`
Expected: no output, exit code 0 (no type errors).

- [ ] **Step 5: Commit**

```bash
git add functions/src/types.ts functions/src/store.ts functions/src/testStore.ts
git commit -m "Add Store interface, Firestore-backed implementation, and in-memory test fake"
```

**Correction (found in Task 3's review, fixed immediately after):** the code above has two latent defects that only a careful review catches, since the test suite only ever exercises `createTestStore()`'s fake, never `FirestoreStore` directly.

1. `RecommendationRecord.createdAt` is typed `number`, but `FirestoreStore.createRecommendation` writes `FieldValue.serverTimestamp()` and `getRecommendation` read it back through an unchecked cast — at runtime that's a Firestore `Timestamp` object, not a `number`. Fixed by having `getRecommendation` (and `getRestaurant`, same issue) explicitly convert via `(data.createdAt as Timestamp).toMillis()` before returning, so the real implementation actually satisfies the type it claims to, not just the fake.
2. `FirestoreStore.createRecommendation` writes a `status: "active"` field, and `createRestaurant` writes `createdBy`/`createdAt`, none of which existed on `RecommendationRecord`/`RestaurantRecord`. Added `status: string` to `RecommendationRecord` and `createdBy: string` + `createdAt: number` to `RestaurantRecord`, with both `FirestoreStore` and the in-memory fake populating them identically.

If executing this plan fresh, write the corrected version directly rather than the version above, then applying this note as a second pass.

---

## Task 4: `createRecommendation` handler

**Files:**
- Create: `functions/src/recommendations/createRecommendation.ts`
- Create: `functions/src/recommendations/createRecommendation.test.ts`

**Interfaces:**
- Consumes: `Store` (Task 3), `haversineMeters` (Task 1)
- Produces: `createRecommendationHandler(input: CreateRecommendationInput, store: Store): Promise<{ recommendationId: string; restaurantId: string; verificationLevel: 1 | 2 }>` — Task 7's `index.ts` wraps this in the actual `onCall`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { createRecommendationHandler } from "./createRecommendation.js";

describe("createRecommendationHandler", () => {
  it("creates a recommendation against an existing restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: ["worth_traveling_for"],
        primarySignal: "must_try",
        caption: "Order the mutton, not chicken.",
      },
      store,
    );

    expect(result.restaurantId).toBe("r1");
    expect(result.verificationLevel).toBe(1);
    const rec = await store.getRecommendation(result.recommendationId);
    expect(rec?.dishName).toBe("Mutton Biryani");
    expect(rec?.trustSnapshot).toBe(10);
    expect(restaurants.get("r1")?.aggregates.recCount).toBe(1);
  });

  it("computes verification level 2 when GPS is within 100m of the restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "Great biryani here.",
        userLocation: { lat: 17.3999, lng: 78.4118 },
      },
      store,
    );

    expect(result.verificationLevel).toBe(2);
  });

  it("falls back to verification level 1 when GPS is far from the restaurant", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "Great biryani here.",
        userLocation: { lat: 17.4326, lng: 78.4071 }, // Jubilee Hills, ~5km away
      },
      store,
    );

    expect(result.verificationLevel).toBe(1);
  });

  it("creates a new community place when no restaurantId is given", async () => {
    const { store, restaurants } = createTestStore();

    const result = await createRecommendationHandler(
      {
        authorId: "u1",
        communityPlace: {
          name: "Nimrah Cafe",
          location: { lat: 17.3616, lng: 78.4747 },
          area: "Charminar",
          city: "Hyderabad",
        },
        dishName: "Osmania Biscuit",
        mealTags: ["cafe"],
        signalTags: ["hidden_gem"],
        primarySignal: "recommend",
        caption: "Come after Charminar closes, sit outside.",
      },
      store,
    );

    expect(restaurants.size).toBe(1);
    expect(restaurants.get(result.restaurantId)?.name).toBe("Nimrah Cafe");
    expect(restaurants.get(result.restaurantId)?.source).toBe("community");
  });

  it("dedupes to an existing nearby community place instead of creating a duplicate", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Nimrah Cafe",
      source: "community",
      location: { lat: 17.3616, lng: 78.4747 },
      area: "Charminar",
      city: "Hyderabad",
      aggregates: { recCount: 3 },
    });

    const result = await createRecommendationHandler(
      {
        authorId: "u2",
        communityPlace: {
          name: "Nimrah Cafe", // same name, ~30m away - should dedupe, not duplicate
          location: { lat: 17.3617, lng: 78.4747 },
          area: "Charminar",
          city: "Hyderabad",
        },
        dishName: "Irani Chai",
        mealTags: ["cafe"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "The chai alone is worth it.",
      },
      store,
    );

    expect(result.restaurantId).toBe("r1");
    expect(restaurants.size).toBe(1);
  });

  it("rejects a caption shorter than 10 characters", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
    });

    await expect(
      createRecommendationHandler(
        {
          authorId: "u1",
          restaurantId: "r1",
          dishName: "Biryani",
          mealTags: ["dinner"],
          signalTags: [],
          primarySignal: "recommend",
          caption: "good",
          userLocation: undefined,
        },
        store,
      ),
    ).rejects.toThrow(/caption/i);
  });

  it("rejects when neither restaurantId nor communityPlace is given", async () => {
    const { store } = createTestStore();

    await expect(
      createRecommendationHandler(
        {
          authorId: "u1",
          dishName: "Biryani",
          mealTags: ["dinner"],
          signalTags: [],
          primarySignal: "recommend",
          caption: "Great biryani here, really.",
        },
        store,
      ),
    ).rejects.toThrow(/restaurant/i);
  });
});
```

Save as `functions/src/recommendations/createRecommendation.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npx vitest run src/recommendations/createRecommendation.test.ts`
Expected: FAIL — `Cannot find module './createRecommendation.js'`.

- [ ] **Step 3: Implement the handler**

```typescript
import type { Store } from "../store.js";
import { haversineMeters } from "../geo.js";

// Trust engine (master doc §9) isn't built yet. Every user's effective trust
// defaults to the documented base score until it is - see Global Constraints.
const MVP_DEFAULT_TRUST = 10;

const GPS_VERIFICATION_RADIUS_METERS = 100;
const COMMUNITY_PLACE_DEDUPE_RADIUS_METERS = 150;

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
}

export interface CreateRecommendationResult {
  recommendationId: string;
  restaurantId: string;
  verificationLevel: 1 | 2;
}

export async function createRecommendationHandler(
  input: CreateRecommendationInput,
  store: Store,
): Promise<CreateRecommendationResult> {
  const caption = input.caption.trim();
  if (caption.length < 10 || caption.length > 500) {
    throw new Error("caption must be between 10 and 500 characters");
  }

  let restaurantId: string;
  let restaurantLocation: { lat: number; lng: number } | null = null;

  if (input.restaurantId) {
    const restaurant = await store.getRestaurant(input.restaurantId);
    if (!restaurant) throw new Error("restaurant not found");
    restaurantId = restaurant.id;
    restaurantLocation = restaurant.location;
  } else if (input.communityPlace) {
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

  const recommendationId = await store.createRecommendation({
    authorId: input.authorId,
    restaurantId,
    dishName: input.dishName,
    mealTags: input.mealTags,
    signalTags: input.signalTags,
    primarySignal: input.primarySignal,
    caption,
    verificationLevel,
    trustSnapshot: MVP_DEFAULT_TRUST,
  });

  await store.incrementRestaurantRecCount(restaurantId);

  return { recommendationId, restaurantId, verificationLevel };
}
```

**Correction (found in Task 4's review, fixed immediately after):** the code above never validates `communityPlace.location`'s shape. A missing/non-numeric `lat`/`lng` makes `haversineMeters` silently return `NaN`, every dedupe comparison (`NaN <= 150`) evaluates `false`, and the handler proceeds to persist a corrupt restaurant document instead of rejecting the request. Fixed by adding a guard right after the caption check, before the dedupe search: reject if `location` is missing or `lat`/`lng` aren't `Number.isFinite` (not a bare `typeof === "number"` check — that passes `NaN`).

Save as `functions/src/recommendations/createRecommendation.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd functions && npx vitest run src/recommendations/createRecommendation.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add functions/src/recommendations/createRecommendation.ts functions/src/recommendations/createRecommendation.test.ts
git commit -m "Add createRecommendation handler with community-place dedupe and GPS verification"
```

---

## Task 5: `toggleSave` handler

**Files:**
- Create: `functions/src/saves/toggleSave.ts`
- Create: `functions/src/saves/toggleSave.test.ts`

**Interfaces:**
- Consumes: `Store` (Task 3)
- Produces: `toggleSaveHandler(recId: string, uid: string, store: Store): Promise<{ saved: boolean }>`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { toggleSaveHandler } from "./toggleSave.js";

describe("toggleSaveHandler", () => {
  it("saves a recommendation that wasn't saved before", async () => {
    const { store } = createTestStore();

    const result = await toggleSaveHandler("rec1", "u1", store);

    expect(result.saved).toBe(true);
    expect(await store.getSave("u1_rec1")).toBe(true);
  });

  it("unsaves a recommendation that was already saved (toggle)", async () => {
    const { store } = createTestStore();
    await toggleSaveHandler("rec1", "u1", store);

    const result = await toggleSaveHandler("rec1", "u1", store);

    expect(result.saved).toBe(false);
    expect(await store.getSave("u1_rec1")).toBe(false);
  });

  it("keeps saves independent per user", async () => {
    const { store } = createTestStore();
    await toggleSaveHandler("rec1", "u1", store);

    await toggleSaveHandler("rec1", "u2", store);

    expect(await store.getSave("u1_rec1")).toBe(true);
    expect(await store.getSave("u2_rec1")).toBe(true);
  });
});
```

Save as `functions/src/saves/toggleSave.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npx vitest run src/saves/toggleSave.test.ts`
Expected: FAIL — `Cannot find module './toggleSave.js'`.

- [ ] **Step 3: Implement the handler**

```typescript
import type { Store } from "../store.js";

export async function toggleSaveHandler(
  recId: string,
  uid: string,
  store: Store,
): Promise<{ saved: boolean }> {
  const saveId = `${uid}_${recId}`;
  const alreadySaved = await store.getSave(saveId);

  if (alreadySaved) {
    await store.deleteSave(saveId);
    return { saved: false };
  }

  await store.createSave(saveId, uid, recId);
  return { saved: true };
}
```

Save as `functions/src/saves/toggleSave.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd functions && npx vitest run src/saves/toggleSave.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add functions/src/saves/toggleSave.ts functions/src/saves/toggleSave.test.ts
git commit -m "Add toggleSave handler"
```

---

## Task 6: `toggleHelpfulVote` handler

**Files:**
- Create: `functions/src/recommendations/toggleHelpfulVote.ts`
- Create: `functions/src/recommendations/toggleHelpfulVote.test.ts`

**Interfaces:**
- Consumes: `Store` (Task 3)
- Produces: `toggleHelpfulVoteHandler(recId: string, voterUid: string, store: Store): Promise<{ voted: boolean; weightedHelpful: number; helpfulVoteCount: number }>`

**Note on `MVP_DEFAULT_TRUST`:** duplicated here from Task 4 (same value, same meaning: every voter's weight is their trust/100, and trust defaults to 10 until the real trust engine exists) rather than factored into a shared constants file. Both copies get deleted together the day the trust engine ships and starts supplying real per-user trust scores — a shared file would outlive its usefulness the same day either copy would.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { toggleHelpfulVoteHandler } from "./toggleHelpfulVote.js";

describe("toggleHelpfulVoteHandler", () => {
  it("casts a helpful vote and updates the recommendation's aggregate counts", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      createdAt: Date.now(),
    });

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store);

    expect(result.voted).toBe(true);
    expect(result.helpfulVoteCount).toBe(1);
    expect(result.weightedHelpful).toBeCloseTo(0.1, 5); // MVP_DEFAULT_TRUST(10) / 100
  });

  it("un-votes when called again by the same voter (toggle)", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      createdAt: Date.now(),
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store);

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store);

    expect(result.voted).toBe(false);
    expect(result.helpfulVoteCount).toBe(0);
    expect(result.weightedHelpful).toBeCloseTo(0, 5);
  });

  it("counts votes from different voters independently", async () => {
    const { store, recommendations } = createTestStore();
    recommendations.set("rec1", {
      id: "rec1",
      authorId: "author1",
      restaurantId: "r1",
      dishName: "Biryani",
      mealTags: [],
      signalTags: [],
      primarySignal: "recommend",
      caption: "Great",
      verificationLevel: 1,
      trustSnapshot: 10,
      weightedHelpful: 0,
      helpfulVoteCount: 0,
      createdAt: Date.now(),
    });
    await toggleHelpfulVoteHandler("rec1", "voter1", store);

    const result = await toggleHelpfulVoteHandler("rec1", "voter2", store);

    expect(result.helpfulVoteCount).toBe(2);
    expect(result.weightedHelpful).toBeCloseTo(0.2, 5);
  });

  it("throws when the recommendation doesn't exist", async () => {
    const { store } = createTestStore();

    await expect(toggleHelpfulVoteHandler("nonexistent", "voter1", store)).rejects.toThrow(/not found/i);
  });
});
```

Save as `functions/src/recommendations/toggleHelpfulVote.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npx vitest run src/recommendations/toggleHelpfulVote.test.ts`
Expected: FAIL — `Cannot find module './toggleHelpfulVote.js'`.

- [ ] **Step 3: Implement the handler**

```typescript
import type { Store } from "../store.js";

// Trust engine (master doc §9) isn't built yet - see the matching constant
// and comment in createRecommendation.ts. Both go away together later.
const MVP_DEFAULT_TRUST = 10;

export async function toggleHelpfulVoteHandler(
  recId: string,
  voterUid: string,
  store: Store,
): Promise<{ voted: boolean; weightedHelpful: number; helpfulVoteCount: number }> {
  const rec = await store.getRecommendation(recId);
  if (!rec) throw new Error("recommendation not found");

  const existingVote = await store.getVote(recId, voterUid);

  if (existingVote) {
    await store.deleteVote(recId, voterUid);
    await store.applyHelpfulDelta(recId, -existingVote.weight, -1);
    const updated = await store.getRecommendation(recId);
    return { voted: false, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
  }

  const weight = MVP_DEFAULT_TRUST / 100;
  await store.createVote(recId, voterUid, weight);
  await store.applyHelpfulDelta(recId, weight, 1);
  const updated = await store.getRecommendation(recId);
  return { voted: true, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
}
```

Save as `functions/src/recommendations/toggleHelpfulVote.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd functions && npx vitest run src/recommendations/toggleHelpfulVote.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Run the full functions test suite**

Run: `cd functions && npx vitest run`
Expected: PASS — all 17 tests across geo, createRecommendation, toggleSave, and toggleHelpfulVote pass.

- [ ] **Step 6: Commit**

```bash
git add functions/src/recommendations/toggleHelpfulVote.ts functions/src/recommendations/toggleHelpfulVote.test.ts
git commit -m "Add toggleHelpfulVote handler"
```

---

## Task 7: Wire the real `onCall` functions and deploy

**Files:**
- Create: `functions/src/admin.ts`
- Create: `functions/src/index.ts`

**Interfaces:**
- Consumes: `Store`/`FirestoreStore` (Task 3), all three handlers (Tasks 4-6)
- Produces: three deployed callable functions — `createRecommendation`, `toggleSave`, `toggleHelpfulVote` — that Task 8's client code calls by name via the Firebase SDK.

**⚠️ Billing note, confirm with the owner before Step 4:** Cloud Functions require the Firebase project to be on the **Blaze** (pay-as-you-go) plan — the free Spark plan can't run them at all. If `peoplestaste8` is still on Spark, deploying will fail with a clear billing-required error. Don't silently upgrade billing on someone else's project; surface this and get an explicit go-ahead first.

- [ ] **Step 1: Initialize the Admin SDK**

```typescript
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
export const db = getFirestore(app);
```

Save as `functions/src/admin.ts`.

- [ ] **Step 2: Wire the three callable functions**

```typescript
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./admin.js";
import { FirestoreStore } from "./store.js";
import { createRecommendationHandler, type CreateRecommendationInput } from "./recommendations/createRecommendation.js";
import { toggleHelpfulVoteHandler } from "./recommendations/toggleHelpfulVote.js";
import { toggleSaveHandler } from "./saves/toggleSave.js";

const store = new FirestoreStore(db);

export const createRecommendation = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const input = request.data as Omit<CreateRecommendationInput, "authorId">;
  try {
    return await createRecommendationHandler({ ...input, authorId: request.auth.uid }, store);
  } catch (err) {
    throw new HttpsError("invalid-argument", err instanceof Error ? err.message : "Invalid request");
  }
});

export const toggleSave = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { recId } = request.data as { recId: string };
  if (!recId) throw new HttpsError("invalid-argument", "recId is required");
  return toggleSaveHandler(recId, request.auth.uid, store);
});

export const toggleHelpfulVote = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { recId } = request.data as { recId: string };
  if (!recId) throw new HttpsError("invalid-argument", "recId is required");
  try {
    return await toggleHelpfulVoteHandler(recId, request.auth.uid, store);
  } catch (err) {
    throw new HttpsError("not-found", err instanceof Error ? err.message : "Not found");
  }
});
```

Save as `functions/src/index.ts`. Region is `asia-south1` to match the Firestore database location already chosen (§16, closest to the Hyderabad launch target) — cross-region calls between Functions and Firestore add latency for no benefit here.

- [ ] **Step 3: Build and typecheck**

Run: `cd functions && npm run build`
Expected: no errors, produces `functions/lib/`.

- [ ] **Step 4: Confirm Blaze billing, then deploy**

Ask the owner to confirm the `peoplestaste8` project is on the Blaze plan (Firebase Console → Usage and billing) before running this. Once confirmed:

Run: `firebase deploy --only functions --project peoplestaste8`
Expected: `✔ functions[createRecommendation(asia-south1)]`, `✔ functions[toggleSave(asia-south1)]`, `✔ functions[toggleHelpfulVote(asia-south1)]` — all three deploy successfully.

- [ ] **Step 5: Deploy the updated Firestore rules from Task 2**

Run: `firebase deploy --only firestore:rules --project peoplestaste8`
Expected: `✔ firestore: released rules firestore.rules to cloud.firestore`

- [ ] **Step 6: Commit**

```bash
git add functions/src/admin.ts functions/src/index.ts
git commit -m "Wire createRecommendation/toggleSave/toggleHelpfulVote as deployed callable functions"
```

---

## Task 8: Wire the Post flow to the real function

**Files:**
- Modify: `src/lib/firebase.ts`
- Modify: `src/pages/Post.tsx`

**Interfaces:**
- Consumes: the deployed `createRecommendation` callable (Task 7)

**Known gap this task accepts rather than hides:** `MOCK_RESTAURANTS` (the "pick an existing place" list in Post's Step 1) are client-only fixtures — they were never written to Firestore, so calling `createRecommendation` with one of their IDs will always come back `restaurant not found`. Only the "Add this place manually" (Community Place) path creates something real right now, because that path creates the restaurant on the fly. This task makes that failure a clear, friendly message instead of a raw Firebase error — it does not fake success. Once Google Places integration exists (needs an API key that isn't configured — separate, later work), the "pick existing" path becomes real too and this caveat goes away.

- [ ] **Step 1: Add the Functions SDK export**

Read `src/lib/firebase.ts` first — it currently exports `app`, `auth`, `db`, `googleProvider`. Add:

```typescript
import { getFunctions } from "firebase/functions";
```

to the top imports, and add this line after the existing `export const db = getFirestore(app);`:

```typescript
export const functions = getFunctions(app, "asia-south1");
```

(Region must match where the functions are deployed, Task 7 Step 2.)

- [ ] **Step 2: Wire the real submit in Post.tsx**

In `src/pages/Post.tsx`, add these imports alongside the existing ones:

```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
```

Add new state near the existing `submitted` state:

```typescript
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
const [result, setResult] = useState<{ verificationLevel: number } | null>(null);
```

Add this function inside the `Post` component, above the `return`:

```typescript
const { user } = useAuth();

async function handleSubmit() {
  setSubmitting(true);
  setSubmitError(null);

  let userLocation: { lat: number; lng: number } | undefined;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
    );
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    // No GPS - post still goes through at verification level 1 (§10: L1 is always allowed).
  }

  try {
    const createRecommendation = httpsCallable(functions, "createRecommendation");
    const payload = wantsCommunityPlace
      ? {
          communityPlace: {
            name: communityName.trim(),
            location: userLocation ?? { lat: 0, lng: 0 },
            area: "Unknown",
            city: "Hyderabad",
          },
          dishName: dishName.trim() || null,
          mealTags: [...mealTags],
          signalTags: [...signalTags],
          primarySignal,
          caption: caption.trim(),
          userLocation,
        }
      : {
          restaurantId: restaurant?.id,
          dishName: dishName.trim() || null,
          mealTags: [...mealTags],
          signalTags: [...signalTags],
          primarySignal,
          caption: caption.trim(),
          userLocation,
        };

    const response = await createRecommendation(payload);
    setResult(response.data as { verificationLevel: number });
    setSubmitted(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    setSubmitError(
      message.includes("restaurant not found")
        ? "This demo restaurant isn't in the real database yet — try \"Add this place manually\" instead."
        : message,
    );
  } finally {
    setSubmitting(false);
  }
}
```

Note `userLocation ?? { lat: 0, lng: 0 }` for the community-place fallback: real GPS is strongly preferred (it's how the place gets correctly located on the map), but per §5.1 a community place shouldn't be blocked from being created just because location permission was denied — `{ lat: 0, lng: 0 }` is an obviously-wrong sentinel an Editor can spot and fix during moderation, not a silent wrong answer presented as real.

- [ ] **Step 3: Replace the placeholder success screen**

Find the current `if (submitted) { ... }` block (the one with the "Saved locally" message explaining Cloud Functions weren't wired). Replace its body text:

```typescript
if (submitted) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pt-trust-soft text-pt-trust">
        <Check className="h-7 w-7" aria-hidden="true" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-pt-ink">Posted</h2>
      <p className="mt-2 max-w-sm text-sm text-pt-ink-soft">
        {result?.verificationLevel === 2
          ? "Verified by location — this'll carry more weight in rankings."
          : "Live on People's Taste. Add a photo next time for stronger verification."}
      </p>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-6 min-h-[44px] cursor-pointer rounded-full bg-pt-primary px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-pt-primary-deep"
      >
        Back to Feed
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wire the final step's submit button**

Find the final-step button (the one currently reading `onClick={() => setSubmitted(true)}` with label "Post recommendation"). Replace it:

```typescript
<button
  type="button"
  disabled={!canProceed[step] || submitting}
  onClick={handleSubmit}
  className="min-h-[44px] flex-1 cursor-pointer rounded-full bg-pt-primary px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep disabled:cursor-not-allowed disabled:bg-pt-surface-3 disabled:text-pt-ink-soft"
>
  {submitting ? "Posting…" : "Post recommendation"}
</button>
```

And directly above the fixed bottom bar's closing `</div>`, add error display:

```typescript
{submitError && (
  <p className="mx-auto max-w-2xl px-4 pb-2 text-sm text-pt-danger">{submitError}</p>
)}
```

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc -b`
Expected: no output, exit code 0.

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, sign in, go to Post, choose "Add this place manually," fill in a name/dish/meal/signal/caption, submit. Expected: success screen shows "Posted," and the new restaurant + recommendation are visible in the Firebase Console under `restaurants` and `recommendations` in Firestore.

- [ ] **Step 7: Commit**

```bash
git add src/lib/firebase.ts src/pages/Post.tsx
git commit -m "Wire Post flow to the real createRecommendation function"
```

---

## Self-Review

**Spec coverage:** every piece of the write-path prerequisite this plan set out to build is covered — Cloud Functions project (Task 1), security rules scoped per collection (Task 2), the `Store` abstraction enabling emulator-free testing (Task 3), `createRecommendation` with Community Place dedupe and GPS verification per §5.1/§10 (Task 4), `toggleSave` (Task 5), `toggleHelpfulVote` with correct weighted-vote math per §11.1's "never count raw likes" principle (Task 6), deployment (Task 7), and real client wiring for Post (Task 8). Save/Helpful button wiring is explicitly out of scope here (see File Structure note) and is the personalization plan's job.

**Placeholder scan:** no TBD/TODO markers. The one open item (manual rules verification in Task 2 Step 3, since no JRE is available for the emulator) is a named, explained limitation with a concrete recommendation (install a JRE before beta signups open), not a vague placeholder.

**Type consistency:** `Store` interface (Task 3) methods match exactly between `FirestoreStore`, `createTestStore()`'s fake, and every handler's usage — `getSave` returns `boolean` (not the doc itself) everywhere, `applyHelpfulDelta` takes the same three-argument signature everywhere it's called. `CreateRecommendationInput`/`CreateRecommendationResult` types are defined once (Task 4) and referenced, not redefined, in Task 7's `index.ts`.

**Scope check:** contained to one subsystem (the write path). Confirmed with the owner that personalization is a separate plan, executed after this one ships.
