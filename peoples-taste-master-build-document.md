# PEOPLE'S TASTE — MASTER BUILD DOCUMENT
**Version 1.2 · July 2026 · Owner: Sai Jaswanth Edupuganti**
**Status: Foundation document. Every line is editable by the owner. Claude Code must treat this as the single source of truth.**

**v1.1 changelog:** merged four items from the earlier `Peoples_Taste_Product_Blueprint_v0.1` draft that hadn't made it into v1.0 — Community Places (§5.1), follow-based feed composition (§11.6), per-recommendation feedback loop (§11.7), and the Restaurant Owner role (§7, §7.2). Schema updated to match (§15).

**v1.2 changelog:** merged six concrete findings from external research (trust-algorithm literature, anti-fraud case studies, competitor teardown, Firestore-at-scale data) — corrected the time-decay constant to an internally consistent value (§11.1), added a trust-velocity anti-farming rule (§9.3), added an impossible-travel abuse check (§14), added two 2026 competitors to the positioning table (§2), documented the Postgres+pgvector migration trigger (§16.1), and flagged the confidence/sample-size gap in the v1 ranking formula as a named consideration for v2 (§11.2). Everything else from that research (market benchmarks, UX teardown detail) was read and is *consistent with* existing decisions, not additive — noted inline where relevant, not expanded into new sections.

---

## HOW TO USE THIS DOCUMENT (Instructions to Claude Code)

1. This document defines WHAT to build and WHY. Do not invent features not listed here.
2. Build in the phase order defined in §17. Do not skip ahead.
3. When a decision is marked `[OWNER-DECIDES]`, stop and ask before implementing.
4. When something is marked `[DEFERRED]`, create the data fields for it but do NOT build the feature.
5. Web-first. Everything runs on localhost during development. Mobile app is a future phase — but every architectural decision must not block it.
6. Code quality standard: production-grade, not prototype-grade. Typed, componentized, commented where logic is non-obvious.
7. All ranking, trust, and anti-abuse logic must live server-side (Cloud Functions), never client-side.

---

# PART 1 — PRODUCT FOUNDATION

## 1. Vision Statement

People's Taste is a **trust-based food discovery engine**.

It answers one question better than anyone else:

> "I'm craving [dish] right now, at [this time], in [this place] — whose recommendation do I trust?"

It is NOT:
- Another restaurant review app (Google/Zomato already do that)
- A delivery app
- A star-rating aggregator

The core mental model:

```
Recommendation → Dish → Restaurant → Area → City
        ↓
      Trust
        ↓
      Taste (long-term)
```

Every recommendation answers: **"Who recommended what, where, when — and why should I trust them?"**

## 2. Positioning

| Platform | What it optimizes | What we do differently |
|---|---|---|
| Google Maps | Proximity + star average | We rank by trusted human recommendations, dish-level |
| Zomato | Delivery + listings | We are discovery-only, no delivery conflict of interest |
| Beli | Friend graph + pairwise ranking | We use trust weighting, no forced social onboarding |
| Instagram | Beautiful content | We attach content to a structured, queryable taste database |
| Trusted Tastes (2026) | Friend-graph-first food discovery, contact sync | We don't require a social graph to be useful on day one — trust comes from verification + community track record, not who you already know |
| MustTaste (2026) | Generic food discovery, no published trust mechanism | We're structurally trust-weighted, not a ratings reskin |

**Market timing signal (for pitch use):** AI-assisted local discovery usage grew from 6% to 45% of consumers in one year (BrightLocal 2026 survey). People increasingly expect context-rich, personalized answers — not filter walls.

## 3. Core Product Principles (Non-negotiable)

1. **Recommendation is the atomic unit.** Not the restaurant. Not the review. Not the post.
2. **Trust is earned, never bought.** No follower-count privileges. No paid ranking boosts inside the organic ranking engine — ever. If sponsored placements are added later, they are visually separated and labeled.
3. **Never show "0 results."** Every empty state falls back through the ladder in §12.
4. **Low-friction contribution.** Never block core value behind social invites, long onboarding, or mandatory verification. (Documented Beli failure: forced 4-friend invite before use → abandonment.)
5. **Time-context by default.** The app knows it is 8 PM and opens on Dinner. The user can always override.
6. **Location personalizes ranking, it does not gate it.** GPS-on-open only. No background tracking. Manual area selection is always available as a fallback.
7. **Specialists are not penalized.** A person who only posts about biryani is a biryani authority, not a low-diversity account. Diversity is a bonus toward broader status tiers only — never a trust penalty.

---

# PART 2 — BRAND & DESIGN FOUNDATION

## 4. Brand Identity

### 4.1 Name
Working name: **People's Taste**. Domain already owned by owner. `[OWNER-DECIDES]` final wordmark treatment.

### 4.2 Color Psychology & Palette

Requirement from owner: an orange-family identity — warm, appetite-positive, psychologically pleasant — but **clearly distinct from Swiggy orange (#FC8019) and Zomato red (#E23744)**.

Rationale: Orange is the strongest appetite-stimulating hue family (warmth, energy, sociability). The differentiation strategy is to move away from Swiggy's bright saturated "delivery orange" toward a **deeper, earthier, premium warm tone** — closer to spice, terracotta, and roasted food tones. This signals "authentic local food culture," not "fast delivery."

**Primary palette (proposed — owner may adjust every value):**

| Token | Hex | Usage | Psychology |
|---|---|---|---|
| `--pt-primary` | `#D9541E` (Roasted Terracotta) | Primary actions, brand mark | Warm, appetizing, earthy — spice-market feel, not delivery-app feel |
| `--pt-primary-deep` | `#A63A10` | Hover/pressed states, emphasis | Depth, trust, groundedness |
| `--pt-accent` | `#F2A03D` (Turmeric Amber) | Highlights, badges, "Editor's Pick" | Optimism, discovery, golden-hour food photography |
| `--pt-ink` | `#231A15` (Warm Charcoal) | Primary text | Softer than pure black; keeps warmth |
| `--pt-surface` | `#FDF8F3` (Warm Cream) | Backgrounds | Appetite-friendly; avoids clinical white |
| `--pt-surface-2` | `#F6EDE3` | Cards, secondary surfaces | Layering without borders |
| `--pt-trust` | `#2E7D5B` (Verified Green) | Verification badges only | Reserved exclusively for trust signals — never decorative |
| `--pt-danger` | `#C0392B` | Errors, "Overrated" tag | Used sparingly |

**Rules:**
- Trust green (`--pt-trust`) appears ONLY on verification and trust UI. This trains users that green = verified. Never use it decoratively.
- No gradients on trust elements. Trust UI is flat, plain, boring on purpose — boring reads as honest.
- Food photography is the hero; brand color frames it, never competes with it.

### 4.3 Typography (proposed)
- Display / headers: a warm humanist sans (e.g., **Bricolage Grotesque** or **General Sans**) — distinct from Swiggy/Zomato's geometric sans.
- Body: **Inter** — legibility at small sizes for dense recommendation cards.
- Numerals in trust scores: tabular figures.
`[OWNER-DECIDES]` final typeface pairing.

### 4.4 Voice & Tone
- Warm, local, specific. "Still the best chai in Hyderabad" — not "Great ambience, must visit!!"
- Editorial content signed as **Editor's Pick** — transparent, never disguised as community content.
- No exclamation-mark inflation. Confidence is quiet.

---

# PART 3 — OBJECT MODEL & INFORMATION ARCHITECTURE

## 5. The Atomic Unit: Recommendation

A **Recommendation** is one person vouching for one specific thing at one place.

```
Recommendation {
  author        → who
  restaurant    → where
  dish          → what (nullable: can recommend the *place* itself, e.g. "family dining experience")
  mealTags[]    → when (breakfast/lunch/dinner/late-night/café/dessert/drinks/brunch)
  signalTags[]  → why (hidden-gem / worth-traveling-for / best-value / would-return / overrated ...)
  caption       → the human voice ("Order medium spice. Avoid weekends.")
  verification  → how much we can trust that this visit happened
  trustSnapshot → author's trust score frozen at publish time
}
```

**Why this model wins:** one restaurant with 50 recommendations automatically yields — Best Dish, Best Lunch Dish, Most Trusted Dish, Hidden Gem, Best Value — through aggregation. None of these are manually stored features. They emerge.

**Aggregation hierarchy:** `Recommendation → Dish → Restaurant → Area → City`.

## 5.1 Community Places (non-Google restaurants)

Not every place worth recommending is on Google Maps — food trucks, home kitchens, unlisted stalls. A restaurant doc does not require a `googlePlaceId`.

- **Creation:** if restaurant autocomplete (screen 5, Post a Recommendation) returns no match, the user can add a place manually — name + pinned GPS location (device location at time of add, adjustable on a mini-map). No address form, no category picklist required to post; those can be filled in later.
- **Dedupe-before-create:** before a new community place is saved, check for existing restaurants (Google-sourced or community) within ~150m with a similar name (fuzzy match). Surface candidates: "Did you mean [X]?" before allowing creation — mirrors the Place-ID dedupe rule for Google places (E5).
- **Merge:** an Editor can merge a community place into another restaurant doc (community-into-community, or community-into-Google once it later appears on Google Places) — same merge tooling as Google dedupe, recommendations re-point to the surviving `restaurantId`.
- **Trust implication:** community places carry no `placeCache` (no Google data to cache). Everything shown on that restaurant's profile is 100% community-sourced — labeled as such, not hidden.
- Status: **MVP** (v0.1 blueprint listed this as core, not deferred) — build alongside the Post flow in Phase 1, not Phase 0.

## 6. Primary Rating Signal (MVP)

**No 1–5 star ratings.** MVP uses a near-binary primary signal plus expressive tags:

- Primary signal (required, pick one): `👍 Recommend` | `🔥 Must-Try`
- Signal tags (optional, multi-select, metadata only in MVP — NOT ranking inputs yet):
  `Hidden Gem · Worth Traveling For · Would Return · Best Value · Late-Night Favorite · Family-Friendly · Solo-Friendly · Overrated`

`Overrated` is the only negative signal. It never appears on a recommendation the user creates — it is a reaction other users can attach to an existing recommendation/venue. `[DEFERRED]` weighting tags into ranking (v2, once data shows which tags correlate with saves).

## 7. User Roles

| Role | Can do |
|---|---|
| **Visitor** (no account) | Browse, search, view everything. Cannot save, vote, or post. |
| **Member** | Post recommendations, vote Helpful, save, follow, check in ("I'm Here") |
| **Tastemaker** (verified blogger) | Everything above + profile badge + featured in area rankings + can propose new restaurants directly to the live database |
| **Restaurant Owner** (claimed listing) `[Phase 2/DEFERRED]` | A Member/Tastemaker's normal account, plus: edit their claimed restaurant's menu and basic info (hours, phone, description). Cannot edit, hide, or reorder community recommendations. Cannot touch trust scores or ranking. Ownership is an info-management layer, never a ranking lever. |
| **Editor** (owner/admin) | Seed content, publish Editor's Picks, approve Tastemaker applications, moderate |

### 7.1 Tastemaker Promotion Path (locked decision)
Hybrid model — automated threshold, then manual gate:
1. Auto-unlock "Apply for Tastemaker" button at: **30 recommendations + 10 original photos + trust score ≥ 0.7 (70/100)**
2. Owner manually reviews application (photo quality, writing quality, locality coverage, spam signals)
3. Approve/reject with reason
This removes 99% of manual review burden while protecting the tier's prestige.

### 7.2 Restaurant Owner Claim Path `[Phase 2/DEFERRED — do not build in Phase 0/1, but reserve the schema fields]`

1. Owner finds their restaurant's profile page → "Claim this listing" → verifies via a method TBD `[OWNER-DECIDES: phone match to Google Business listing / document upload / small deposit-refund]`.
2. Editor manually approves (same review queue pattern as Tastemaker applications).
3. Approved claim sets `restaurants/{id}.claimedBy = uid`. The owner can then edit `menu` and non-ranking `placeCache`-adjacent fields on their own restaurant doc only. Security Rules must scope this narrowly: owner writes are allowed only on an explicit owner-editable field allowlist, never on `aggregates`, `recCount`, or anything ranking-adjacent.

## 8. Information Architecture (Web MVP)

Two entry states, mirroring intent:

```
STATE A — "Feed me now" (default, location granted)
  Home = auto-detected [Area] × [current meal window] ranked recommendations
  → Recommendation card → Restaurant profile → Map

STATE B — "I'm exploring" (location denied, or planning)
  Home = manual City → Area selection (fallback of original prototype flow)
  → same downstream screens
```

### 8.1 Screen Map (Web MVP — 12 screens)

1. **Landing / Home Feed** — meal-window-aware ranked recommendation feed for current/selected area; filter chips row
2. **Search & Results** — keyword search over `query_tags` + chip refinement (§13)
3. **Recommendation Detail** — full card: dish, photos, caption, author trust tier, verification badge, Helpful/Save, map link
4. **Restaurant Profile** — aggregated view: emergent Best Dish / Best per Meal / all recommendations; Google Maps embed; cached Place data
5. **Post a Recommendation** — restaurant autocomplete (Places) → no match? "Add this place manually" (§5.1 Community Places) → dish → meal tags → primary signal → signal tags → caption → photo; EXIF-timestamp pre-selects meal tag
6. **"I'm Here" Check-in** — one-tap verified visit; evening reminder → "How was it?" completion prompt `[Phase 2]`
7. **Profile (own)** — recommendations, saves, trust tier (label only, never raw number), progress to next tier
8. **Profile (public)** — author's recommendations, tier badge, areas covered
9. **Tastemaker Application** — appears only after threshold unlock
10. **Auth** — Google OAuth + phone. No anonymous accounts. Onboarding ≤ 2 screens, ZERO mandatory preference questions, ZERO friend-invite gates
11. **Editor Console** (admin-only route) — seed restaurants, publish Editor's Picks, review applications, moderation queue
12. **Static** — About, Contact, Privacy (location-permission explanation lives here)

### 8.2 Navigation Rules
- Bottom/side nav: Home · Search · Post (+) · Saved · Profile
- Selected vs unselected nav states must be unmistakable (documented Beli failure)
- Public profiles reachable directly from every recommendation card — never buried behind feed/leaderboard only

---

# PART 4 — TRUST, RANKING & INTEGRITY ENGINES

## 9. Trust Engine

### 9.1 Trust Score (0–100, server-side only, never displayed as a number)

Every user starts at **10** (unproven, not distrusted).

**MVP formula (Phase 1 — deliberately simple):**

```
trust = 10 (base after verified signup: phone or Google OAuth)
      + accountAgeFactor        (up to +10: scales over 365 days)
      + consistencyFactor       (up to +15: steady posting cadence; bimodal/burst posting = 0)
      + helpfulReceivedFactor   (up to +30: weighted Helpful votes received)
      + verificationFactor      (up to +25: share of recommendations at Level 2/3 verification)
      + communityFactor         (up to +10: follows/saves/references received)
      − penalties               (velocity violations, geo-mismatch flags, removed content)
```

**Explicitly excluded from trust: content diversity.** (Principle #7 — specialists are authorities.) Diversity contributes only to the *Area Expert → City Expert* tier progression, never to the score.

**Displayed as tiers, never numbers:**

```
Explorer → Local Foodie → Verified Foodie → Neighborhood Expert → City Expert → Legend
```

| Tier | Unlock |
|---|---|
| Explorer | Post, vote, save |
| Local Foodie | Collections/lists |
| Verified Foodie | Profile badge |
| Neighborhood Expert | Featured in area rankings |
| City Expert | Priority placement in search |
| Legend | Early features, invites, premium analytics `[DEFERRED]` |

### 9.2 trustSnapshot
Every recommendation stores the author's trust at publish time. Rankings stay stable even if the author's reputation later changes. Recalculation of old snapshots: never (except on fraud takedown).

### 9.3 Trust Velocity Check (anti "slow-burn" farming)

Documented attack pattern on trust-weighted platforms: an account posts genuinely, patiently, for weeks or months to earn trust, then "goes bad" — sells its now-high-weight votes to a paid promotion ring. A pure trust score can't distinguish earned-slowly from earned-just-fast-enough-to-still-look-organic, so add a rate check on the trust *curve*, not just its current value:

- If an account's trust score climbs two tiers within 30 days, its votes are weighted at ×0.5 for the following 60 days (does not affect the account's own tier display or ability to post — only how much its *votes* count toward other people's ranking scores).
- This is a Cloud-Function-computed flag (`penalties`-adjacent, not a new penalty category — doesn't need a user-facing message; silent per the existing anti-shaming principle, §10).
- Legitimate fast risers (a genuine local expert who joins and is very active) are only temporarily discounted, never blocked or demoted — false positives cost nothing but a 60-day vote-weight dip.

## 10. Verification Levels (locked decision — weighted, never gatekept)

| Level | Evidence | Weight multiplier |
|---|---|---|
| L1 — Claimed | "I've eaten here." No proof. | ×1.0 |
| L2 — GPS | Device location near venue at post time | ×1.3 |
| L3 — GPS + original photo (EXIF) | | ×1.7 |
| L3+ — Receipt upload (optional) | | ×2.0 |

- L1 posts are always allowed (people recommend from memory — that is normal, not suspicious).
- Geo-mismatch (claims Hyderabad venue, GPS in another country): post is **not blocked** — it is marked internally `unverified` and its visibility weight is suppressed. Silent, no user shaming.
- **"I'm Here" check-in:** one tap at the venue creates a Verified Visit with no content demand. Same evening, a prompt asks "How was it?" → dramatically higher completion than point-of-sale review nagging. `[Phase 2]`

## 11. Ranking Engine

### 11.1 MVP formula (Phase 1 — locked)

```
rankingScore = (weightedHelpful × trustSnapshot/100 × verificationMultiplier) × e^(−k·Δt)
```

- `weightedHelpful` = Σ(each Helpful vote × voter's trust/100). 100 fake new accounts (0.10–0.15 weight each) cannot outrank 20 trusted users (0.7–0.9 each). **Never count raw likes.**
- Time decay `e^(−k·Δt)`, **k = ln(2)/365 ≈ 0.0019/day** (a 365-day half-life — corrected in v1.2; the original narrative curve wasn't a real exponential fit). Actual curve at this k: 7 days ≈ 99% · 30 days ≈ 94% · 90 days ≈ 84% · 180 days ≈ 71% · 365 days = 50% exactly. Deliberately slower than content-feed platforms (Reddit/HN half-life is ~10–12 *hours*, not days) — a great biryani recommendation shouldn't fade like a news post; product principle "timeless classics stay visible" wins over feed-freshness norms here.
- Recomputed by Cloud Function on every vote event, written to the recommendation doc.

### 11.2 v2 formula `[DEFERRED — do not build in Phase 1]`
`40% trust + 30% weighted votes + 15% saves + 10% freshness + 5% comments` — adopt only after real usage data exists to tune five weights against. Tuning five weights with 20 users is guesswork.

**Known gap in v1, to address when v2 is designed:** the v1 formula has no confidence/sample-size term. Mature ranking systems (Wilson score interval on Reddit, Bayesian averaging on IMDb) explicitly shrink small-sample items toward a prior so one early enthusiastic vote can't look as strong as broad, sustained agreement. `weightedHelpful` being a plain sum means more votes always help — it does not have Wilson's specific failure mode (ratio-based systems where 1/1 looks like 100%), but it also means a brand-new rec from a very-high-trust author can rank on par with a well-established one purely on trust multiplier, before the community has weighed in at all. Deliberately not fixed in v1 (same reasoning as the paragraph above — five-weight tuning needs real usage data); flag it here so it isn't rediscovered as a surprise later.

### 11.3 Location personalization (locked decision)
- GPS captured **on app open / on search only.** No continuous background tracking. No movement-pattern learning `[DEFERRED indefinitely]`.
- Within a comparison bucket, proximity acts as a final-stage ranking weight: closer, equally-trusted recommendations rank higher. Proximity never outranks a large trust gap.
- Location denied → State B (manual area selection). Full functionality preserved.
- Permission prompt copy must state plainly: "We use your location once, when you open the app, to show what's genuinely near you. We never track you in the background."

### 11.4 Precomputed leaderboards
```
leaderboards/{city}_{area}_{mealTag}_{dishCategory} → Top100 recommendation IDs + snapshot fields
```
Home feed reads ONE precomputed document, not a live sort of thousands. Rebuilt by scheduled Cloud Function (every 6h) + incremental update on vote events. This is the primary Firestore cost-control mechanism.

### 11.5 Comparison buckets
`bucketId = {city}|{area}|{mealTag}|{budgetBand}` — any future pairwise comparison feature `[DEFERRED]` operates ONLY inside a bucket. Never compare a luxury dinner against a chai stall (documented Beli "wonky comparison" failure).

## 11.6 Feed Composition & Follow Priority (locked decision)

The home feed (screen 1) stays a **single precomputed leaderboard read** (§11.4) as the base layer — that's the cost-control mechanism and it does not change. Follow is layered on top, not a replacement:

```
Home feed assembly, in order, de-duplicated, capped to feed page size:
  1. Recent recommendations from Followed Trusted Foodies (own area/city first)
  2. Recent recommendations from other Followed accounts (any tier), own area/city
  3. Nearby Trusted Foodies' recent recommendations (not followed) — discovery surface
  4. Trending dishes — the precomputed leaderboard read (§11.4), unchanged
  5. Nearby restaurants with few/no recommendations yet
  6. Community places (§5.1) nearby, honestly labeled "Not yet many recommendations"
```

- Layer 1–2 is a cheap indexed query (`recommendations` where `authorId in following[]`, limit ~50, most-recent-first) — small because a user follows few people, not expensive at any scale.
- Layers 3–6 are exactly the existing leaderboard + empty-state ladder (§12) — unchanged, still Cloud-Function-maintained.
- A user who follows nobody yet sees layers 3–6 only — i.e. today's MVP behavior. Follow is additive, never required (Principle #4, low-friction contribution).
- `users/{uid}` needs a queryable "who does this user follow" source for layer 1–2 — see schema update in §15.

## 11.7 Recommendation Feedback Loop `[Phase 2 — ships alongside "I'm Here" check-ins, §10]`

Extends the existing check-in flow (§10): if a check-in was reached **via a specific recommendation** (the user tapped "I'm Here" from that recommendation's detail screen, or the Post/visit was deep-linked from it), the evening "How was it?" prompt (§10) also asks: *"Did [author]'s recommendation meet your expectations?"*

- **Positive:** no ranking change. Absence of negative signal is itself the reward — do not inflate `rankingScore` on positive feedback (avoids reintroducing a disguised star-rating).
- **Negative, repeated:** each recommendation accumulates a small `feedbackAdjustment` (function-maintained, bounded, floor at −0.3× its own weight — can suppress, never zero out or hide). Feeds into `rankingScore` (§11.1) as an additional multiplicative term. A single negative report does nothing; the signal only moves after a small cluster of independent negative reports (anti-brigading, same principle as geo-mismatch suppression — silent, never shaming, never blocking the post).
- After N negative reports (threshold TBD `[OWNER-DECIDES]`), the recommendation enters the Editor moderation queue (`reports/{reportId}`) for a human look — it is never auto-removed.
- This is distinct from the `Overrated` signal tag (§6), which is a voluntary reaction anyone can attach; this is feedback specifically from someone who followed that exact recommendation to the venue.

## 12. Empty-State Ladder (locked — "0 results" is forbidden)

On any empty query result, fall through in order, each layer labeled honestly:

1. Same area, adjacent meal tag
2. Nearby areas (same city), labeled "Nearby: Banjara Hills"
3. Whole city
4. **Editor's Picks** for the category
5. Raw Google Places results, clearly labeled **"Not yet community ranked"**
6. Contribution prompt: **"Be the first foodie to put [area] on the map"** → deep-links to Post flow (Google autocomplete or, if absent there too, straight to Community Place creation, §5.1)

## 13. Search & Discovery (locked — structured-first)

- **Primary:** filter chips + keyword search against `query_tags` array. Chip groups: Meal · Cuisine · Budget (₹ bands) · Vibe · Constraints (veg, parking, quiet…)
- Keyword search: Firestore `array-contains` for MVP; Algolia/Typesense `[Phase 3]` when tag search feels limiting.
- **Optional NL layer `[Phase 3]`:** a single lightweight LLM call converts a typed sentence ("best biryani for dinner with friends under ₹1000") into chips — it only *fills the same structured slots*, never performs open retrieval. Low parse confidence → show clarification chips, never guess.
- Auto-context on open: 7 AM → Breakfast · 1 PM → Lunch · 8 PM → Dinner · 11 PM → Late Night (user can always override; window boundaries configurable in one constants file).

### 13.1 query_tags taxonomy (every recommendation generates these at write time)
```
geography:  city, area, micro_area           → "hyderabad", "jubilee_hills"
compound:   {city}_{mealTag}                 → "hyderabad_dinner"
dish:       dish + category                  → "biryani", "chicken_biryani"
occasion:   date, friends, family, solo, work_lunch
budget:     budget, mid_budget, premium
vibe:       hidden_gem, aesthetic, lively, quiet, authentic
constraint: veg, parking, late_night, no_wait
```

## 14. Anti-Abuse Stack (all server-side, Phase 1 — non-negotiable)

1. **Firebase App Check** — on from day one; kills scripted/bot writes.
2. **Auth policy** — phone or Google OAuth only. No anonymous accounts.
3. **Velocity limits (Firestore Rules + Cloud Functions):** max 5 recommendations/hour · 30 Helpful votes/minute · 100 follows/day. Violations: write rejected + trust penalty logged.
4. **One vote per user per recommendation** — vote doc ID = voter UID (structurally impossible to double-vote).
5. **Geo-mismatch suppression** — flag, suppress weight, never block (§10).
6. **Device fingerprint** — store deviceId/OS/appVersion per account; many accounts on one device → review queue.
7. **Trust-weighted everything** — the ranking math itself is the last line of defense (§11.1).
8. **Impossible-travel check** — if the same account posts verified (L2+) recommendations in two locations farther apart than plausible travel time allows (e.g. Secunderabad and Banjara Hills within minutes), flag for review. Same silent, non-blocking treatment as geo-mismatch (§10) — never accuse, just suppress weight and queue.
9. **Trust velocity check** — see §9.3. Distinct from raw account age: catches fast-but-plausible-looking trust farming, not just brand-new accounts.

**Known platform limitation, not a gap to silently paper over:** proper GPS-spoof detection (Wi-Fi/Bluetooth beacon correlation, sensor-fusion movement checks) requires native mobile APIs the web platform doesn't expose. Web MVP can only do distance-based geo-mismatch (§10) and impossible-travel (above) — both good signals, neither as strong as what a native app could do. Revisit when the `[DEFERRED]` mobile app phase happens (§17 Phase 4).

Evidence this is not optional: Yelp closed 551,200 accounts and flagged ~550 businesses for review manipulation in a single year. Integrity is a launch feature, not a growth feature.

---

# PART 5 — DATA & PLATFORM

## 15. Firestore Schema (locked for Phase 1)

```
users/{uid}
  username, displayName, photoURL
  city, homeArea
  trustScore            // float 0–100, server-writable only
  tier                  // "explorer" … "legend"
  counts: { recommendations, verifiedVisits, helpfulReceived, followers, following }
  deviceFingerprints[]  
  createdAt
  tasteSeeds[]          // [DEFERRED consumption] passively accumulated cuisine/vibe tags
                        // from posts & saves — fuels future Taste Graph. Write from day one.

follows/{followerUid}_{followeeUid}   // doc ID pattern mirrors saves/votes — structurally one-follow-per-pair
  followerUid, followeeUid, createdAt
  // powers §11.6 feed layer 1–2: query where followerUid == me, or use as a denormalized
  // followingIds[] array on users/{uid} if reads outnumber writes enough to justify it — [OWNER-DECIDES at Phase 1 build time]

restaurants/{restaurantId}          // cache-first: Google data enters ONCE (Google-sourced) OR community-created (§5.1)
  name, googlePlaceId               // null for community places
  source                            // "google" | "community"
  createdBy                         // uid, community places only
  claimedBy                         // uid | null — §7.2 Restaurant Owner claim
  ownerClaimStatus                  // "none" | "pending" | "approved" — [Phase 2/DEFERRED]
  location (GeoPoint), city, area, address
  categories[], priceBand
  menu[]                            // owner-editable once claimed — [Phase 2/DEFERRED]
  placeCache: { hours, phone, photos[], fetchedAt }   // refreshed max 1×/30 days — Google-sourced only, absent on community places
  aggregates: { recCount, topDishId, topPerMeal{}, hiddenGemScore }  // Cloud Function-maintained

dishes/{dishId}
  restaurantId, name, category      // "chicken_biryani" → "biryani"
  aggregates: { recCount, avgWeightedScore }

recommendations/{recId}             // THE ATOMIC UNIT
  authorId
  restaurantId, dishId              // dishId nullable (venue-level recommendation)
  primarySignal                     // "recommend" | "must_try"
  signalTags[], mealTags[]
  caption, photos[]
  verificationLevel                 // 1 | 2 | 3 | 4
  verificationMultiplier            // 1.0 | 1.3 | 1.7 | 2.0
  trustSnapshot                     // author trust frozen at publish
  weightedHelpful                   // Σ voter-weighted votes (function-maintained)
  feedbackAdjustment                // §11.7, function-maintained, default 0, floor −0.3× own weight — [Phase 2/DEFERRED]
  rankingScore                      // §11.1 output, now also folds in feedbackAdjustment (function-maintained)
  query_tags[]                      // §13.1, generated at write
  bucketId                          // {city}|{area}|{meal}|{budget}
  geoAtPost (GeoPoint, private), exifTimestamp
  status                            // "live" | "suppressed" | "removed"
  createdAt

recommendations/{recId}/votes/{voterUid}   // doc ID = UID → one vote enforced
  weight, createdAt

saves/{uid}_{recId}
checkins/{checkinId}                // [Phase 2] uid, restaurantId, geo, ts, followedUp
  viaRecommendationId               // nullable — §11.7, set when check-in was reached from a specific recommendation
  visitFeedback                     // "positive" | "negative" | null — §11.7, set by evening prompt
editorsPicks/{pickId}               // title, area, dishCategory, recIds[], publishedAt
leaderboards/{city}_{area}_{meal}_{category}
  entries[]: { recId, rankingScore, restaurantName, dishName, authorTier, photo }
  rebuiltAt

applications/{uid}                  // Tastemaker queue: status, reviewNotes
reports/{reportId}                  // moderation queue
```

**Schema principles:** denormalize for reads (feed = 1 leaderboard read) · snapshot volatile values (trust) at write · all scores server-writable only via Security Rules · every `[DEFERRED]` feature already has its fields so no future migration.

## 16. Google Maps Platform Integration (locked cost rules)

**APIs:** Places Autocomplete (session tokens, mandatory) · Place Details (field-masked, minimum fields) · Maps JavaScript SDK (restaurant profile embed) · Geocoding (rare; area→coords during seeding).

**The Iron Cache Rule:** Google is pinged exactly once per restaurant — at first tag/seed. Every subsequent view reads `restaurants/{id}.placeCache` from Firestore. Refresh at most once per 30 days via scheduled function. The expensive failure mode is letting search/card-render/detail views hit Places live.

**Budget reality:** $200/month free credit ≈ ~28k Places calls. With the Iron Cache Rule, 1,000–5,000 users fit inside free tier. Hard quotas + billing alerts set per-API in Cloud Console before launch.

**Tech stack (web MVP):** React + Vite · Tailwind (tokens from §4.2 as CSS variables) · Firebase Auth / Firestore / Storage / Cloud Functions / App Check (backend only) · **Hosting: Vercel, not Firebase Hosting** — owner's existing Vercel account + private domain (locked v1.2; Firebase Hosting site still exists as a fallback/unused). `firebase.json`'s `hosting` block should stay absent/unused; deploys go through Vercel's GitHub integration.

### 16.1 Data platform migration trigger `[DEFERRED — do not build, just know the exit condition]`
Firestore is the right call through the beta and the low-thousands-of-users stage — real-time listeners and zero schema migration outweigh its per-read cost at this size. The exit condition, per research into comparable platforms: once "similar dishes" search, multi-condition ranking queries (e.g. "top biryani in Jubilee Hills filtered by trust tier and price"), or genuine vector-similarity features are needed, Postgres+pgvector becomes meaningfully cheaper and more capable than layering Algolia/Meilisearch on top of Firestore. Don't pre-migrate — this is a ~10k-user-and-up decision, not a Phase 0–3 one.

---

# PART 6 — LAUNCH STRATEGY & ROADMAP

## 17. Phased Roadmap

### Phase 0 — Foundation (Weeks 1–2)
Repo, Firebase project, App Check, Auth (Google + phone), design tokens, schema deployed, Security Rules v1 (velocity + server-only scores), Editor Console skeleton.
**Exit criteria:** owner can log in, seed a restaurant via Places autocomplete, and see it cached in Firestore on localhost.

### Phase 1 — Core Loop (Weeks 3–6)
Post flow (EXIF meal pre-select, L1/L2/L3 verification capture) · Recommendation cards + Home feed off leaderboards · Helpful/Save with weighted votes · Ranking Cloud Function · Restaurant profile with emergent aggregates · Empty-state ladder · Search chips.
**Exit criteria:** the full loop — post → vote → re-rank → discover — works end-to-end on localhost with test accounts; fake-account votes demonstrably cannot outrank trusted votes.

### Phase 2 — Trust Visible (Weeks 7–9)
Tier system + badges · Tastemaker threshold + application + Editor review · "I'm Here" check-in + evening follow-up · public profiles · moderation queue.

### Phase 3 — Seed & Soft Launch (Weeks 10–12)
**Launch scope: ONE district. `[OWNER-DECIDES: Jubilee Hills / Banjara Hills / Madhapur / Hitech City]`**
- Owner + editors seed **300 restaurants, 800 recommendations**, honestly badged Editor's Picks (they sink beneath community content as real usage grows)
- Closed beta: **20–50 invited local foodies** (waitlist for everyone else — density before breadth)
- Optional NL-to-chips search layer · Algolia if tag search feels limiting
- **Beta success benchmarks** (per hyperlocal-launch research, comparable to early Foursquare/Swarm): D1 retention >50%, D7 >25%, D30 >10% if the first-contribution loop is under 30 seconds. CAC target: ₹0–₹500/user via personal networks, college foodie groups, local WhatsApp communities — not paid acquisition at this stage.

### Phase 4 — `[DEFERRED — design north star, do not build]`
Taste Graph ("92% taste match with people like you") · pairwise in-bucket comparisons · v2 ranking formula · monetization (sequence when ready: affiliate reservations → premium Tastemaker tools → B2B insights; Yelp-style promoted listings only at real scale, always separated from organic ranking) · mobile apps · second city.

## 18. Use Cases & Edge Cases (test against every phase)

**Core journeys:**
- U1 · 8 PM, Jubilee Hills, permission granted → opens to Dinner-in-Jubilee-Hills ranked feed, zero taps
- U2 · Types "biryani" → chip-refined trusted results, best dish-level recommendation on top
- U3 · Posts chai recommendation with photo → EXIF pre-selects Breakfast → L3 verified → visible with badge
- U4 · Visitor browses everything; first save prompts sign-in (never before)
- U5 · Member crosses 30 recs / 10 photos / trust 70 → Apply button appears → owner approves → badge live

**Edge cases (every one must have a designed behavior, not an accident):**
- E1 Location denied → State B manual selection, no nagging re-prompts
- E2 Empty category → full §12 ladder, layer-labeled
- E3 Geo-mismatch post → publishes, silently suppressed, no user-facing shaming
- E4 6th recommendation in an hour → friendly rate-limit message, write rejected server-side
- E5 Duplicate restaurant tag → Place-ID dedupe merges to existing doc
- E6 Photo without EXIF (screenshots/WhatsApp) → no pre-select, manual meal tag required, capped at L2
- E7 Restaurant closes → editor marks closed; recommendations preserved, "Permanently closed" banner, excluded from feeds
- E8 Author's trust collapses after posting → old recs keep trustSnapshot (stability); fraud takedown is the only retroactive event
- E9 Same-device account farm → fingerprint match → review queue before any post goes live
- E10 Offline/poor network → cached last feed + clear retry states; post drafts persist locally

## 19. Non-Functional Standards

- **Performance:** feed first-paint < 2s on 4G (one leaderboard read); images lazy-loaded, WebP, sized variants via Storage
- **Accessibility:** WCAG AA contrast on the §4.2 palette (terracotta-on-cream verified); full keyboard nav; alt text required on editor content
- **Security:** all score/trust/aggregate fields writable only by Cloud Functions; Rules deny client writes to them; App Check enforced on Functions + Firestore
- **Privacy:** `geoAtPost` never exposed publicly; location permission copy per §11.3; data deletion honored (account deletion cascades votes, anonymizes recs)
- **Cost guardrails:** billing alerts at $10/$50/$100; per-API quotas; Firestore reads monitored weekly during beta

## 20. Open Decisions Register `[OWNER-DECIDES]`

| # | Decision | Options | Default if unresolved |
|---|---|---|---|
| D1 | Launch district | Jubilee Hills / Banjara Hills / Madhapur / Hitech City | Blocked — must choose before Phase 3 |
| D2 | Final primary hex | Keep #D9541E or adjust | #D9541E |
| D3 | Typeface pairing | Bricolage+Inter / General Sans+Inter | Bricolage+Inter |
| D4 | Wordmark treatment | — | Plain wordmark, lowercase |
| D5 | Budget band thresholds (₹) | e.g. <300 / 300–800 / 800+ | <300 / 300–800 / 800+ per person |
| D6 | Restaurant Owner claim verification method (§7.2) | Phone match to Google Business / document upload / deposit-refund | Blocked — must choose before Phase 2 owner claims ship |
| D7 | Negative-feedback report threshold before ranking suppression kicks in (§11.7) | e.g. 3 / 5 / 10 independent reports | Blocked — must choose before Phase 2 feedback loop ships |

---

*End of Master Build Document v1.2. Every line above is subject to owner revision. Claude Code: build Phase 0 first, confirm exit criteria, then request approval to proceed.*
