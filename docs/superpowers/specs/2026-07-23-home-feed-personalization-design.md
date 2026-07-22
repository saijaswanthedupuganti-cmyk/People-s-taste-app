# Home Feed Personalization — Design Spec

**Date:** 2026-07-23 · **Status:** Approved by owner, ready for implementation plan
**Relates to:** `peoples-taste-master-build-document.md` v1.3 — this spec pulls the Phase 4 "Taste Graph" concept (§17) forward into a lightweight Phase 1/2 form, and supersedes the `tasteSeeds[]` placeholder field (§15).

---

## 1. Vision

The owner's framing: personalization should feel like an **aroma** — present everywhere, calling attention to itself nowhere, automatically active with no configuration required. Not a "For You" tab. Not a badge. Not engagement-bait. The bar is "it feels like a friend who knows the right place," not "it maximizes time-in-app."

This directly extends existing locked principles rather than introducing new ones:
- Master doc Principle #2: trust earned, never bought — personalization must never let taste override a real trust gap.
- Master doc §11.3: "location personalizes ranking, it does not gate it" — the same rule now applies to taste.
- Master doc §4.4 voice: warm, specific, quiet confidence, no exclamation-mark inflation.

**Explicitly not building:** dark patterns, streaks-for-streaks'-sake, variable-reward manipulation, or a "people like you" collaborative-filtering layer (rejected for now — see §7).

## 2. Signal model

Four actions feed the taste profile, each tagged with what it was *about* (dish category, cuisine, meal tag, signal tags like "hidden gem"):

| Signal | Weight | Why |
|---|---|---|
| Post | Highest | Strongest possible signal — you only post about things you actually care about |
| Save | High | Deliberate, low-friction, already has a UI |
| Helpful vote given | Medium | Signals taste even before someone has posted anything themselves |
| View/impression | Low | Weakest, noisiest signal, but the richest in volume |

Stored as weighted counters, not a real ML model:

```
users/{uid}.tasteSignals: {
  [tagId]: weight   // e.g. "biryani": 12, "hidden_gem": 8, "cafe": 3
}
```

`tagId` values are the same `query_tags` vocabulary already defined in master doc §13.1 (dish, cuisine, vibe, meal) — no new taxonomy, reuse what exists.

**Decay:** same exponential decay already locked for `rankingScore` (§11.1, k = ln(2)/365). A user's taste profile should drift as their actual taste drifts, not stay frozen from month one.

**This replaces `tasteSeeds[]`** (§15's placeholder field) rather than sitting alongside it — one mechanism, not two.

## 3. Ranking integration

The shared `rankingScore` (§11.1: trust × verification × votes × time-decay) is **not modified**. It stays the objective backbone every user sees roughly the same version of.

Personalization is a **second, per-user pass** applied after the base feed is assembled:

```
personalizedScore = rankingScore × (1 + tasteBoost)

tasteBoost = min(0.4, Σ matching tasteSignal weights, normalized 0–1) × 0.4
```

- Cap at +40% — enough to meaningfully reorder near-ties, not enough to let a low-trust post about someone's favorite dish outrank a highly-trusted, well-verified one. Exact cap is a tunable constant, not hardcoded logic — expect to adjust after real beta usage (same "don't over-fit with 20 users" caution already applied to the v2 ranking formula, §11.2).
- Computed client-side or in a lightweight Cloud Function call at feed-fetch time — not precomputed into the leaderboard docs themselves, since it's per-user and the leaderboards (§11.4) are shared/global by design. This keeps the Iron Cache Rule and leaderboard cost model (§11.4, §16) completely untouched.
- **No signals yet (new user, taste-picker skipped):** `tasteBoost = 0` for everyone — falls back to exactly today's area/meal feed, unchanged.

## 4. Cold start — onboarding taste-picker

A skippable step added to the Auth/onboarding flow (§8.1 screen 10): 4-6 cuisine/vibe chips (e.g. Biryani, Street Food, Café, Hidden Gems, Dessert, Late Night), tap to select any number, zero mandatory (Principle #4 — never a gate). Selections seed `tasteSignals` with a small starting weight, same tagId vocabulary as everywhere else.

Skip → `tasteSignals` starts empty → §3's fallback applies → user sees exactly the current area/meal feed. No degraded experience for skipping, just no head start.

## 5. Ambient UI treatment

No "Personalized" label, no badge, no separate section.

On feed cards where `tasteBoost` crosses a meaningful threshold (proposed: top signal contributes >60% of that item's boost — i.e. a genuinely strong, legible match, not a diffuse blend of five weak signals), and **capped to roughly 1-in-5 visible cards** even when more would qualify, show one quiet line under the card in the existing voice (§4.4):

> "You've been on a biryani streak lately."

Never mention the mechanism ("our algorithm thinks..."), never use urgency or emoji, never appear on every card. The 1-in-5 cap exists specifically so this reads as an occasional, honest observation — not surveillance.

## 6. Desktop layout

Same single feed (no rows, no tabs — decided against in favor of the ambient single-stream approach). Responsive CSS grid, not masonry:

| Breakpoint | Columns |
|---|---|
| < 768px | 1 |
| 768px – 1279px | 2 |
| ≥ 1280px | 3 |

Cards keep natural height per column (no packing algorithm) — the resulting small gaps are an acceptable, much lower-risk trade than fighting true masonry layout.

## 7. Explicitly deferred: collaborative ("people like you") signals

Considered and rejected for this pass. At 20–50 beta users, similarity clusters would be too small to be anything but noise — the risk of a wrong "people like you" suggestion outweighs the benefit at this density. Revisit once there's real usage data to cluster against (natural fit for the existing Phase 4 Taste Graph deferral, §17).

## 8. Data flow & error handling

- `tasteSignals` is server-writable only via Cloud Function (same rule as `trustScore`, §19: "all score/trust/aggregate fields writable only by Cloud Functions; Rules deny client writes").
- Triggered on: recommendation created, save created, helpful vote cast, view event logged (batched, not per-scroll-frame — debounced client-side before it reaches the Function, to avoid write-amplification blowing up Firestore costs the same way §16's Iron Cache Rule guards against for Places calls).
- If the personalization Cloud Function call fails or times out at feed-fetch time: **feed loads with `tasteBoost = 0` for that request, silently** — personalization is additive, its failure must never block or error the feed (same "personalizes, doesn't gate" rule as §11.3 location and §13.2 preferences).

## 9. Privacy addition to §19

New line for master doc §19 Privacy: view/impression signals feed only the viewing user's own `tasteSignals` — never exposed to any other user, never used for anything beyond that user's own feed ordering, cascade-deleted on account deletion same as everything else in §19.

## 10. Open items for the implementation plan

- Exact numeric constants (`tasteBoost` cap, "strong match" threshold, 1-in-5 display cap, view-signal debounce window) are proposed defaults, not locked — tune during Phase 1/2 build against real behavior, not guessed in advance.
- View/impression tracking needs its own small technical design (what counts as a "view" — card enters viewport? dwell time threshold?) — left for the implementation plan, not this spec.
