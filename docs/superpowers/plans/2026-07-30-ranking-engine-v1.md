# Ranking Engine v1 + Feed Status Bug Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a live status-filter bug that's currently returning empty results from every recommendation read query, then implement §11.1's locked ranking formula so the home feed sorts by trust-weighted score instead of raw `createdAt` — closing the highest-priority gap identified in the master build document's own audit (§21.1 item 8, §21.5 priority 2).

**Architecture:** No architecture change. Existing stack: React 19 + Vite (frontend), Firebase Cloud Functions + Firestore (backend), vitest for backend unit tests against an in-memory `Store` fake (`testStore.ts`). `rankingScore` is computed as a pure function (mirroring the existing `computeTrust` pattern in `trust.ts`), written incrementally on recommendation-create and helpful-vote events, and read via a new Firestore composite index. No new collections, no new services.

**Tech Stack:** TypeScript, Firebase Admin SDK (`functions/`), Firebase client SDK (`src/`), vitest.

## Global Constraints

- Ranking formula is locked exactly as: `rankingScore = (weightedHelpful × trustSnapshot/100 × verificationMultiplier) × e^(−k·Δt)`, `k = ln(2)/365` (365-day half-life) — master doc §11.1. Do not invent a different formula or add extra multiplicative terms (that's the deferred v2 formula, §11.2 — out of scope here).
- Recommendation velocity limit stays 5/hour (§14, already implemented in `createRecommendation.ts`) — not touched by this plan.
- `functions/` has an established vitest + in-memory-`Store` TDD pattern (see `trust.test.ts`, `toggleHelpfulVote.test.ts`) — follow it exactly for every backend change.
- `src/` (frontend) has **no existing test infrastructure** (confirmed: zero `*.test.*` files under `src/`). Task 1's fix is a plain string-literal correction with no framework to hook a unit test into — verified manually against the Firebase emulator instead, per Step-by-step below. Do not introduce a new frontend test framework as a side effect of this plan; that's tracked separately (build-plan.md item 20.5).
- Every new/changed Firestore field is written through the existing `Store` interface (`store.ts`) — never a raw Firestore call from a handler file, matching the codebase's existing separation of concerns.

---

### Task 1: Fix the recommendation status filter mismatch

**Files:**
- Modify: `src/lib/queries.ts:113,160,211`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new — corrects an existing query to match the value every write path already uses (`"live"`, per `functions/src/types.ts:21` and `functions/src/store.ts:117`)

- [ ] **Step 1: Confirm the mismatch**

Run: `grep -n '"active"' src/lib/queries.ts` — expect 3 matches (lines 113, 160, 211). Run: `grep -n 'status:' functions/src/store.ts functions/src/testStore.ts` — expect both to show `status: "live"`. This confirms every write uses `"live"` and every read filters `"active"` — the reads currently return zero documents.

- [ ] **Step 2: Fix all three occurrences**

In `src/lib/queries.ts`, change each of the three occurrences of:

```ts
where("status", "==", "active"),
```

to:

```ts
where("status", "==", "live"),
```

This affects `fetchFeed` (line 113), `fetchRecommendationsForRestaurant` (line 160), and `fetchRecommendationsByAuthor` (line 211).

- [ ] **Step 3: Manual verification against the Firebase emulator**

Run: `npm run dev` (root `package.json`) with the Firebase emulator suite running (`firebase emulators:start` from repo root, per the existing `firebase.json` config). Post one recommendation through the running app's Post flow, then confirm it appears on Home (feed), on its restaurant's profile page, and on the author's own profile page. Before this fix, all three would show empty states despite the write succeeding — confirm the fix by seeing the recommendation actually render.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts
git commit -m "fix: recommendation queries filtered status=active, writes use status=live"
```

---

### Task 2: Ranking score pure function

**Files:**
- Create: `functions/src/ranking.ts`
- Test: `functions/src/ranking.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `computeRankingScore(inputs: RankingScoreInputs): number`, exported from `functions/src/ranking.ts`, where `RankingScoreInputs = { weightedHelpful: number; trustSnapshot: number; verificationMultiplier: number; createdAt: number; now: number }` — `createdAt`/`now` are millisecond epoch timestamps, matching the convention already used by `computeTrust` in `trust.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// functions/src/ranking.test.ts
import { describe, expect, it } from "vitest";
import { computeRankingScore } from "./ranking.js";

const MS_PER_DAY = 86_400_000;
const BASE_NOW = new Date("2026-07-30T00:00:00Z").getTime();

describe("computeRankingScore", () => {
  it("returns 0 when weightedHelpful is 0, regardless of trust or verification", () => {
    const score = computeRankingScore({
      weightedHelpful: 0,
      trustSnapshot: 90,
      verificationMultiplier: 1.7,
      createdAt: BASE_NOW,
      now: BASE_NOW,
    });
    expect(score).toBe(0);
  });

  it("multiplies weightedHelpful by trustSnapshot/100 and the verification multiplier with no time decay at t=0", () => {
    const score = computeRankingScore({
      weightedHelpful: 10,
      trustSnapshot: 80,
      verificationMultiplier: 1.3,
      createdAt: BASE_NOW,
      now: BASE_NOW,
    });
    // 10 * 0.8 * 1.3 * e^0 = 10.4
    expect(score).toBeCloseTo(10.4, 5);
  });

  it("decays to exactly 50% at the 365-day half-life (§11.1)", () => {
    const createdAt = BASE_NOW;
    const now = BASE_NOW + 365 * MS_PER_DAY;
    const score = computeRankingScore({
      weightedHelpful: 10,
      trustSnapshot: 100,
      verificationMultiplier: 1.0,
      createdAt,
      now,
    });
    expect(score).toBeCloseTo(5, 2); // base score is 10 * 1.0 * 1.0 = 10, half of that at 365 days
  });

  it("matches §11.1's documented decay curve within rounding: 7d≈99%, 30d≈94%, 90d≈84%, 180d≈71%", () => {
    const base = { weightedHelpful: 100, trustSnapshot: 100, verificationMultiplier: 1.0, createdAt: BASE_NOW };
    const ratioAt = (days: number) =>
      computeRankingScore({ ...base, now: BASE_NOW + days * MS_PER_DAY }) / 100;

    expect(ratioAt(7)).toBeCloseTo(0.99, 1);
    expect(ratioAt(30)).toBeCloseTo(0.94, 1);
    expect(ratioAt(90)).toBeCloseTo(0.84, 1);
    expect(ratioAt(180)).toBeCloseTo(0.71, 1);
  });

  it("never decays below 0 or produces a negative score for a createdAt in the future (clock skew safety)", () => {
    const score = computeRankingScore({
      weightedHelpful: 5,
      trustSnapshot: 50,
      verificationMultiplier: 1.0,
      createdAt: BASE_NOW + MS_PER_DAY,
      now: BASE_NOW,
    });
    expect(score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd functions && npm test -- ranking.test.ts`
Expected: FAIL with "Cannot find module './ranking.js'" (file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```ts
// functions/src/ranking.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd functions && npm test -- ranking.test.ts`
Expected: PASS, all 5 tests

- [ ] **Step 5: Commit**

```bash
git add functions/src/ranking.ts functions/src/ranking.test.ts
git commit -m "feat: add §11.1 ranking score pure function"
```

---

### Task 3: Write `rankingScore` on recommendation creation

**Files:**
- Modify: `functions/src/types.ts` (add `rankingScore` to `RecommendationRecord` and `NewRecommendationInput`)
- Modify: `functions/src/store.ts` (persist `rankingScore` in `createRecommendation`)
- Modify: `functions/src/testStore.ts` (mirror the same field in the in-memory fake)
- Modify: `functions/src/recommendations/createRecommendation.ts` (compute it before calling `store.createRecommendation`)
- Test: `functions/src/recommendations/createRecommendation.test.ts` (extend existing tests)

**Interfaces:**
- Consumes: `computeRankingScore` from Task 2 (`functions/src/ranking.ts`)
- Produces: `RecommendationRecord.rankingScore: number` and `NewRecommendationInput.rankingScore: number` — later tasks (4, 6) rely on this exact field name

- [ ] **Step 1: Write the failing test**

Add to `functions/src/recommendations/createRecommendation.test.ts` (append near the existing assertions on the created record):

```ts
it("sets rankingScore to 0 on creation (weightedHelpful starts at 0, per §11.1)", async () => {
  const { store, users } = createTestStore();
  users.set("author1", {
    id: "author1", username: "a", displayName: "A", photoURL: "", tier: "explorer",
    trustScore: 40, recCount: 0, verifiedRecCount: 0, weightedHelpfulReceived: 0,
    homeArea: null, tierHistory: [], voteWeightPenaltyUntil: null, createdAt: FIXED_NOW,
  });
  const result = await createRecommendationHandler(
    {
      authorId: "author1",
      restaurantId: undefined,
      communityPlace: { name: "Test Cafe", location: { lat: 17.4, lng: 78.4 }, area: "Test", city: "Hyderabad" },
      dishName: "Chai", mealTags: [], signalTags: [], primarySignal: "recommend",
      caption: "Really good, worth it.",
    },
    store,
    FIXED_NOW,
  );
  const rec = await store.getRecommendation(result.recommendationId);
  expect(rec!.rankingScore).toBe(0);
});
```

(Match the exact fixture shape and imports already at the top of this test file — reuse `createTestStore`, `createRecommendationHandler`, and the file's existing `FIXED_NOW` constant.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npm test -- createRecommendation.test.ts`
Expected: FAIL — `rec!.rankingScore` is `undefined`, not `0` (field doesn't exist yet)

- [ ] **Step 3: Add the field to the type definitions**

In `functions/src/types.ts`, add to `RecommendationRecord` (after the `weightedHelpful` line):

```ts
  /** §11.1 ranking score, recomputed on create and on every helpful-vote event. */
  rankingScore: number;
```

Add the same field to `NewRecommendationInput` (after `trustSnapshot`):

```ts
  rankingScore: number;
```

- [ ] **Step 4: Persist it in both Store implementations**

In `functions/src/store.ts`, inside `createRecommendation`'s `ref.set({...})` call, add after `weightedHelpful: 0,`:

```ts
      rankingScore: input.rankingScore,
```

In `functions/src/testStore.ts`, inside `createRecommendation`, add the same line after `weightedHelpful: 0,`:

```ts
        rankingScore: input.rankingScore,
```

- [ ] **Step 5: Compute it in the handler**

In `functions/src/recommendations/createRecommendation.ts`, add the import:

```ts
import { computeRankingScore } from "../ranking.js";
```

In the `store.createRecommendation({...})` call, add `rankingScore` (computed from the same `trustSnapshot`/`verificationMultiplier` already being written, with `weightedHelpful: 0` since it's a new recommendation):

```ts
    trustSnapshot,
    rankingScore: computeRankingScore({
      weightedHelpful: 0,
      trustSnapshot,
      verificationMultiplier: VERIFICATION_MULTIPLIER[verificationLevel],
      createdAt: now,
      now,
    }),
    geoMismatch,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd functions && npm test -- createRecommendation.test.ts`
Expected: PASS, including the new test and all pre-existing ones in this file

- [ ] **Step 7: Commit**

```bash
git add functions/src/types.ts functions/src/store.ts functions/src/testStore.ts functions/src/recommendations/createRecommendation.ts functions/src/recommendations/createRecommendation.test.ts
git commit -m "feat: write initial rankingScore on recommendation creation"
```

---

### Task 4: Recompute `rankingScore` on every helpful-vote event

**Files:**
- Modify: `functions/src/store.ts` (add `setRankingScore` to `Store` interface and `FirestoreStore`)
- Modify: `functions/src/testStore.ts` (implement `setRankingScore` on the fake)
- Modify: `functions/src/recommendations/toggleHelpfulVote.ts` (call it after every vote/unvote)
- Test: `functions/src/recommendations/toggleHelpfulVote.test.ts` (extend existing tests)

**Interfaces:**
- Consumes: `computeRankingScore` (Task 2), `Store.setRankingScore` (this task)
- Produces: `Store.setRankingScore(recId: string, rankingScore: number): Promise<void>` — a new Store method other future callers (e.g. a future scheduled decay job, §11.4, not in this plan) will also use

- [ ] **Step 1: Write the failing test**

Add to `functions/src/recommendations/toggleHelpfulVote.test.ts` (reusing the existing `rec1`/`author1`/`voter1` fixtures already set up in this file's first test):

```ts
it("recomputes rankingScore after a helpful vote is cast", async () => {
  const { store, recommendations, users } = createTestStore();
  recommendations.set("rec1", {
    id: "rec1", authorId: "author1", restaurantId: "r1", dishName: "Biryani",
    mealTags: [], signalTags: [], primarySignal: "recommend", caption: "Great",
    verificationLevel: 1, verificationMultiplier: 1.0, trustSnapshot: 50,
    weightedHelpful: 0, helpfulVoteCount: 0, rankingScore: 0, status: "live",
    geoMismatch: false, geoAtPost: null, proofUrl: null, photo: null, createdAt: FIXED_NOW,
  });
  users.set("author1", {
    id: "author1", username: "author", displayName: "Author", photoURL: "", tier: "explorer",
    trustScore: 50, recCount: 1, verifiedRecCount: 0, weightedHelpfulReceived: 0,
    homeArea: null, tierHistory: [], voteWeightPenaltyUntil: null, createdAt: FIXED_NOW,
  });
  users.set("voter1", {
    id: "voter1", username: "voter", displayName: "Voter", photoURL: "", tier: "explorer",
    trustScore: 80, recCount: 0, verifiedRecCount: 0, weightedHelpfulReceived: 0,
    homeArea: null, tierHistory: [], voteWeightPenaltyUntil: null, createdAt: FIXED_NOW,
  });

  await toggleHelpfulVoteHandler("rec1", "voter1", store, FIXED_NOW);

  const rec = await store.getRecommendation("rec1");
  // voter's weight = 80/100 = 0.8; rankingScore = 0.8 * (50/100) * 1.0 * e^0 = 0.4
  expect(rec!.rankingScore).toBeCloseTo(0.4, 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npm test -- toggleHelpfulVote.test.ts`
Expected: FAIL — `rec!.rankingScore` stays `0` after the vote, since nothing recomputes it yet

- [ ] **Step 3: Add `setRankingScore` to the Store interface and both implementations**

In `functions/src/store.ts`, add to the `Store` interface (after `applyHelpfulDelta`):

```ts
  setRankingScore(recId: string, rankingScore: number): Promise<void>;
```

Add the `FirestoreStore` implementation (after `applyHelpfulDelta`'s method body):

```ts
  async setRankingScore(recId: string, rankingScore: number): Promise<void> {
    await this.db.collection("recommendations").doc(recId).update({ rankingScore });
  }
```

In `functions/src/testStore.ts`, add to the `store` object (after `applyHelpfulDelta`'s method body):

```ts
    async setRankingScore(recId, rankingScore) {
      const rec = recommendations.get(recId);
      if (rec) rec.rankingScore = rankingScore;
    },
```

- [ ] **Step 4: Call it from the vote-toggle handler**

In `functions/src/recommendations/toggleHelpfulVote.ts`, add the import:

```ts
import { computeRankingScore } from "../ranking.js";
```

In `toggleHelpfulVoteHandler`, after each `const updated = await store.getRecommendation(recId);` call (there are two — one in the unvote branch, one in the vote branch), add a recompute-and-write step before the `return`. For the vote (cast) branch:

```ts
  await store.createVote(recId, voterUid, weight);
  await store.applyHelpfulDelta(recId, weight, 1);
  await recomputeAuthorTrust(rec.authorId, weight, store, now);
  const updated = await store.getRecommendation(recId);
  await store.setRankingScore(
    recId,
    computeRankingScore({
      weightedHelpful: updated!.weightedHelpful,
      trustSnapshot: updated!.trustSnapshot,
      verificationMultiplier: updated!.verificationMultiplier,
      createdAt: updated!.createdAt,
      now,
    }),
  );
  return { voted: true, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
```

And the same pattern for the unvote branch (using `-existingVote.weight` path's `updated` variable):

```ts
  await store.deleteVote(recId, voterUid);
  await store.applyHelpfulDelta(recId, -existingVote.weight, -1);
  await recomputeAuthorTrust(rec.authorId, -existingVote.weight, store, now);
  const updated = await store.getRecommendation(recId);
  await store.setRankingScore(
    recId,
    computeRankingScore({
      weightedHelpful: updated!.weightedHelpful,
      trustSnapshot: updated!.trustSnapshot,
      verificationMultiplier: updated!.verificationMultiplier,
      createdAt: updated!.createdAt,
      now,
    }),
  );
  return { voted: false, weightedHelpful: updated!.weightedHelpful, helpfulVoteCount: updated!.helpfulVoteCount };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd functions && npm test -- toggleHelpfulVote.test.ts`
Expected: PASS, including the new test and all pre-existing ones in this file

- [ ] **Step 6: Run the full functions test suite to confirm nothing else broke**

Run: `cd functions && npm test`
Expected: PASS, all suites (trust, geo, createRecommendation, toggleHelpfulVote, toggleSave, ensureUserProfile, updateHomeArea, ranking)

- [ ] **Step 7: Commit**

```bash
git add functions/src/store.ts functions/src/testStore.ts functions/src/recommendations/toggleHelpfulVote.ts functions/src/recommendations/toggleHelpfulVote.test.ts
git commit -m "feat: recompute rankingScore on every helpful-vote event"
```

---

### Task 5: Sort the home feed by `rankingScore`, add the required index

**Files:**
- Modify: `src/lib/queries.ts` (`fetchFeed`'s `orderBy` clause)
- Modify: `firestore.indexes.json` (new composite index)

**Interfaces:**
- Consumes: `rankingScore` field written by Tasks 3–4
- Produces: nothing new — this is the task that makes the whole feature visible to users

- [ ] **Step 1: Change the feed query's sort field**

In `src/lib/queries.ts`, inside `fetchFeed`, change:

```ts
      where("status", "==", "live"),
      orderBy("createdAt", "desc"),
```

to:

```ts
      where("status", "==", "live"),
      orderBy("rankingScore", "desc"),
```

(This is the exact line the master doc's own audit at §21.1 item 8 flagged: *"The feed query (`fetchFeed`) sorts by `orderBy('createdAt', 'desc')` only — pure chronological order."* This one-line change is what closes that gap, now that `rankingScore` actually exists and is maintained.)

- [ ] **Step 2: Add the composite index**

In `firestore.indexes.json`, add a new entry to the `"indexes"` array (alongside the existing three `recommendations` indexes):

```json
    {
      "collectionGroup": "recommendations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "rankingScore", "order": "DESCENDING" }
      ]
    }
```

- [ ] **Step 3: Deploy the index**

Run: `firebase deploy --only firestore:indexes`
Expected: deploy succeeds; new index shows as "Building" then "Enabled" in the Firebase console (can take a few minutes on a live project — instant on the emulator)

- [ ] **Step 4: Manual end-to-end verification**

With the emulator (or dev project) running: create two recommendations for the same restaurant at different times so they'd sort differently by `createdAt` vs `rankingScore` — then cast several Helpful votes on the *older* one until its `rankingScore` exceeds the newer one's. Reload Home and confirm the older, more-voted recommendation now appears above the newer, unvoted one. This is the concrete, visible proof the ranking engine works — chronological order alone would show them in the opposite order.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts firestore.indexes.json
git commit -m "feat: sort home feed by rankingScore instead of createdAt"
```

---

### Task 6: Update the master build document's own audit trail

**Files:**
- Modify: `peoples-taste-master-build-document.md`

**Interfaces:**
- Consumes: nothing
- Produces: nothing — documentation only, but required by this doc's own established convention (see the existing v1.4 changelog line: *"✅ Done 2026-07-25 — §14 Anti-Abuse Stack basics..."*) of recording when a previously-audited gap actually ships.

- [ ] **Step 1: Update §21.1's audit table row for item 8**

Change the "Built?" cell for row "8. Ranking formula" from:
> ❌ **Not built.** No `rankingScore` field anywhere in the schema...

to:
> ✅ **Built 2026-07-30.** `rankingScore` (§11.1 formula) is computed on recommendation creation and recomputed on every helpful-vote event; `fetchFeed` now sorts by it instead of `createdAt`. Time-decay only refreshes on a vote event in this v1 — the precomputed-leaderboard scheduled rebuild (§11.4) that would also refresh decay on *un-voted* recommendations is not part of this pass; still tracked as pipeline item 2b.

- [ ] **Step 2: Update §21.5's build-order list**

Change item 2 from:
> 2. **§11.1 Ranking Engine** (`rankingScore`, time decay, feed sorted by it instead of `createdAt`) — the core "trust, not chronology" claim isn't actually true of the shipped product yet

to:
> 2. ✅ **Done 2026-07-30** — §11.1 Ranking Engine: `rankingScore` field, create + vote-event recompute, feed sorted by it. §11.4's precomputed-leaderboard scheduled rebuild (decay refresh without a new vote) remains open — see item 2b below.

Add a new item "2b" immediately after (renumbering nothing else, this is additive):
> 2b. §11.4 Precomputed leaderboards (`leaderboards/{city}_{area}_{meal}_{category}`, 6-hour scheduled rebuild) — the cost-control mechanism §11.4 describes, and the only way a recommendation's rank reflects time-decay between votes. Not started.

- [ ] **Step 3: Add a v1.7 changelog entry**

At the top of the document, after the v1.6 changelog paragraph, add:

```
**v1.7 changelog:** shipped §11.1's Ranking Engine (2026-07-30) — `rankingScore` computed on recommendation creation and recomputed on every helpful-vote event, home feed now sorted by it. Also fixed a live bug found while implementing this: `src/lib/queries.ts`'s three read queries filtered `status == "active"`, but every write path has used `status == "live"` since the schema was locked — the feed, restaurant pages, and profile pages were returning empty results until this was corrected. Per §21.5, next up is item 3 (Editor Console, D14) or item 2b (§11.4 precomputed leaderboards) — see the implementation plan at `docs/superpowers/plans/2026-07-30-ranking-engine-v1.md` for what shipped and what's still open.
```

- [ ] **Step 4: Commit**

```bash
git add peoples-taste-master-build-document.md
git commit -m "docs: record Ranking Engine v1 ship + status-filter bug fix in master doc audit trail"
```

---

## Self-review notes (per writing-plans skill)

- **Spec coverage:** every element of §11.1's locked formula (weightedHelpful, trustSnapshot/100, verificationMultiplier, `e^(−k·Δt)`, k = ln(2)/365) has a task and a test. The one thing intentionally *not* covered — §11.4's scheduled leaderboard rebuild — is called out explicitly in Task 6 rather than silently left out, and logged as pipeline item 2b below.
- **Type consistency:** `RankingScoreInputs`, `Store.setRankingScore`, and `RecommendationRecord.rankingScore` are named identically everywhere they're referenced across Tasks 2–5.
- **No placeholders:** every step has real, complete code — no "add appropriate handling" language anywhere in this plan.
