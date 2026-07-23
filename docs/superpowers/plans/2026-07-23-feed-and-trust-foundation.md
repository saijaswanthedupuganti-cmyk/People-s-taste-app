# Feed & Trust Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data with real Firestore reads across every page, wire the Save/Helpful buttons to the already-deployed Cloud Functions, and build a v1 trust engine so `trustSnapshot`/vote weight stop being hardcoded to 10.

**Architecture:** A `users/{uid}` Firestore document is created the first time someone signs in (via a new `ensureUserProfile` callable). A pure `computeTrust()` function (functions/src/trust.ts) turns a user's stats into a 0–100 score and a tier, per master doc §9.1 (the factors we can support today: `accountAgeFactor`, `verificationFactor`, `helpfulReceivedFactor` — `consistencyFactor`/`communityFactor`/penalties stay at 0, explicitly deferred, since they need posting-cadence history and the Following system that don't exist yet). `createRecommendation` and `toggleHelpfulVote` are updated to read/write real trust instead of the `MVP_DEFAULT_TRUST = 10` constant. On the client, a new `src/lib/queries.ts` reads `recommendations`/`restaurants`/`users` directly via the Firestore client SDK (no Cloud Function needed for reads) and joins them into the existing `Recommendation`/`Restaurant` UI shapes, so every page that currently imports `MOCK_FEED`/`MOCK_RESTAURANTS` switches to a real fetch with the exact same rendering code. Two new hooks (`useSave`, `useHelpfulVote`) wire the Bookmark/Helpful buttons to the deployed `toggleSave`/`toggleHelpfulVote` functions with optimistic UI and login-redirect for anonymous users.

**Tech Stack:** React 19 + Vite (client), Firebase Cloud Functions v2 (`onCall`, region `asia-south1`) + Firestore, Vitest (functions only).

## Global Constraints

- All Cloud Functions use `{ region: "asia-south1" }` — match `functions/src/index.ts`'s existing exports.
- `functions/` is a separate TypeScript project from `src/` — types are duplicated on purpose (`functions/src/types.ts` = Firestore document shapes, `src/types/index.ts` = UI shapes). Never import across that boundary.
- `functions/src/store.ts` (`Store` interface + `FirestoreStore`) stays a thin 1:1 Firestore mapping — no business logic there. Business logic lives in handler files under `functions/src/<domain>/`, unit-tested against the in-memory fake in `functions/src/testStore.ts`.
- Client reads go straight through the Firestore client SDK (`firebase/firestore`) — no Cloud Function round-trip for reads, only for the mutations that already exist (`createRecommendation`, `toggleSave`, `toggleHelpfulVote`) plus the new `ensureUserProfile`.
- `functions/` has Vitest configured (`cd functions && npm test`) — every handler change in this plan gets a real test, run before and after writing the implementation.
- `src/` has **no test runner** configured (`package.json` has no jest/vitest there) — client-side steps are verified by running `npm run dev` and checking the behavior in the browser, not by automated tests. Say so explicitly in each such step; don't invent a test that can't run.
- Firestore rules default-deny (`match /{document=**} { allow read: if false; allow write: if false; }` is the catch-all in `firestore.rules`) — any new collection needs its own explicit rule block or every read/write to it fails.
- Never call `Date.now()`/`new Date()` inside a function meant to be unit-tested with fixed inputs — pass timestamps as parameters (see `trust.ts` below).
- Firestore composite indexes must be added to `firestore.indexes.json` (currently empty) for any query combining an equality filter with an `orderBy` on a different field, or the query throws at runtime with a console link to auto-create it — add them proactively instead of waiting for that error.

---

## Phase 1: User Profile Foundation

### Task 1: `ensureUserProfile` — create `users/{uid}` on first login

**Files:**
- Modify: `functions/src/types.ts` — add `Tier`, `UserRecord`, `NewUserInput`
- Modify: `functions/src/store.ts` — add `getUser`/`createUser` to `Store` + `FirestoreStore`
- Modify: `functions/src/testStore.ts` — add matching in-memory implementation
- Create: `functions/src/users/ensureUserProfile.ts`
- Create: `functions/src/users/ensureUserProfile.test.ts`
- Modify: `functions/src/index.ts` — export the `ensureUserProfile` onCall

**Interfaces:**
- Produces: `UserRecord { id, username, displayName, photoURL, tier, trustScore, recCount, verifiedRecCount, weightedHelpfulReceived, createdAt }`, `Store.getUser(id): Promise<UserRecord | null>`, `Store.createUser(input: NewUserInput): Promise<void>`, `ensureUserProfileHandler(input, store): Promise<UserRecord>`
- Consumes: nothing from earlier tasks (this is the first task)

- [ ] **Step 1: Add the new types**

Add to `functions/src/types.ts`:

```ts
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
  createdAt: number;
}

export interface NewUserInput {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
}
```

- [ ] **Step 2: Add `getUser`/`createUser` to the `Store` interface and `FirestoreStore`**

In `functions/src/store.ts`, add to the `Store` interface (near the other methods) and import `UserRecord`, `NewUserInput` in the top-of-file import from `./types.js`:

```ts
  getUser(id: string): Promise<UserRecord | null>;
  createUser(input: NewUserInput): Promise<void>;
```

Add to the `FirestoreStore` class:

```ts
  async getUser(id: string): Promise<UserRecord | null> {
    const doc = await this.db.collection("users").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...(data as Omit<UserRecord, "id" | "createdAt">),
      createdAt: (data.createdAt as Timestamp).toMillis(),
    };
  }

  async createUser(input: NewUserInput): Promise<void> {
    await this.db.collection("users").doc(input.id).set({
      username: input.username,
      displayName: input.displayName,
      photoURL: input.photoURL,
      tier: "explorer",
      trustScore: 10,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
```

- [ ] **Step 3: Add the matching in-memory implementation**

In `functions/src/testStore.ts`, add `import type { NewUserInput, UserRecord } from "./types.js";` to the type import, add a `users` map alongside the existing maps, and add to the returned `store` object:

```ts
  const users = new Map<string, UserRecord>();
```

```ts
    async getUser(id) {
      return users.get(id) ?? null;
    },
    async createUser(input: NewUserInput) {
      users.set(input.id, {
        id: input.id,
        username: input.username,
        displayName: input.displayName,
        photoURL: input.photoURL,
        tier: "explorer",
        trustScore: 10,
        recCount: 0,
        verifiedRecCount: 0,
        weightedHelpfulReceived: 0,
        createdAt: Date.now(),
      });
    },
```

Also change the function's return statement from `return { store, restaurants, recommendations };` to `return { store, restaurants, recommendations, users };` so tests can inspect user state directly.

- [ ] **Step 4: Write the failing test for `ensureUserProfileHandler`**

Create `functions/src/users/ensureUserProfile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createTestStore } from "../testStore.js";
import { ensureUserProfileHandler } from "./ensureUserProfile.js";

describe("ensureUserProfileHandler", () => {
  it("creates a new user profile with a username derived from email", async () => {
    const { store, users } = createTestStore();

    const result = await ensureUserProfileHandler(
      { uid: "u1", displayName: "Priyanka R.", photoURL: "https://example.com/p.jpg", email: "priyanka.eats@gmail.com" },
      store,
    );

    expect(result.username).toBe("priyanka.eats");
    expect(result.displayName).toBe("Priyanka R.");
    expect(result.tier).toBe("explorer");
    expect(result.trustScore).toBe(10);
    expect(users.size).toBe(1);
  });

  it("is idempotent - returns the existing profile instead of overwriting it", async () => {
    const { store } = createTestStore();
    const first = await ensureUserProfileHandler(
      { uid: "u1", displayName: "Priyanka R.", photoURL: "", email: "priyanka.eats@gmail.com" },
      store,
    );

    const second = await ensureUserProfileHandler(
      { uid: "u1", displayName: "A different name", photoURL: "", email: "priyanka.eats@gmail.com" },
      store,
    );

    expect(second.displayName).toBe(first.displayName);
    expect(second.displayName).toBe("Priyanka R.");
  });

  it("sanitizes an email local-part with characters that aren't valid in a username", async () => {
    const { store } = createTestStore();

    const result = await ensureUserProfileHandler(
      { uid: "u2", displayName: "Arjun+Test", photoURL: "", email: "arjun+test.99@gmail.com" },
      store,
    );

    expect(result.username).toBe("arjuntest.99");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd functions && npm test -- ensureUserProfile`
Expected: FAIL — `Cannot find module './ensureUserProfile.js'`

- [ ] **Step 6: Implement `ensureUserProfileHandler`**

Create `functions/src/users/ensureUserProfile.ts`:

```ts
import type { Store } from "../store.js";
import type { UserRecord } from "../types.js";

export interface EnsureUserProfileInput {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

function usernameFromEmail(email: string, fallbackUid: string): string {
  const localPart = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_.]/g, "") ?? "";
  return localPart.length > 0 ? localPart : fallbackUid.slice(0, 8);
}

export async function ensureUserProfileHandler(input: EnsureUserProfileInput, store: Store): Promise<UserRecord> {
  const existing = await store.getUser(input.uid);
  if (existing) return existing;

  const username = usernameFromEmail(input.email, input.uid);
  await store.createUser({
    id: input.uid,
    username,
    displayName: input.displayName || username,
    photoURL: input.photoURL,
  });

  const created = await store.getUser(input.uid);
  return created!;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd functions && npm test -- ensureUserProfile`
Expected: PASS (3 tests)

- [ ] **Step 8: Wire the onCall export**

In `functions/src/index.ts`, add the import and export (following the existing pattern of the three other exports):

```ts
import { ensureUserProfileHandler } from "./users/ensureUserProfile.js";
```

```ts
export const ensureUserProfile = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { displayName, photoURL, email } = request.data as { displayName: string; photoURL: string; email: string };
  return ensureUserProfileHandler({ uid: request.auth.uid, displayName, photoURL, email }, store);
});
```

- [ ] **Step 9: Run the full functions test suite**

Run: `cd functions && npm test`
Expected: PASS (all existing tests plus the 3 new ones, no regressions)

- [ ] **Step 10: Commit**

```bash
git add functions/src/types.ts functions/src/store.ts functions/src/testStore.ts functions/src/users/ensureUserProfile.ts functions/src/users/ensureUserProfile.test.ts functions/src/index.ts
git commit -m "Add ensureUserProfile: create users/{uid} doc on first login"
```

---

### Task 2: Firestore rules + composite indexes for the new/expanded reads

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

**Interfaces:**
- Consumes: nothing code-level; this unblocks every client read added in Phase 3 and the `users` collection added in Task 1.

- [ ] **Step 1: Add a rule block for `users/{uid}`**

In `firestore.rules`, add a new match block alongside the existing `restaurants`/`dishes`/`recommendations`/`saves` blocks (before the catch-all `match /{document=**}`):

```
    match /users/{uid} {
      allow read: if true;
      allow write: if false;
    }
```

The doc has no sensitive fields (no email, no auth tokens) — public read matches the same pattern as `restaurants`/`recommendations`. Writes only ever happen through the Admin SDK inside Cloud Functions, which bypasses these rules entirely, so `allow write: if false` is correct here exactly like it is for `restaurants`.

- [ ] **Step 2: Add composite indexes for the feed/profile queries Phase 3 will run**

Replace the `"indexes": []` line in `firestore.indexes.json` with:

```json
  "indexes": [
    {
      "collectionGroup": "recommendations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "recommendations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "restaurantId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "recommendations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
```

(The `users` lookup by `username` in Phase 3 is a single equality filter with no `orderBy`, so it doesn't need a composite index — Firestore's automatic single-field index covers it.)

- [ ] **Step 3: Deploy rules and indexes**

Run: `firebase deploy --only firestore:rules,firestore:indexes`
Expected: both deploy successfully. Index builds can take a few minutes on a fresh project — if Phase 3's queries 404/error with "index not ready" right after this, that's expected transient state, not a bug.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "Add users collection rules and composite indexes for feed queries"
```

---

### Task 3: Call `ensureUserProfile` on login

**Files:**
- Modify: `src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: the `ensureUserProfile` callable from Task 1 (name string, matches `httpsCallable(functions, "...")` pattern already used in `src/pages/Post.tsx`)

- [ ] **Step 1: Call the function when a user signs in**

In `src/context/AuthContext.tsx`, add the import and call inside the existing `onAuthStateChanged` listener:

```ts
import { httpsCallable } from "firebase/functions";
import { auth, functions, googleProvider } from "../lib/firebase";
```

```ts
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        const ensureUserProfile = httpsCallable(functions, "ensureUserProfile");
        ensureUserProfile({
          displayName: nextUser.displayName ?? "",
          photoURL: nextUser.photoURL ?? "",
          email: nextUser.email ?? "",
        }).catch((err) => console.error("ensureUserProfile failed", err));
      }
    });
  }, []);
```

This is fire-and-forget by design — a transient failure here shouldn't block the user from seeing the app; worst case their `users/{uid}` doc is created lazily later (Task 6 falls back to trust=10 if it's still missing).

- [ ] **Step 2: Manually verify (no test runner in `src/`)**

Run: `npm run dev`, open the app, sign in with Google. In the Firebase Console → Firestore, confirm a `users/{uid}` document was created with `tier: "explorer"`, `trustScore: 10`, and a `username` derived from your email.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "Call ensureUserProfile on sign-in"
```

---

## Phase 2: Trust Engine v1

### Task 4: `computeTrust` — pure trust-score function

**Files:**
- Create: `functions/src/trust.ts`
- Create: `functions/src/trust.test.ts`

**Interfaces:**
- Produces: `computeTrust(inputs: TrustInputs): TrustResult` where `TrustInputs = { accountCreatedAt: number; now: number; recCount: number; verifiedRecCount: number; weightedHelpfulReceived: number }` and `TrustResult = { score: number; tier: Tier }`
- Consumes: `Tier` from `./types.js` (Task 1)

- [ ] **Step 1: Write the failing tests**

Create `functions/src/trust.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeTrust } from "./trust.js";

const DAY = 86_400_000;

describe("computeTrust", () => {
  it("gives a brand-new user the base score of 10 and the explorer tier", () => {
    const result = computeTrust({
      accountCreatedAt: 1000,
      now: 1000,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });

    expect(result.score).toBe(10);
    expect(result.tier).toBe("explorer");
  });

  it("adds up to +10 for account age, maxing out at 365 days", () => {
    const halfYear = computeTrust({
      accountCreatedAt: 0,
      now: 182.5 * DAY,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(halfYear.score).toBe(15); // 10 base + 5 (half of the +10 max)

    const overAYear = computeTrust({
      accountCreatedAt: 0,
      now: 400 * DAY,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(overAYear.score).toBe(20); // capped at +10, does not keep climbing
  });

  it("adds up to +25 for verification share", () => {
    const allVerified = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 4,
      verifiedRecCount: 4,
      weightedHelpfulReceived: 0,
    });
    expect(allVerified.score).toBe(35); // 10 base + 25 (100% verified)

    const halfVerified = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 4,
      verifiedRecCount: 2,
      weightedHelpfulReceived: 0,
    });
    expect(halfVerified.score).toBe(23); // 10 base + 12.5 rounded
  });

  it("does not divide by zero when recCount is 0", () => {
    const result = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
    });
    expect(result.score).toBe(10);
  });

  it("adds up to +30 for weighted helpful votes received, capped", () => {
    const someHelpful = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 20,
    });
    expect(someHelpful.score).toBe(20); // 10 base + min(30, 20*0.5=10) = 20

    const lotsOfHelpful = computeTrust({
      accountCreatedAt: 0,
      now: 0,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 1000,
    });
    expect(lotsOfHelpful.score).toBe(40); // capped at 10 base + 30
  });

  it("maps scores to tiers using the v1 thresholds", () => {
    expect(computeTrust({ accountCreatedAt: 0, now: 0, recCount: 0, verifiedRecCount: 0, weightedHelpfulReceived: 0 }).tier).toBe("explorer");
    expect(
      computeTrust({ accountCreatedAt: 0, now: 0, recCount: 10, verifiedRecCount: 10, weightedHelpfulReceived: 40 }).tier,
    ).toBe("legend"); // 10 + 10(age capped? no age=0) ... see step 6 note
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npm test -- trust`
Expected: FAIL — `Cannot find module './trust.js'`

- [ ] **Step 3: Implement `computeTrust`**

Create `functions/src/trust.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd functions && npm test -- trust`
Expected: PASS (6 tests). If the last assertion in the "maps scores to tiers" test doesn't match, fix the test's expected value to match the actual computed score (10 base + 0 age + 25 verification + 20 helpful = 55 → `neighborhood_expert`, not `legend` — correct the test to assert `"neighborhood_expert"` and adjust inputs/comment before moving on; don't change the implementation to fit a wrong test expectation).

- [ ] **Step 5: Commit**

```bash
git add functions/src/trust.ts functions/src/trust.test.ts
git commit -m "Add computeTrust: v1 trust score and tier formula"
```

---

### Task 5: Extend `UserRecord` stats + Store methods for trust inputs

**Files:**
- Modify: `functions/src/store.ts`
- Modify: `functions/src/testStore.ts`

**Interfaces:**
- Consumes: `UserRecord` (Task 1), `Tier` (Task 1)
- Produces: `Store.incrementUserRecCount(id, verified: boolean): Promise<void>`, `Store.applyHelpfulReceivedDelta(id, delta: number): Promise<void>`, `Store.updateUserTrust(id, trustScore: number, tier: Tier): Promise<void>`

(`UserRecord.recCount`/`verifiedRecCount`/`weightedHelpfulReceived` fields already exist from Task 1 — this task only adds the mutation methods.)

- [ ] **Step 1: Add the methods to the `Store` interface**

In `functions/src/store.ts`:

```ts
  incrementUserRecCount(id: string, verified: boolean): Promise<void>;
  applyHelpfulReceivedDelta(id: string, delta: number): Promise<void>;
  updateUserTrust(id: string, trustScore: number, tier: Tier): Promise<void>;
```

(Add `Tier` to the `./types.js` import at the top of the file.)

- [ ] **Step 2: Implement on `FirestoreStore`**

```ts
  async incrementUserRecCount(id: string, verified: boolean): Promise<void> {
    const update: Record<string, FieldValue> = { recCount: FieldValue.increment(1) };
    if (verified) update.verifiedRecCount = FieldValue.increment(1);
    await this.db.collection("users").doc(id).update(update);
  }

  async applyHelpfulReceivedDelta(id: string, delta: number): Promise<void> {
    await this.db.collection("users").doc(id).update({
      weightedHelpfulReceived: FieldValue.increment(delta),
    });
  }

  async updateUserTrust(id: string, trustScore: number, tier: Tier): Promise<void> {
    await this.db.collection("users").doc(id).update({ trustScore, tier });
  }
```

- [ ] **Step 3: Implement on the in-memory test store**

In `functions/src/testStore.ts`:

```ts
    async incrementUserRecCount(id, verified) {
      const u = users.get(id);
      if (!u) return;
      u.recCount += 1;
      if (verified) u.verifiedRecCount += 1;
    },
    async applyHelpfulReceivedDelta(id, delta) {
      const u = users.get(id);
      if (!u) return;
      u.weightedHelpfulReceived += delta;
    },
    async updateUserTrust(id, trustScore, tier) {
      const u = users.get(id);
      if (!u) return;
      u.trustScore = trustScore;
      u.tier = tier;
    },
```

- [ ] **Step 4: Run the full functions test suite to confirm no regressions**

Run: `cd functions && npm test`
Expected: PASS — these methods aren't called by anything yet, so this step only proves the `Store`/`FirestoreStore`/testStore contracts still line up (a TS build error here means a signature mismatch).

- [ ] **Step 5: Commit**

```bash
git add functions/src/store.ts functions/src/testStore.ts
git commit -m "Add user-stats mutation methods to Store"
```

---

### Task 6: Wire trust into `createRecommendation`

**Files:**
- Modify: `functions/src/recommendations/createRecommendation.ts`
- Modify: `functions/src/recommendations/createRecommendation.test.ts`

**Interfaces:**
- Consumes: `computeTrust` (Task 4), `Store.getUser`/`incrementUserRecCount`/`updateUserTrust` (Tasks 1 & 5)
- Produces: `createRecommendationHandler` now takes an additional `now: number` parameter (see Step 1) so trust computation stays testable without `Date.now()`

- [ ] **Step 1: Update existing tests to pass a fixed `now` and assert real trust behavior**

In `functions/src/recommendations/createRecommendation.test.ts`, every call to `createRecommendationHandler(input, store)` becomes `createRecommendationHandler(input, store, FIXED_NOW)`. Add near the top of the file:

```ts
const FIXED_NOW = new Date("2026-07-23T00:00:00Z").getTime();
```

Update the first test ("creates a recommendation against an existing restaurant") to seed a user and assert real trust is used instead of the old hardcoded 10:

```ts
  it("creates a recommendation against an existing restaurant", async () => {
    const { store, restaurants, users } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });
    users.set("u1", {
      id: "u1",
      username: "priyanka.eats",
      displayName: "Priyanka R.",
      photoURL: "",
      tier: "explorer",
      trustScore: 42,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      createdAt: FIXED_NOW,
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
      FIXED_NOW,
    );

    expect(result.restaurantId).toBe("r1");
    expect(result.verificationLevel).toBe(1);
    const rec = await store.getRecommendation(result.recommendationId);
    expect(rec?.dishName).toBe("Mutton Biryani");
    expect(rec?.trustSnapshot).toBe(42); // uses the author's real trust score, not a hardcoded default
    expect(restaurants.get("r1")?.aggregates.recCount).toBe(1);
    expect(users.get("u1")?.recCount).toBe(1);
  });
```

For every other test in the file, add `store, FIXED_NOW` as the call's third argument in place of just `store`, and (for tests that don't currently seed a user) leave the author unseeded — those exercise the fallback path. Add one new test for that fallback:

```ts
  it("falls back to trust score 10 when the author has no profile doc yet", async () => {
    const { store, restaurants } = createTestStore();
    restaurants.set("r1", {
      id: "r1",
      name: "Shah Ghouse",
      source: "google",
      location: { lat: 17.3999, lng: 78.4118 },
      area: "Tolichowki",
      city: "Hyderabad",
      aggregates: { recCount: 0 },
      createdBy: "seed",
      createdAt: Date.now(),
    });

    const result = await createRecommendationHandler(
      {
        authorId: "no-profile-user",
        restaurantId: "r1",
        dishName: "Mutton Biryani",
        mealTags: ["dinner"],
        signalTags: [],
        primarySignal: "recommend",
        caption: "Great biryani here.",
      },
      store,
      FIXED_NOW,
    );

    const rec = await store.getRecommendation(result.recommendationId);
    expect(rec?.trustSnapshot).toBe(10);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npm test -- createRecommendation`
Expected: FAIL — `createRecommendationHandler` doesn't accept a third argument yet, and `trustSnapshot` is still hardcoded to `MVP_DEFAULT_TRUST`.

- [ ] **Step 3: Implement**

In `functions/src/recommendations/createRecommendation.ts`, replace the `MVP_DEFAULT_TRUST` constant and its usage. Add imports:

```ts
import { computeTrust } from "../trust.js";
```

Remove the line `const MVP_DEFAULT_TRUST = 10;` and its comment. Change the function signature and the trust-lookup + post-create bookkeeping:

```ts
export async function createRecommendationHandler(
  input: CreateRecommendationInput,
  store: Store,
  now: number,
): Promise<CreateRecommendationResult> {
```

Right before the final `store.createRecommendation(...)` call, replace the hardcoded `trustSnapshot: MVP_DEFAULT_TRUST` with a real lookup:

```ts
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
```

The `trustSnapshot` on the new recommendation intentionally uses the author's trust *before* this post's own stat increment (matches master doc §9.2: "stores the author's trust at publish time") — the increment and recompute happen after, so this post starts contributing to trust for their *next* post, not this one.

- [ ] **Step 4: Update the call site in `functions/src/index.ts`**

The `createRecommendation` onCall handler currently calls `createRecommendationHandler({ ...input, authorId: request.auth.uid }, store)`. Add the `Date.now()` argument (this is the one place in the codebase where wall-clock time is allowed — the boundary between the Cloud Function runtime and pure/testable logic):

```ts
    return await createRecommendationHandler({ ...input, authorId: request.auth.uid }, store, Date.now());
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd functions && npm test -- createRecommendation`
Expected: PASS (all tests including the new fallback test)

- [ ] **Step 6: Run the full suite**

Run: `cd functions && npm test`
Expected: PASS, no regressions elsewhere

- [ ] **Step 7: Commit**

```bash
git add functions/src/recommendations/createRecommendation.ts functions/src/recommendations/createRecommendation.test.ts functions/src/index.ts
git commit -m "Wire real trust score into createRecommendation, replacing hardcoded default"
```

---

### Task 7: Wire trust into `toggleHelpfulVote`

**Files:**
- Modify: `functions/src/recommendations/toggleHelpfulVote.ts`
- Modify: `functions/src/recommendations/toggleHelpfulVote.test.ts`

**Interfaces:**
- Consumes: `computeTrust` (Task 4), `Store.getUser`/`applyHelpfulReceivedDelta`/`updateUserTrust` (Tasks 1 & 5)
- Produces: `toggleHelpfulVoteHandler` now takes a `now: number` fourth parameter

- [ ] **Step 1: Update tests for real per-voter trust weight and author trust recompute**

In `functions/src/recommendations/toggleHelpfulVote.test.ts`, add `const FIXED_NOW = new Date("2026-07-23T00:00:00Z").getTime();` near the top, and update every `toggleHelpfulVoteHandler(recId, voterUid, store)` call to `toggleHelpfulVoteHandler(recId, voterUid, store, FIXED_NOW)`.

Update the first test to seed a voter with a real trust score and assert the weight comes from it, and to check the recommendation author's stats update:

```ts
  it("casts a helpful vote and updates the recommendation's aggregate counts", async () => {
    const { store, recommendations, users } = createTestStore();
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
      status: "active",
      createdAt: Date.now(),
    });
    users.set("author1", {
      id: "author1",
      username: "author",
      displayName: "Author",
      photoURL: "",
      tier: "explorer",
      trustScore: 10,
      recCount: 1,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      createdAt: FIXED_NOW,
    });
    users.set("voter1", {
      id: "voter1",
      username: "voter",
      displayName: "Voter",
      photoURL: "",
      tier: "explorer",
      trustScore: 80,
      recCount: 0,
      verifiedRecCount: 0,
      weightedHelpfulReceived: 0,
      createdAt: FIXED_NOW,
    });

    const result = await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

    expect(result.voted).toBe(true);
    expect(result.helpfulVoteCount).toBe(1);
    expect(result.weightedHelpful).toBeCloseTo(0.8, 5); // voter1's trust(80) / 100
    expect(users.get("author1")?.weightedHelpfulReceived).toBeCloseTo(0.8, 5);
  });
```

Update the "un-votes" and "counts votes from different voters independently" tests the same way (seed `author1` and each voter with a `trustScore`, pass `FIXED_NOW`, and adjust the expected `weightedHelpful` values to match the seeded voter trust scores instead of the old flat `10/100 = 0.1`). Add one new fallback test:

```ts
  it("falls back to trust score 10 when the voter has no profile doc yet", async () => {
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
      status: "active",
      createdAt: Date.now(),
    });

    const result = await toggleHelpfulVoteHandler("rec1", "no-profile-voter", store, FIXED_NOW);

    expect(result.weightedHelpful).toBeCloseTo(0.1, 5); // 10 / 100
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd functions && npm test -- toggleHelpfulVote`
Expected: FAIL — signature mismatch and old hardcoded weight

- [ ] **Step 3: Implement**

Replace the full contents of `functions/src/recommendations/toggleHelpfulVote.ts`:

```ts
import type { Store } from "../store.js";
import { computeTrust } from "../trust.js";

export async function toggleHelpfulVoteHandler(
  recId: string,
  voterUid: string,
  store: Store,
  now: number,
): Promise<{ voted: boolean; weightedHelpful: number; helpfulVoteCount: number }> {
  const rec = await store.getRecommendation(recId);
  if (!rec) throw new Error("recommendation not found");

  const existingVote = await store.getVote(recId, voterUid);

  if (existingVote) {
    await store.deleteVote(recId, voterUid);
    await store.applyHelpfulDelta(recId, -existingVote.weight, -1);
    await recomputeAuthorTrust(rec.authorId, -existingVote.weight, store, now);
    const updated = await store.getRecommendation(recId);
    return { voted: false, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
  }

  const voter = await store.getUser(voterUid);
  const weight = (voter?.trustScore ?? 10) / 100;
  await store.createVote(recId, voterUid, weight);
  await store.applyHelpfulDelta(recId, weight, 1);
  await recomputeAuthorTrust(rec.authorId, weight, store, now);
  const updated = await store.getRecommendation(recId);
  return { voted: true, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
}

async function recomputeAuthorTrust(authorId: string, weightDelta: number, store: Store, now: number): Promise<void> {
  const author = await store.getUser(authorId);
  if (!author) return;

  await store.applyHelpfulReceivedDelta(authorId, weightDelta);
  const updated = await store.getUser(authorId);
  const { score, tier } = computeTrust({
    accountCreatedAt: updated!.createdAt,
    now,
    recCount: updated!.recCount,
    verifiedRecCount: updated!.verifiedRecCount,
    weightedHelpfulReceived: updated!.weightedHelpfulReceived,
  });
  await store.updateUserTrust(authorId, score, tier);
}
```

- [ ] **Step 4: Update the call site in `functions/src/index.ts`**

```ts
    return await toggleHelpfulVoteHandler(recId, request.auth.uid, store, Date.now());
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd functions && npm test -- toggleHelpfulVote`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `cd functions && npm test`
Expected: PASS, no regressions

- [ ] **Step 7: Commit**

```bash
git add functions/src/recommendations/toggleHelpfulVote.ts functions/src/recommendations/toggleHelpfulVote.test.ts functions/src/index.ts
git commit -m "Wire real trust score into toggleHelpfulVote, recompute author trust on vote"
```

---

## Phase 3: Live Data Reads

### Task 8: Client Firestore query layer

**Files:**
- Create: `src/lib/queries.ts`

**Interfaces:**
- Consumes: `db` from `../lib/firebase`; `Author`, `MealTag`, `PrimarySignal`, `Recommendation`, `Restaurant`, `SignalTag`, `Tier` from `../types`
- Produces: `fetchFeed(limitCount?: number): Promise<Recommendation[]>`, `fetchRecommendation(id: string): Promise<Recommendation | null>`, `fetchRestaurants(): Promise<Restaurant[]>`, `fetchRestaurantById(id: string): Promise<Restaurant | null>`, `fetchRecommendationsForRestaurant(restaurantId: string): Promise<Recommendation[]>`, `fetchUserByUsername(username: string): Promise<{ uid: string; profile: Pick<Author, "username" | "displayName" | "photoURL" | "tier"> } | null>`, `fetchRecommendationsByAuthor(authorId: string): Promise<Recommendation[]>`

- [ ] **Step 1: Create the query layer**

Create `src/lib/queries.ts`:

```ts
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
    photo: null,
    mealTags: raw.mealTags as MealTag[],
    signalTags: raw.signalTags as SignalTag[],
    primarySignal: raw.primarySignal,
    caption: raw.caption,
    verificationLevel: raw.verificationLevel,
    weightedHelpful: raw.weightedHelpful,
    helpfulVoteCount: raw.helpfulVoteCount,
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
      where("status", "==", "active"),
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
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
      ),
    ),
  ]);
  const restaurant = restaurantSnap.exists() ? (restaurantSnap.data() as RawRestaurant) : undefined;
  const docs = recSnap.docs.map((d) => ({ id: d.id, data: d.data() as RawRecommendation }));
  const users = await fetchByIds<RawUser>("users", docs.map((d) => d.data.authorId));
  return docs.map((d) => toRecommendation(d.id, d.data, restaurant, users.get(d.data.authorId)));
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
      where("status", "==", "active"),
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
```

- [ ] **Step 2: Manually verify against real data**

Run: `npm run dev`. In the browser console on any page, run:

```js
import("/src/lib/queries.ts").then((m) => m.fetchFeed().then(console.log))
```

(or temporarily add a `console.log(await fetchFeed())` inside a page component). Confirm it returns an array built from your real `recommendations` — the ones created via Post.tsx in the write-path work — not an error. If you see a Firestore "index not ready" error, wait for the Task 2 index build to finish and retry.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "Add Firestore client query layer joining recommendations/restaurants/users"
```

---

### Task 9: Wire `Home.tsx` to real data

**Files:**
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `fetchFeed` (Task 8)

- [ ] **Step 1: Replace the mock import with a real fetch**

In `src/pages/Home.tsx`, replace `import { MOCK_FEED } from "../data/mockData";` with:

```ts
import { fetchFeed } from "../lib/queries";
import type { Recommendation } from "../types";
```

Add state and an effect near the top of the component body (after the existing `useState` declarations):

```ts
  const [feed, setFeed] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed()
      .then(setFeed)
      .finally(() => setLoading(false));
  }, []);
```

Replace every `MOCK_FEED` reference in the `strictResults`/`fallbackResults` `useMemo` calls with `feed`, and add `feed` to both memos' dependency arrays:

```ts
  const strictResults = useMemo(
    () =>
      feed.filter((rec) => {
        const areaMatch = rec.restaurant.area === area;
        const mealMatch = rec.mealTags.includes(meal);
        const signalMatch = activeSignals.size === 0 || rec.signalTags.some((t) => activeSignals.has(t));
        return areaMatch && mealMatch && signalMatch;
      }),
    [feed, area, meal, activeSignals],
  );

  const fallbackResults = useMemo(
    () => feed.filter((rec) => activeSignals.size === 0 || rec.signalTags.some((t) => activeSignals.has(t))),
    [feed, activeSignals],
  );
```

- [ ] **Step 2: Add a loading state to the render**

Right before the existing `{results.length === 0 && (...)}` empty-state block, add:

```tsx
          {loading && <p className="py-10 text-center text-sm text-pt-ink-soft">Loading recommendations…</p>}
```

And guard the existing empty-state block so it doesn't flash before the fetch resolves:

```tsx
          {!loading && results.length === 0 && (
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, open `/`. Confirm the feed shows real recommendations you posted earlier (via the write-path work), not the four mock ones ("Shah Ghouse", "Ram Ki Bandi", etc. should be gone unless you happen to have posted against those exact names). Toggle the meal/area filters and confirm they still work against real data.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "Wire Home feed to real Firestore data"
```

---

### Task 10: Wire `Search.tsx` to real data

**Files:**
- Modify: `src/pages/Search.tsx`

**Interfaces:**
- Consumes: `fetchFeed`, `fetchRestaurants` (Task 8)

- [ ] **Step 1: Replace mock imports with real fetches**

Replace `import { MOCK_FEED, MOCK_RESTAURANTS } from "../data/mockData";` with:

```ts
import { useEffect, useState } from "react";
import { fetchFeed, fetchRestaurants } from "../lib/queries";
import type { Recommendation, Restaurant } from "../types";
```

(note `useEffect` needs adding to the existing `import { useMemo, useState } from "react";` line — merge into `import { useEffect, useMemo, useState } from "react";`)

Add state and a fetch effect near the top of the component:

```ts
  const [feed, setFeed] = useState<Recommendation[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    fetchFeed().then(setFeed);
    fetchRestaurants().then(setRestaurants);
  }, []);
```

Replace `MOCK_PEOPLE` (which derives from `MOCK_FEED`) with a `useMemo` over `feed`:

```ts
  const people = useMemo(
    () => [...new Map(feed.map((r) => [r.author.username, r.author])).values()],
    [feed],
  );
```

Replace every remaining `MOCK_FEED` reference with `feed`, every `MOCK_RESTAURANTS` with `restaurants`, and every `MOCK_PEOPLE` with `people` (in the `dishResults`/`placeResults`/`peopleResults` `useMemo`s, adding `feed`/`restaurants`/`people` to their dependency arrays respectively).

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, open `/search`. Confirm all three tabs (Dishes & Places, Places, People) show real data and the search box filters it correctly.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Search.tsx
git commit -m "Wire Search page to real Firestore data"
```

---

### Task 11: Wire `RestaurantProfile.tsx` to real data

**Files:**
- Modify: `src/pages/RestaurantProfile.tsx`

**Interfaces:**
- Consumes: `fetchRestaurantById`, `fetchRecommendationsForRestaurant` (Task 8)

- [ ] **Step 1: Replace the mock lookups with fetches**

Replace `import { MOCK_FEED, MOCK_RESTAURANTS } from "../data/mockData";` with:

```ts
import { useEffect, useState } from "react";
import { fetchRestaurantById, fetchRecommendationsForRestaurant } from "../lib/queries";
import type { Recommendation, Restaurant } from "../types";
```

Replace the synchronous lookups:

```ts
  const restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
  const recs = MOCK_FEED.filter((r) => r.restaurant.id === id);
```

with:

```ts
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchRestaurantById(id), fetchRecommendationsForRestaurant(id)]).then(([r, recList]) => {
      setRestaurant(r);
      setRecs(recList);
      setLoading(false);
    });
  }, [id]);
```

Guard the "not found" render so it doesn't flash before the fetch resolves:

```tsx
  if (!loading && !restaurant) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Place not found.</div>;
  }
  if (loading || !restaurant) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Loading…</div>;
  }
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, click into any restaurant from `/search` (Places tab) or from a recommendation card. Confirm real name/area/city/recCount/topDish and the real list of recommendations for that place.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RestaurantProfile.tsx
git commit -m "Wire RestaurantProfile page to real Firestore data"
```

---

### Task 12: Wire `PublicProfile.tsx` to real data

**Files:**
- Modify: `src/pages/PublicProfile.tsx`

**Interfaces:**
- Consumes: `fetchUserByUsername`, `fetchRecommendationsByAuthor` (Task 8)

- [ ] **Step 1: Replace the mock lookup**

Replace `import { MOCK_FEED } from "../data/mockData";` with:

```ts
import { useEffect, useState } from "react";
import { fetchUserByUsername, fetchRecommendationsByAuthor } from "../lib/queries";
import type { Author, Recommendation } from "../types";
```

Replace:

```ts
  const recs = MOCK_FEED.filter((r) => r.author.username === username);
  const author = recs[0]?.author;
  const areas = [...new Set(recs.map((r) => r.restaurant.area))];
```

with:

```ts
  const [author, setAuthor] = useState<Author | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetchUserByUsername(username).then(async (result) => {
      if (!result) {
        setAuthor(null);
        setLoading(false);
        return;
      }
      const recList = await fetchRecommendationsByAuthor(result.uid);
      setAuthor({ uid: result.uid, ...result.profile });
      setRecs(recList);
      setLoading(false);
    });
  }, [username]);

  const areas = [...new Set(recs.map((r) => r.restaurant.area))];
```

Update the not-found/loading guards the same way as Task 11:

```tsx
  if (!loading && !author) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">User not found.</div>;
  }
  if (loading || !author) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Loading…</div>;
  }
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, click an author name/avatar from a recommendation card. Confirm real displayName/tier/areas/recommendations.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PublicProfile.tsx
git commit -m "Wire PublicProfile page to real Firestore data"
```

---

### Task 13: Wire `RecommendationDetail.tsx` to real data

**Files:**
- Modify: `src/pages/RecommendationDetail.tsx`

**Interfaces:**
- Consumes: `fetchRecommendation` (Task 8)

- [ ] **Step 1: Replace the mock lookup**

Replace `import { MOCK_FEED } from "../data/mockData";` with:

```ts
import { useEffect, useState } from "react";
import { fetchRecommendation } from "../lib/queries";
import type { Recommendation } from "../types";
```

(merge `useEffect`/`useState` into the existing `import { useState } from "react";` line)

Replace:

```ts
  const rec = MOCK_FEED.find((r) => r.id === id);

  const [voted, setVoted] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(rec?.helpfulVoteCount ?? 0);

  if (!rec) {
```

with:

```ts
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchRecommendation(id).then((r) => {
      setRec(r);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Loading…</div>;
  }

  if (!rec) {
```

Leave the existing `voted`/`helpfulCount` local state and the "not found" JSX as-is for now — Task 17 (Phase 4) replaces the local vote state with the real `useHelpfulVote` hook. This task only fixes *which recommendation* loads, not yet how voting works.

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, click into any recommendation card. Confirm the detail page shows the real dish/caption/tags for that specific recommendation (not always the same mock one).

- [ ] **Step 3: Commit**

```bash
git add src/pages/RecommendationDetail.tsx
git commit -m "Wire RecommendationDetail page to real Firestore data"
```

---

### Task 14: Wire `Post.tsx`'s place picker to real restaurants

**Files:**
- Modify: `src/pages/Post.tsx`

**Interfaces:**
- Consumes: `fetchRestaurants` (Task 8)

- [ ] **Step 1: Replace the mock restaurant list with a real fetch**

Replace `import { MOCK_RESTAURANTS } from "../data/mockData";` with:

```ts
import { useEffect, useState } from "react";
import { fetchRestaurants } from "../lib/queries";
```

(merge into the existing `import { useState } from "react";` line)

Add near the top of the component body:

```ts
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    fetchRestaurants().then(setRestaurants);
  }, []);
```

Replace the `placeMatches` computation's reference to `MOCK_RESTAURANTS` with `restaurants`:

```ts
  const placeMatches = placeQuery.trim()
    ? restaurants.filter((r) => r.name.toLowerCase().includes(placeQuery.trim().toLowerCase()))
    : restaurants;
```

- [ ] **Step 2: Remove the now-stale error-message special case**

In `handleSubmit`'s `catch` block, the message rewrite `"This demo restaurant isn't in the real database yet — try..."` was a workaround for posting against a restaurant that only existed in mock data. Now that the picker only shows real restaurants, that case can't happen — simplify:

```ts
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
    } finally {
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, open `/post`, confirm Step 1's place search shows real restaurants (including any community places created earlier) and posting against one succeeds end-to-end.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Post.tsx
git commit -m "Wire Post place picker to real restaurants, drop stale mock-data error case"
```

---

### Task 15: Wire `Profile.tsx` to the real user doc

**Files:**
- Modify: `src/pages/Profile.tsx`

**Interfaces:**
- Consumes: `db` from `../lib/firebase`; `getDoc`, `doc`, `getCountFromServer`, `collection`, `query`, `where` from `firebase/firestore`

- [ ] **Step 1: Replace `MOCK_OWN_TRUST` with a real fetch**

Replace the top of `src/pages/Profile.tsx`:

```ts
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TrustBadge from "../components/TrustBadge";
import { TIER_LABEL } from "../types";
import type { Tier } from "../types";

// Placeholder until the Phase 1 trust engine Cloud Function is live (§9).
const MOCK_OWN_TRUST = { tier: "explorer" as Tier, tierProgress: 12, recCount: 0, savedCount: 0 };
```

with:

```ts
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { collection, doc, getCountFromServer, getDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import TrustBadge from "../components/TrustBadge";
import { TIER_LABEL } from "../types";
import type { Tier } from "../types";

interface OwnTrust {
  tier: Tier;
  trustScore: number;
  recCount: number;
  savedCount: number;
}

const TIER_MIN_SCORE: Record<Tier, number> = {
  explorer: 0,
  local_foodie: 20,
  verified_foodie: 35,
  neighborhood_expert: 50,
  city_expert: 65,
  legend: 80,
};
```

(`TIER_MIN_SCORE` mirrors the thresholds in `functions/src/trust.ts` Task 4 — used only to compute the progress bar's percentage-to-next-tier on the client, not to recompute trust itself.)

- [ ] **Step 2: Fetch the real profile and saved count**

Replace the component body's opening:

```ts
export default function Profile() {
  const { user, logOut } = useAuth();
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(MOCK_OWN_TRUST.tier) + 1];
```

with:

```ts
const TIER_ORDER: Tier[] = ["explorer", "local_foodie", "verified_foodie", "neighborhood_expert", "city_expert", "legend"];

export default function Profile() {
  const { user, logOut } = useAuth();
  const [trust, setTrust] = useState<OwnTrust | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getCountFromServer(query(collection(db, "saves"), where("uid", "==", user.uid))),
    ]).then(([userSnap, savesCount]) => {
      const data = userSnap.data() as { tier: Tier; trustScore: number; recCount: number } | undefined;
      setTrust({
        tier: data?.tier ?? "explorer",
        trustScore: data?.trustScore ?? 10,
        recCount: data?.recCount ?? 0,
        savedCount: savesCount.data().count,
      });
    });
  }, [user]);

  if (!trust) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Loading…</div>;
  }

  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(trust.tier) + 1];
  const tierProgress = nextTier
    ? Math.round(
        ((trust.trustScore - TIER_MIN_SCORE[trust.tier]) / (TIER_MIN_SCORE[nextTier] - TIER_MIN_SCORE[trust.tier])) * 100,
      )
    : 100;
```

(the existing `TIER_ORDER` constant that sat above the component moves down next to where it's now defined, right above the component — remove the old top-level declaration if it duplicates)

- [ ] **Step 3: Replace remaining `MOCK_OWN_TRUST` references**

In the JSX, replace every `MOCK_OWN_TRUST.tier` → `trust.tier`, `MOCK_OWN_TRUST.tierProgress` → `tierProgress`, `MOCK_OWN_TRUST.recCount` → `trust.recCount`, `MOCK_OWN_TRUST.savedCount` → `trust.savedCount`.

- [ ] **Step 4: Manually verify**

Run: `npm run dev`, sign in, open `/profile`. Confirm it shows your real tier (Explorer initially), a progress bar toward Local Foodie, and your real recommendation/saved counts (post one via `/post` and confirm the count increments after a refresh).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "Wire Profile page to real trust/stats from users/{uid}"
```

---

## Phase 4: Save & Helpful Interactions

### Task 16: `useSave` hook + wire into `RecommendationCard.tsx`

**Files:**
- Create: `src/hooks/useSave.ts`
- Modify: `src/components/RecommendationCard.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../context/AuthContext`, `db`/`functions` from `../lib/firebase`
- Produces: `useSave(recId: string): { saved: boolean; toggle: () => void; signedIn: boolean }`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSave.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export function useSave(recId: string) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "saves", `${user.uid}_${recId}`)).then((snap) => {
      if (!cancelled) setSaved(snap.exists());
    });
    return () => {
      cancelled = true;
    };
  }, [user, recId]);

  const toggle = useCallback(() => {
    if (!user || pending) return;
    setPending(true);
    setSaved((s) => !s);
    const toggleSave = httpsCallable(functions, "toggleSave");
    toggleSave({ recId })
      .then((response) => setSaved((response.data as { saved: boolean }).saved))
      .catch(() => setSaved((s) => !s))
      .finally(() => setPending(false));
  }, [user, recId, pending]);

  return { saved, toggle, signedIn: !!user };
}
```

- [ ] **Step 2: Wire it into `RecommendationCard.tsx`**

Add imports:

```tsx
import { useNavigate } from "react-router-dom";
import { useSave } from "../hooks/useSave";
```

Inside the component, after `const isMustTry = ...`:

```tsx
  const navigate = useNavigate();
  const { saved, toggle, signedIn } = useSave(rec.id);
```

Replace the Save button:

```tsx
          <button
            type="button"
            aria-label={saved ? "Remove from saved" : "Save recommendation"}
            aria-pressed={saved}
            onClick={() => (signedIn ? toggle() : navigate("/login"))}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 hover:bg-pt-surface-2 ${
              saved ? "text-pt-primary" : "text-pt-ink-soft hover:text-pt-primary"
            }`}
          >
            <Bookmark className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} fill={saved ? "currentColor" : "none"} />
          </button>
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`. While signed out, tap Save on a card — confirm it redirects to `/login`. Sign in, tap Save — confirm the icon fills in immediately (optimistic) and stays filled after a page refresh (confirming the `saves/{uid}_{recId}` doc really got created). Tap again to un-save and confirm it reverts.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSave.ts src/components/RecommendationCard.tsx
git commit -m "Wire Save button to toggleSave with useSave hook"
```

---

### Task 17: `useHelpfulVote` hook + wire into `RecommendationDetail.tsx`

**Files:**
- Create: `src/hooks/useHelpfulVote.ts`
- Modify: `src/pages/RecommendationDetail.tsx`

**Interfaces:**
- Consumes: `useAuth`, `db`/`functions` from `../lib/firebase`
- Produces: `useHelpfulVote(recId: string, initialCount: number): { voted: boolean; count: number; toggle: () => void; signedIn: boolean }`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useHelpfulVote.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export function useHelpfulVote(recId: string, initialCount: number) {
  const { user } = useAuth();
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!user) {
      setVoted(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "recommendations", recId, "votes", user.uid)).then((snap) => {
      if (!cancelled) setVoted(snap.exists());
    });
    return () => {
      cancelled = true;
    };
  }, [user, recId]);

  const toggle = useCallback(() => {
    if (!user || pending) return;
    setPending(true);
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount((c) => c + (wasVoted ? -1 : 1));
    const toggleHelpfulVote = httpsCallable(functions, "toggleHelpfulVote");
    toggleHelpfulVote({ recId })
      .then((response) => {
        const data = response.data as { voted: boolean; helpfulVoteCount: number };
        setVoted(data.voted);
        setCount(data.helpfulVoteCount);
      })
      .catch(() => {
        setVoted(wasVoted);
        setCount((c) => c + (wasVoted ? 1 : -1));
      })
      .finally(() => setPending(false));
  }, [user, recId, pending, voted]);

  return { voted, count, toggle, signedIn: !!user };
}
```

- [ ] **Step 2: Wire it into `RecommendationDetail.tsx`, replacing local vote state**

Replace:

```ts
  const [voted, setVoted] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(rec?.helpfulVoteCount ?? 0);
```

(this line moves below the `rec`/`loading` fetch from Task 13 — place it right after the `if (!rec) { ... }` guard, since it needs `rec` to exist first)

```ts
  const { voted, count: helpfulCount, toggle: toggleHelpful, signedIn } = useHelpfulVote(rec.id, rec.helpfulVoteCount);
```

Add the import:

```ts
import { useHelpfulVote } from "../hooks/useHelpfulVote";
```

Replace the Helpful button's `onClick`:

```tsx
            <button
              type="button"
              onClick={() => (signedIn ? toggleHelpful() : navigate("/login"))}
              aria-pressed={voted}
```

(`navigate` already exists in this component from `useNavigate()`)

- [ ] **Step 3: Wire the Save button on this page too**

Add the import and hook call:

```ts
import { useSave } from "../hooks/useSave";
```

```ts
  const { saved, toggle: toggleSave, signedIn: canSave } = useSave(rec.id);
```

Replace the Bookmark button:

```tsx
            <button
              type="button"
              aria-label={saved ? "Remove from saved" : "Save recommendation"}
              aria-pressed={saved}
              onClick={() => (canSave ? toggleSave() : navigate("/login"))}
              className={`ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 hover:bg-pt-surface-2 ${
                saved ? "text-pt-primary" : "text-pt-ink-soft hover:text-pt-primary"
              }`}
            >
              <Bookmark className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} fill={saved ? "currentColor" : "none"} />
            </button>
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`, open a recommendation's detail page. Confirm Helpful and Save both work while signed in (persist across refresh) and both redirect to `/login` while signed out. Sign in as a second Google account and confirm the helpful count increments independently per voter (matches the `toggleHelpfulVoteHandler` "counts votes from different voters independently" test).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHelpfulVote.ts src/pages/RecommendationDetail.tsx
git commit -m "Wire Helpful and Save buttons on the detail page to real Cloud Functions"
```

---

### Task 18: Wire `Saved.tsx` to real saved recommendations

**Files:**
- Modify: `src/pages/Saved.tsx`

**Interfaces:**
- Consumes: `fetchRecommendation` (Task 8), `useAuth`, `db` from `../lib/firebase`

- [ ] **Step 1: Fetch the current user's saved recommendations**

Replace the full contents of `src/pages/Saved.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { fetchRecommendation } from "../lib/queries";
import RecommendationCard from "../components/RecommendationCard";
import type { Recommendation } from "../types";

export default function Saved() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(query(collection(db, "saves"), where("uid", "==", user.uid))).then(async (snap) => {
      const recIds = snap.docs.map((d) => (d.data() as { recId: string }).recId);
      const fetched = await Promise.all(recIds.map(fetchRecommendation));
      setRecs(fetched.filter((r): r is Recommendation => r !== null));
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="pb-24 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-xl font-semibold text-pt-ink">Saved</h1>

        {loading && <p className="mt-6 text-center text-sm text-pt-ink-soft">Loading…</p>}

        {!loading && recs.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-pt-border px-4 py-12 text-center">
            <Bookmark className="h-8 w-8 text-pt-ink-soft" aria-hidden="true" strokeWidth={1.5} />
            <p className="mt-3 font-medium text-pt-ink">Nothing saved yet</p>
            <p className="mt-1 text-sm text-pt-ink-soft">Tap the bookmark on any recommendation to keep it here.</p>
          </div>
        )}

        {!loading && recs.length > 0 && (
          <div className="mt-6 space-y-4">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, sign in, save a couple of recommendations from `/` or `/search`, then open `/saved`. Confirm they appear as full cards. Un-save one from the card itself, refresh `/saved`, confirm it's gone.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Saved.tsx
git commit -m "Wire Saved page to real saves collection"
```

---

## Self-Review Notes

- **Spec coverage:** Item 1 (real reads) → Tasks 8–15 cover every page that imported `MOCK_FEED`/`MOCK_RESTAURANTS` (`Home`, `Search`, `RestaurantProfile`, `PublicProfile`, `RecommendationDetail`, `Post`, `Profile`). Item 2 (Save/Helpful wiring) → Tasks 16–18 cover both card and detail-page buttons plus the `Saved` list itself, which was a fully static stub before. Item 3 (users doc + trust engine) → Tasks 1–7 create the doc, compute real trust, and wire it into both mutation paths that previously hardcoded `MVP_DEFAULT_TRUST = 10`.
- **Ordering rationale:** the checklist's own priority order was reads → save/helpful → trust engine, but trust (Phase 1–2 here) has to land first — Phase 3's `author.tier` join and Phase 4's vote-weight calculation both depend on `users/{uid}` documents and `computeTrust` already existing. Building reads first against still-hardcoded trust would mean redoing the join logic once trust landed.
- **Placeholder scan:** no TBD/TODO markers; every step has real code. The one open design choice flagged inline (tier score thresholds in `trust.ts` and mirrored in `Profile.tsx`) is explicitly marked as a v1 placeholder in both the code comment and this plan, per master doc §9.1 leaving it unspecified — not a placeholder step, a documented judgment call.
- **Type consistency:** `UserRecord`/`NewUserInput`/`Tier` (Task 1) → consumed identically by `trust.ts` (Task 4), `createRecommendation.ts` (Task 6), `toggleHelpfulVote.ts` (Task 7). `Recommendation`/`Restaurant`/`Author` (client-side, unchanged from `src/types/index.ts`) → `toRecommendation`/`restaurantDocToUi` in `queries.ts` (Task 8) are the single place that constructs them from raw Firestore data, and every page task (9–15) consumes those same functions rather than re-deriving the shape.
