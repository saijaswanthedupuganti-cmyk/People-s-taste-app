# PEOPLE'S TASTE — MASTER BUILD DOCUMENT
**Version 1.7 · July 2026 · Owner: Sai Jaswanth Edupuganti**
**Status: Foundation document. Every line is editable by the owner. Claude Code must treat this as the single source of truth.**

**v1.1 changelog:** merged four items from the earlier `Peoples_Taste_Product_Blueprint_v0.1` draft that hadn't made it into v1.0 — Community Places (§5.1), follow-based feed composition (§11.6), per-recommendation feedback loop (§11.7), and the Restaurant Owner role (§7, §7.2). Schema updated to match (§15).

**v1.2 changelog:** merged six concrete findings from external research (trust-algorithm literature, anti-fraud case studies, competitor teardown, Firestore-at-scale data) — corrected the time-decay constant to an internally consistent value (§11.1), added a trust-velocity anti-farming rule (§9.3), added an impossible-travel abuse check (§14), added two 2026 competitors to the positioning table (§2), documented the Postgres+pgvector migration trigger (§16.1), and flagged the confidence/sample-size gap in the v1 ranking formula as a named consideration for v2 (§11.2). Everything else from that research (market benchmarks, UX teardown detail) was read and is *consistent with* existing decisions, not additive — noted inline where relevant, not expanded into new sections.

**v1.3 changelog:** the `Peoples_Taste_Claude_Code_Master_Spec` (Kimi) document's full type schema was cross-checked use-case-by-use-case against this doc, not just for bugs. Six genuine feature gaps surfaced — things that schema assumed exist but this doc never specified: user handles/public profile URLs (§15), blocking (§14, §15), People search (§13), notifications (§8.1 screen 13, §15), user-level dietary/cuisine/price preferences as feed personalization (§13.2), and PWA installability (§16). Also added: lightweight replies as an explicit **open decision** rather than silently adopting full comment threads (D8, §20) — Kimi's schema assumes comments exist, but that's in tension with Principle #1 ("recommendation is the atomic unit," not a review-and-discussion thread) and deserves an owner call, not a silent merge. Architecture itself (Vite/Firestore/flat schema/trust-weighted voting) is unchanged — this pass is about use-case completeness, not another stack decision.

**v1.4 changelog:** owner supplied a 28-point product review checklist (2026-07-25) and asked for it to be cross-checked against this document and the live codebase, not adopted at face value. Result, in full, is new §21. Headline finding: this was **not** mostly a "28 new features" situation — the large majority of the checklist was already specified here, several as *locked, Phase 1, non-negotiable* — and a code audit found several of those were never actually built despite later phases (posting, voting, tiers) shipping around them. Most serious: §14's Anti-Abuse Stack (App Check, velocity limits, blocking, impossible-travel/device-fingerprint checks) is almost entirely unbuilt; §11.1's ranking formula (trust-weighted `rankingScore` with time decay) doesn't exist — the feed is pure `createdAt` chronological order today, which quietly contradicts the "we rank by trust, not chronology" positioning claim in §2; §11.6's follow-based feed layering is unbuilt; the Editor Console (§8.1 screen 11) — a *Phase 0 exit criterion* — was never built at all. Six items from the checklist are genuinely new (not in this doc before) and get logged as owner decisions D9–D14 rather than silently built: SEO/rendering strategy for the SPA architecture (D9), a Community Vendor identity-verification pipeline that's stricter than §5.1's existing dedupe-only flow (D10), Dynamic Vendors / today's-location-and-timing for mobile vendors (D11), Creator Profile fields distinct from the per-post proof-link shipped same day (D12), pretty share-link URLs (D13), and closing the overdue Editor Console (D14, not really a new *decision* so much as a scheduling call on when it finally gets built). Full detail, phase-by-phase gap table, and reasoning in §21 — do not start building any checklist item without reading it first. Same day, before moving further down §21.5's build order: §14 Anti-Abuse basics and §9.3 trust velocity shipped (backend only, 42 tests) — see §21 item 1 update.

**v1.5 changelog:** owner called an explicit halt to incremental feature work ("stop adding random features") and asked for a proper Information Architecture + Product Design System pass instead — role-based IA, sitemap, navigation architecture, a section-by-section rationale for the Home page (reframed as a **Discovery Dashboard**, not a feed), Restaurant/Dish page IA, a formalized **Creator Evidence** model, a component inventory, and a frontend implementation plan, all before further UI work. This is new **PART 8 (§22–§30)**. Also amends instruction #5 (top of this doc): design process is now **web/desktop-first** — design and build for desktop/laptop/tablet first, adapt down to mobile, not the reverse. (This doesn't undo the mobile-responsive work already shipped 2026-07-25, which handles both; it changes how *new* screens get designed from here on.) Nothing in Part 7's §21.5 build order (Ranking Engine → Editor Console → Follow → Google Places) is changed by this — Part 8 is the missing IA layer those features will be built inside of, not a replacement for them.

**v1.6 changelog:** owner supplied a second external reference — a 21-chapter "People's Taste Product Bible v0.1" (broader, more philosophical/architectural in tone, occasionally assumes a different stack) — for cross-check against this document, same method as v1.3's Kimi-spec pass: nothing merged silently, redundant restatement of already-locked decisions logged as consistent-not-additive rather than re-added, genuine gaps written up as new sections, real conflicts logged as owner decisions rather than picked for the owner. Result is new **PART 9 (§31–§40)**. Six areas had real net-new depth this doc didn't already have: dish-variant modeling and seasonal/complementary-dish discovery (§32, extends §26), a fuller Business Owner platform — branches, staff roles, subscription tiers (§33, extends deferred §7.2), a Creator Knowledge Score writeup and Food Trails (§34, extends locked §27), a three-type location model (Current/Home/Destination City) and an intent-based Discovery Radius Engine (§35, extends §11.3/§16), Food Lists/Trails/Passport gamification (§36, extends §11.6/§9.1), and a graduated Admin role hierarchy plus CMS/feature-flag tooling (§37, extends D14's Editor Console). §38 notes a backend event-bus/domain-service folder pattern as a code-organization recommendation — consistent with, not a change to, this doc's already-locked Vite+Vercel stack (§16); the source's own Next.js assumption doesn't introduce a new conflict, it restates one branch already logged under D9. Three new owner decisions, D16–D18 (§39). §40 lists what was read and found consistent with §9–§15/§19 but not re-merged, so it isn't mistaken for an oversight later.

**v1.7 changelog:** shipped §11.1's Ranking Engine (2026-07-30) — `rankingScore` computed on recommendation creation and recomputed on every helpful-vote event, home feed now sorted by it. Also fixed a live bug found while implementing this: `src/lib/queries.ts`'s three read queries filtered `status == "active"`, but every write path has used `status == "live"` since the schema was locked — the feed, restaurant pages, and profile pages were returning empty results until this was corrected. Per §21.5, next up is item 3 (Editor Console, D14) or item 2b (§11.4 precomputed leaderboards) — see the implementation plan at `docs/superpowers/plans/2026-07-30-ranking-engine-v1.md` for what shipped and what's still open. **Required deploy order for this Ranking Engine work** (getting this wrong breaks production): (1) deploy the Firestore composite index for `[status, rankingScore, createdAt]` and wait for it to reach "Enabled" status, (2) run the one-off `backfillRankingScore` callable so pre-existing `live` recommendations that predate this field get one, (3) only then deploy the frontend change that sorts `fetchFeed` by `rankingScore` — deploying the frontend before the index finishes building makes `fetchFeed` throw `failed-precondition` and breaks Home/Search for every user until the index is ready.

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

### 6.1 Comments/replies — open decision, not silently adopted `[OWNER-DECIDES, D8 §20]`

The Kimi spec's schema assumes recommendation comment threads exist (`commentCount`, a comment-related notification). That's a real tension with Principle #1 — "Recommendation is the atomic unit... Not the review... Not the post" — full open-ended comment threads start to turn a recommendation into exactly the review-app discussion format this product is deliberately not building. Two options, not decided yet:
- **(a) No comments at all in MVP.** Helpful/Overrated reactions are the only response mechanism. Simplest, most on-brand, easiest to moderate.
- **(b) One tightly-scoped reply, not a thread.** E.g. only the author can reply once to their own recommendation (an update: "still good as of March" style), or only Tastemaker+ tier can add a single public note. Preserves "atomic unit," adds a narrow freshness/credibility signal.
Do not build either until this is picked — schema has no `comments` collection yet on purpose.

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

### 8.1 Screen Map (Web MVP — 14 screens)

1. **Landing / Home Feed** — meal-window-aware ranked recommendation feed for current/selected area; filter chips row
2. **Search & Results** — keyword search over `query_tags` + chip refinement (§13); includes a **People** tab (§13.3) — search by handle/display name, separate from dish/place results, never blended into the same ranked list
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
13. **Notifications** `[Phase 2]` — new follower, helpful vote received, tier-up, verification approved, community place approved, evening feedback prompt (§11.7), trending nearby. Read/unread state, deep-links back into the relevant screen. No push spam by default — see §13.4 for defaults.
14. **Settings** — notification preferences (per-type toggles, §13.4), dietary/cuisine/price preferences (§13.2), blocked accounts list (§14), account deletion (§19 privacy — cascades votes, anonymizes recs)

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

### 13.2 User preferences as personalization, not gating (locked decision)

`users/{uid}.preferences: { dietary[], cuisines[], priceRange }` — set once during onboarding (skippable, zero mandatory questions per Principle #4) or later in Settings.

- **Pre-selects filter chips, never silently filters results.** A vegetarian user opens Search and sees the "Veg" chip already active — one tap to remove it. This is the same "personalizes, doesn't gate" rule already locked for location (§11.3); preferences follow the identical pattern so the product stays internally consistent.
- Feeds into feed ranking as a *tie-breaker* only, same tier as proximity in §11.3 — never outranks a real trust gap.

### 13.3 People Search (§8.1 screen 2, People tab)

Search by `handle` (exact/prefix match) or `displayName` (Firestore `array-contains` on a lowercased tokens array, same mechanism as §13's dish/place search — no new infra). Results show tier badge + areas covered, link straight to the public profile screen. Blocked accounts (§14) never appear, in either direction.

### 13.4 Notification defaults (§8.1 screen 13)

Default ON: new follower, tier-up, verification approved, evening feedback prompt. Default OFF: trending nearby (opt-in only — this is the one category that can feel like spam if defaulted on). All toggleable per-type in Settings (screen 14), never an all-or-nothing switch.

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
10. **Blocking (Phase 1, not deferred)** — this is a user-safety baseline, not a nice-to-have, so it ships with the core loop rather than waiting for Phase 2 social features. `blocks/{blockerUid}_{blockedUid}` — same doc-ID-enforced pattern as `follows` and `votes` (§15). A block is one-directional and silent: the blocked account is never notified, simply stops appearing in the blocker's feed, search (§13.3), and notifications, and the blocker's public content stops surfacing to the blocked account. Enforced server-side in the feed/search Cloud Functions, not just hidden client-side.

**Known platform limitation, not a gap to silently paper over:** proper GPS-spoof detection (Wi-Fi/Bluetooth beacon correlation, sensor-fusion movement checks) requires native mobile APIs the web platform doesn't expose. Web MVP can only do distance-based geo-mismatch (§10) and impossible-travel (above) — both good signals, neither as strong as what a native app could do. Revisit when the `[DEFERRED]` mobile app phase happens (§17 Phase 4).

Evidence this is not optional: Yelp closed 551,200 accounts and flagged ~550 businesses for review manipulation in a single year. Integrity is a launch feature, not a growth feature.

---

# PART 5 — DATA & PLATFORM

## 15. Firestore Schema (locked for Phase 1)

```
users/{uid}
  username, displayName, photoURL   // username IS the public handle — profile URL slug (§8.1 screen 8) and People Search (§13.3) target. One field, not a duplicate "handle" field.
  city, homeArea
  trustScore            // float 0–100, server-writable only
  tier                  // "explorer" … "legend"
  counts: { recommendations, verifiedVisits, helpfulReceived, followers, following }
  deviceFingerprints[]  
  createdAt
  tasteSeeds[]          // [DEFERRED consumption] passively accumulated cuisine/vibe tags
                        // from posts & saves — fuels future Taste Graph. Write from day one.
  preferences: { dietary[], cuisines[], priceRange }   // §13.2, personalization only, never gates results
  notificationSettings: { newFollower, tierUp, verificationApproved, feedbackPrompt, trendingNearby }  // §13.4, booleans, all default true except trendingNearby

follows/{followerUid}_{followeeUid}   // doc ID pattern mirrors saves/votes — structurally one-follow-per-pair
  followerUid, followeeUid, createdAt
  // powers §11.6 feed layer 1–2: query where followerUid == me, or use as a denormalized
  // followingIds[] array on users/{uid} if reads outnumber writes enough to justify it — [OWNER-DECIDES at Phase 1 build time]

blocks/{blockerUid}_{blockedUid}      // §14 point 10 — same doc-ID-enforced one-per-pair pattern
  blockerUid, blockedUid, createdAt

notifications/{notifId}               // [Phase 2] §8.1 screen 13
  userId, type                        // "new_follower" | "helpful_vote" | "tier_up" | "verification_approved" | "place_approved" | "feedback_request" | "trending_nearby"
  payload: { actorId, actorUsername, recId, placeId, message, deepLink }
  read, createdAt

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
  viewCount, shareCount             // function-maintained counters, informational/analytics only — NOT ranking inputs (Principle #2: no vanity-metric gaming, same reason raw likes are excluded from §11.1)
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

**PWA installability (locked — Phase 1, not deferred):** `manifest.json` + a service worker shipping with the Phase 1 build, not bolted on later. This isn't a nice-to-have here — E10 (§18, already locked) requires "cached last feed + clear retry states; post drafts persist locally," which is a service worker's job either way. The earlier throwaway prototype (Nov 2025) already had `manifest.json`/`sw.js` — this reinstates that, properly, against the real schema this time.

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
- U6 · Searches the People tab for a known local food blogger's handle → finds them → follows → their recs now surface first in feed layer 1 (§11.6)
- U7 · Blocks an account that's harassing them in [Phase 2] replies (once D8 is resolved) or just makes them uncomfortable → that account's content silently vanishes from their feed/search, no notification sent either way
- U8 · Gets a "tier-up" notification → taps it → deep-links straight to their own profile showing the new badge

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
- E11 Blocked user tries to view the blocker's public profile directly by URL → profile loads normally (blocking hides *feed/search* surfacing, not a hard wall — avoids a "you've been blocked" reveal, which itself can escalate harassment)

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
| D8 | Comments/replies on recommendations (§6.1) | No comments in MVP / one scoped author-only reply, not a thread | No comments — simplest, most on-brand, don't build `comments` collection until decided |
| D9 | SEO/rendering strategy for public pages (§21.3) | Add SSR/prerendering now (Next.js migration or a prerender service) / defer until Phase 3 seed content exists | Defer to Phase 3 — an SPA with zero real recommendations has nothing worth ranking yet; revisit when the 300-restaurant seed lands |
| D10 | Community Vendor identity verification (§21.4) — phone → selfie → location → community confirm → admin approve, stricter than §5.1's dedupe-only flow | Extend §5.1 with this pipeline now / treat as a Phase 2+ addition once street-vendor volume justifies it | Blocked — needs owner call on whether this replaces or layers onto §5.1, and at what phase |
| D11 | Dynamic Vendors — today's-location/timing/offers for food trucks (§21.4) | Build now as a restaurant sub-type / defer until Community Vendor verification (D10) ships | Defer — depends on D10 landing first |
| D12 | Creator Profile fields (Instagram/YouTube/Website on `users/{uid}`, distinct from the per-post `proofUrl` shipped 2026-07-25) | Add profile-level creator links now / fold into a later Tastemaker-tier feature | Blocked — needs scope call (links only, or embedded post/reel rendering too) |
| D13 | Pretty share-link URLs (e.g. `peoplestaste.in/r/cafe-bahar-best-biryani`) (§21.3) | Build now / depends on D9 | Blocked on D9 — no point generating SEO-friendly slugs before the rendering strategy is decided |
| D14 | Editor/Admin Console (§8.1 screen 11) — a Phase 0 exit criterion never built | Build a minimal skeleton now (seed restaurants, review queue placeholder) / keep deferring | Recommend: build now — every other Phase 0/1 item shipped around it, and moderation queue (§14) has nowhere to route to without it |

---

# PART 7 — v1.4 CHECKLIST CROSS-CHECK (2026-07-25)

## 21. Owner's 28-Point Product Review, Audited Against This Doc and the Live Codebase

Owner supplied a 28-section product review checklist and asked for every existing feature to be reviewed against it — fix what's broken, add what's missing, improve what's weak, without drifting from Part 1's principles. Per instruction #1 (top of this doc), nothing here gets built silently; this section is the audit, §20 D9–D14 are the resulting new decisions, and nothing past this point has been coded yet.

### 21.1 Already fully specified elsewhere in this doc — checklist item, doc reference, and real build status

| Checklist item | Spec'd at | Built? |
|---|---|---|
| 1. Auth & progressive access | §7, Principle #4 | ✅ Built correctly — visitor browsing, gated post/save/vote, no forced login wall |
| 5. Community Places | §5.1 | ✅ Built — `communityPlace` input path, GPS pin, no address/category required |
| 6. Duplicate detection | §5.1 | ⚠️ Partial — nearby-radius + name-match dedup exists server-side and **auto-merges silently**; the doc's "Did you mean [X]?" **confirmation UI** was never built, so a user has no idea their post got merged into an existing place |
| 7. Trusted Foodie tiers | §9 | ✅ Built — tiers, `computeTrust`, badges. Code comments in `trust.ts` already self-document that `consistencyFactor` and `communityFactor` are stubbed at 0 pending posting-cadence history and Follow (item 11) |
| 8. Ranking formula | §11.1 (**locked**) | ✅ **Built 2026-07-30.** `rankingScore` (§11.1 formula) is computed on recommendation creation and recomputed on every helpful-vote event; `fetchFeed` now sorts by it instead of `createdAt`. Time-decay only refreshes on a vote event in this v1 — the precomputed-leaderboard scheduled rebuild (§11.4) that would also refresh decay on *un-voted* recommendations is not part of this pass; still tracked as pipeline item 2b. |
| 9. Success validation ("did this meet expectations?") | §11.7 | ⏸ Correctly not built — explicitly `[Phase 2, ships with check-ins]`, not a current-phase gap |
| 10. Restaurant vs Dish pages | §15 schema, §5 | ⚠️ Partial — `RestaurantProfile.tsx` exists with emergent aggregates. The `dishes/{dishId}` collection in the locked schema is **never written to** — `dishName` lives only as a string field on each recommendation, so there is no dish-level aggregation page (best restaurants *for a dish*, across the city) at all |
| 11. Following system | §11.6 (**locked**, not phase-tagged — implied core loop via the Member role in §7 and use case U6) | ❌ **Not built.** No `follows` collection, no follow button anywhere, no feed layering. `trust.ts` already flags this as a blocker for `communityFactor` |
| 12–13. Landing / personalized experience | §8.1 screen 1, §11.6, §13.2 | ⚠️ Partial — the 2026-07-25 Home redesign covers "Trending," "Hidden Gems," "Trusted Foodies Near You" as real filtered views. Follow-based layer 1–2 (§11.6) doesn't exist (see item 11); `users.preferences` (dietary/cuisine/price, §13.2) was never added, so there's no personalization tie-breaker and no Settings screen (§8.1 screen 14) to set it |
| 14–15. Restaurant Owner Portal & verification | §7.2, D6 | ⏸ Correctly not built — explicitly `[Phase 2/DEFERRED]`. Flagging this checklist item as already-decided-to-wait, not a gap |
| 19. Sponsored listings | Principle #2, §17 Phase 4 | ⏸ Correctly not built — explicitly deferred to Phase 4, and Principle #2 requires visual separation from organic ranking whenever it does ship |
| 20–22. Creator Program / links / embedded media | *(not previously in this doc)* | ⚠️ Partially covered same-day — the per-post `proofUrl` (YouTube/Instagram link, manual verification, shipped 2026-07-25) covers the "official links only, no video uploads" spirit of item 22 at the post level. A profile-level Creator Profile (item 21) and actual oEmbed rendering (item 22) do not exist — logged as D12 |
| 23–24. Share links / growth loop | *(not previously in this doc)* | ❌ Not built — URLs are `/rec/:id` (raw Firestore doc ID), no slug, no OG metadata, no preview image generation. Logged as D13, gated on the SEO decision (D9) |
| 25. Security / anti-abuse | §14 (**"Phase 1, non-negotiable"**) | ❌ **Almost entirely not built.** Audited line-by-line against the live codebase: |

**§14 line-by-line audit (the most serious finding in this pass):**

| §14 requirement | Status |
|---|---|
| Firebase App Check | ❌ Not configured anywhere (`firebase.ts`, functions, `firebase.json`) |
| Phone or Google OAuth only, no anonymous accounts | ✅ Google OAuth only — matches |
| Velocity limits (5 recs/hr, 30 votes/min, 100 follows/day) | ❌ No rate-limiting logic in `createRecommendation.ts` or `toggleHelpfulVote.ts` at all |
| One vote per user per recommendation | ✅ Built correctly — vote doc ID is the voter's UID (`recommendations/{id}/votes/{voterUid}`), structurally impossible to double-vote |
| Geo-mismatch suppression | ❌ Not implemented — `createRecommendation.ts` only uses `userLocation` for the L1/L2 verification bump, never checks plausibility against the restaurant's country/city |
| Device fingerprinting | ❌ No `deviceFingerprints` field, no collection logic |
| Trust-weighted ranking as last line of defense | ⚠️ Partial — item 8 (ranking formula) is now built 2026-07-30, so `rankingScore` (trust-weighted, time-decayed) exists and is what the feed sorts by; trust *is* now a real ranking factor. But the geo-mismatch half of this backstop isn't wired in yet: `computeRankingScore` doesn't take `geoMismatch` into account, so a geo-mismatched post ranks identically to a clean one (see `geoMismatch` doc comment, `types.ts`) — logged as an open gap, not this pass's scope |
| Impossible-travel check | ❌ Not implemented |
| Trust velocity check (§9.3) | ❌ Not implemented (also self-flagged as pending in `trust.ts` comments) |
| Blocking (`blocks/{blockerUid}_{blockedUid}`) | ❌ No `blocks` collection, no block button, no enforcement in feed/search/notifications |

The doc itself cites Yelp closing 551,200 accounts for review manipulation in a single year as the reason this section is "non-negotiable" rather than nice-to-have — worth re-reading that line given how little of it actually shipped.

| 26. Database schema review | §15 (**locked**) | Missing collections vs. spec: `follows`, `blocks`, `notifications`, `checkins`, `editorsPicks`, `leaderboards`, `applications`, `reports` — none exist yet (several are correctly Phase-2+-tagged, not a gap). Missing fields on existing collections: `users.preferences`, `users.notificationSettings`, `users.deviceFingerprints`, `users.counts`; `recommendations.dishId`, `query_tags[]`, `bucketId`, `geoAtPost`, `viewCount`/`shareCount`; `recommendations.status` is now the locked `"live"｜"suppressed"｜"removed"` enum (fixed 2026-07-30 — was previously a free `"active"` string that every read query filtered on while every write path had already moved to `"live"`, silently returning empty results); `recommendations.rankingScore` is no longer missing either (built 2026-07-30, §11.1); `restaurants.googlePlaceId`, `placeCache`, `claimedBy`, `ownerClaimStatus` don't exist because Google Places integration (item 3 below) was never wired up |
| 27. Post flow under 30s, everything but restaurant→dish→reason optional | §5, principle #4 | ⚠️ Partial — current flow gates on `mealTags` and `primarySignal` as required steps *in addition to* place/dish/caption, which is more mandatory friction than the doc's stated ideal. Worth a follow-up UX pass, not urgent |
| 28. Future roadmap placeholders | §17 Phase 4 | ✅ Already documented there — nothing to add |

### 21.2 Google Maps integration — checklist items 3 & 4, spec'd at §16 (**locked cost rules**), not built at all

This is a bigger gap than it first looks: the Post flow's restaurant search (`fetchRestaurants` in `queries.ts`) only searches restaurant docs **already sitting in Firestore** — there is no live call to Google Places Autocomplete or Place Details anywhere in the codebase. Every restaurant currently in the database got there by direct Firestore write (seed/manual), not through the Places pipeline §16 describes. The "Iron Cache Rule" (ping Google once, cache forever) is aspirationally correct policy but there's nothing to cache from yet. Building this for real means: Places Autocomplete with session tokens in the Post flow's "Where?" step, a Place Details call (field-masked) on selection, writing the result into `restaurants/{id}.placeCache`, and a Google Maps API key with hard quotas + billing alerts set before this ships (§16 budget reality: ~28k calls/month free tier). This is Phase 0/1 work per the doc's own placement, not new scope — it just never got built.

### 21.3 SEO & growth loop — checklist items 2, 23, 24 — new ground, logged as D9/D13

The architecture is a client-rendered Vite SPA (confirmed: `index.html` ships an empty `<div id="root">`, all content renders via JS after load). This has a real consequence the checklist doesn't spell out: Googlebot executes JS reasonably well today, but **social preview crawlers largely don't** (Facebook/WhatsApp/Twitter link unfurling, Slack previews) — they read static `<meta property="og:*">` tags from the raw HTML response, which a pure SPA can't provide per-page without either (a) a framework migration to something with SSR (Next.js), or (b) a prerendering layer bolted in front (e.g. a Cloud Function that detects crawler user-agents and serves pre-rendered HTML for public routes). Item 24's whole growth loop — "influencer posts a Reel with a People's Taste link, someone opens it, sees a rich preview" — depends entirely on this working. Given the site currently has zero real recommendations to make discoverable, D9 recommends deferring this investment until the Phase 3 seed (300 restaurants) gives search engines and share links something worth indexing, rather than building SSR infrastructure around an empty database today.

### 21.4 Community Vendor Verification & Dynamic Vendors — checklist items 16 & 17, new ground, logged as D10/D11

§5.1 already supports community places (name + pinned GPS, no Google requirement) but has **no identity verification** — anyone can add one, deduped only by name/proximity. The checklist's proposed pipeline (phone → selfie → location → community confirmation → admin approval → "Verified Community Vendor" badge) is a materially stricter, higher-friction flow that would sit on top of §5.1, not replace it. Given Principle #4 ("never block core value behind... mandatory verification"), this needs to stay opt-in — a badge a vendor *can* earn, never a gate on being listed at all. Dynamic Vendors (today's-location/timing/offers, open/closed status) is a reasonable extension once vendor identity exists, but building "today's location" tracking before verification exists risks becoming a spam/impersonation vector with zero of §14's anti-abuse stack in place yet. Recommend: sequence this after §14 gets built, not before.

### 21.5 What this means for build order

Given the above, the highest-leverage next work — the things marked *locked* and *Phase 1 non-negotiable* in this document that somehow never got built — is, in priority order:

1. ✅ **Done 2026-07-25** — §14 Anti-Abuse Stack basics: velocity limits, §9.3 trust velocity, geo-mismatch + impossible-travel flags, blocking. App Check still needs the owner to generate a reCAPTCHA site key in the Firebase console — code isn't wired for it yet, tracked separately, not blocking the rest.
2. ✅ **Done 2026-07-30** — §11.1 Ranking Engine: `rankingScore` field, create + vote-event recompute, feed sorted by it. §11.4's precomputed-leaderboard scheduled rebuild (decay refresh without a new vote) remains open — see item 2b below.
2b. §11.4 Precomputed leaderboards (`leaderboards/{city}_{area}_{meal}_{category}`, 6-hour scheduled rebuild) — the cost-control mechanism §11.4 describes, and the only way a recommendation's rank reflects time-decay between votes. Not started.
3. **§8.1 screen 11 Editor Console** (D14) — overdue Phase 0 exit criterion, and §14's moderation queue has nowhere to route to without it
4. **§11.6 Follow system** — unblocks `trust.ts`'s stubbed `communityFactor`, the "Trusted Foodies Near You" personalization, and use case U6
5. Google Places integration (§16, items 3–4) — needed before real restaurant data can scale past manual seeding
6. Everything gated on D9–D13 (SEO/share-links, Community Vendor pipeline, Creator Profile) — worth owner decisions before code, not before

# PART 8 — INFORMATION ARCHITECTURE & PRODUCT DESIGN SYSTEM (v1.5)

## 22. Why This Part Exists

Every section below answers a single test, per the owner's instruction: **why am I here, what should I do, what should I explore, what's the next action?** If a section can't answer all four, it doesn't ship. This Part does not replace Part 3 (Object Model, §5–§8) or Part 4 (Trust/Ranking, §9–§14) — it operationalizes them into an actual navigable product: who sees what, in what order, and why each screen exists. Where this Part's thinking updates something already locked elsewhere (Home's identity, the design process), that's called out explicitly as an amendment, not a silent overwrite.

**Design process amendment (updates instruction #5, top of document):** desktop/laptop/tablet is now the primary design target; mobile is adapted down from it, not the other way around. Concretely: when a new screen is designed, its layout, hierarchy, and information density are decided at desktop width first, then simplified for mobile — never the reverse. This does not retroactively break the mobile-responsive work already shipped (2026-07-25 Home/Search/Saved/People grid + Login redesign already serve both correctly); it governs how the *next* screens get designed.

## 23. Role-Based Information Architecture

Six lenses on the same object graph (§5's `Recommendation → Dish → Restaurant → Area → City`), not six separate apps. A user can hold multiple roles at once (e.g. a Trusted Foodie who is also a Creator) — these are capabilities layered on one account, matching §7's existing role table, not a account-type switch.

```
Visitor (no account)                    — §7, unchanged
  Landing / Discovery Dashboard, Restaurant, Dish, Trusted Foodie profile,
  Community Place, Search, About, Privacy, Terms
  Cannot: save, vote, post, follow

Member (signed in)                      — §7, unchanged
  Everything above, plus:
  Home (personalized), Recommendations (own), Following, Saved,
  Notifications [Phase 2, §8.1 screen 13], Messages [far future, not scheduled],
  Profile, Settings

Trusted Foodie (tier badge, §9.1)       — a Member who crossed a trust threshold, not a separate account
  Everything above, plus:
  Trust Progress (own profile — already shipped, §9.1 tier bar),
  Achievements [new — see §28 gap list], Verification history,
  Tastemaker Application (§7.1, appears only after threshold unlock)

Creator (opt-in profile capability)      — NEW this pass, formalizes checklist items 20–22 + D12
  A Member/Trusted Foodie who added official Instagram/YouTube/Website links to their profile.
  Not a separate feed, not a separate ranking lane (Principle #2: no paid or status-based ranking
  boosts). See §27 Creator Evidence Model — the whole model is "recommendation contains evidence,"
  never "creator profile contains recommendations as a portfolio."

Restaurant Owner (claimed listing)       — §7.2, [Phase 2/DEFERRED], unchanged, reserved fields only
  Dashboard, Restaurant (edit non-ranking fields), Menu, Offers, Gallery, Business Hours,
  Analytics [DEFERRED further, Phase 4], Customers [DEFERRED further]
  Cannot: edit/hide/reorder recommendations, touch trust scores or rankings (§7.2 already locked this)

Admin / Editor (owner + delegated editors) — §7 "Editor" role, §8.1 screen 11, D14
  Dashboard, Restaurants, Community Places, Users, Trusted Foodies, Moderation queue (§14, §11.7
  reports), Sponsored Listings [Phase 4], Analytics, Campaigns [Phase 4]
```

**Why Creator is a lens, not a tier:** the checklist's Creator Program risks recentering the product on influencers, which the owner's own closing note in this pass explicitly corrects — "instead of making influencers the center of the product, make them evidence providers." That correction is adopted as the locked model (§27), not left as an open question.

## 24. Sitemap

```
/                          Discovery Dashboard (Home) — §24
/search                    Search & Results (dishes/places, People link-out) — §13, built
/rec/:id                   Recommendation Detail — §8.1 screen 3, built
/place/:id                 Restaurant Profile — §25
/dish/:id                  Dish Profile — §26 [NEW — dishes collection exists in schema, §15, never used]
/u/:username               Trusted Foodie public profile — §8.1 screen 8, built
/people                    People directory (all foodies, ranked) — built 2026-07-25
/post                      Post a Recommendation — §8.1 screen 5, built (gated)
/saved                     Saved — built (gated)
/profile                   Own profile — built (gated)
/login                     Auth — built
/about, /privacy, /terms   Static — §8.1 screen 12 [NOT YET BUILT]

/settings                  [NOT YET BUILT] — notification prefs, dietary/cuisine/price
                           preferences (§13.2), blocked accounts list (§14 point 10)
/notifications             [Phase 2, §8.1 screen 13]

/tastemaker/apply          Tastemaker Application — §8.1 screen 9 [NOT YET BUILT]
/owner/*                   Restaurant Owner dashboard — [Phase 2/DEFERRED, §7.2]
/admin/*                   Editor Console — §8.1 screen 11, D14 [NOT YET BUILT — see §21.5 priority 3]

/r/:slug                   Pretty share link — D13 [BLOCKED on D9 SEO decision]
```

**Navigation architecture:** primary nav stays Home · Search · Post (+) · People · Saved · Profile (§8.2, already built as the desktop sidebar / mobile bottom bar). Settings and Notifications live behind the Profile entry point, not in primary nav — they're configuration, not destinations someone browses to. Admin and Owner dashboards are separate route trees, never merged into the consumer nav, entered only via role-gated redirect after login (a non-Owner/non-Editor hitting `/admin` or `/owner` gets redirected to `/`, not shown a 403 page — consistent with §14's "never accuse" tone).

## 24.1 Home Page IA — The Discovery Dashboard

Reframing, not a rename: Home is not "the feed," it's the answer to one question, asked in that order — **"What should I eat right now, nearby, and whose recommendation should I trust?"** Every section below justifies itself against that question or it doesn't belong. Current build status noted per section (most of this shipped 2026-07-25; gaps are called out, not silently assumed done).

| Section | Answers | Status |
|---|---|---|
| Header — logo, location, meal selector, search entry, profile | Where am I, when is it, who am I | ✅ Built (`AreaMealHeader`, avatar pending — see §28 gap) |
| Hero — "What are you craving today?" + search bar | What can I do right here | ✅ Built 2026-07-25 |
| Personalized feed (if following someone) | What do people I trust think, first | ❌ Not built — depends on the Follow system (§11.6, §21.5 priority 4). Until then, this slot is *not* shown empty; layers 3–6 of §11.6 (nearby Trusted Foodies, trending, under-covered places) fill it, which is exactly what's built today |
| Trending in Hyderabad | What's popular right now, city-wide | ✅ Built (sorted by helpful-vote count; becomes true rankingScore sort once §21.5 priority 2 ships) |
| Trusted Foodies Near You | Whose taste can I follow, locally | ✅ Built (derived from the current area/meal view's real authors, ranked by tier) |
| Categories (Hidden Gem, Best Value, Worth Traveling, Late-Night, Family/Solo-Friendly) | Let me narrow by vibe, not just meal | ✅ Built as icon-labeled filter chips |
| Discovery ("because you liked…", near you, recently added) | Give me one more reason to keep scrolling | ❌ Not built — "because you liked" needs either Follow or `preferences` (§13.2), neither shipped. "Near you" already exists via the area filter; don't build a redundant second copy of it |
| Creator Picks | Show me evidence-backed recs from known creators | ❌ Not built — depends on §27 Creator Evidence model shipping; do not build a separate "creator feed," this should be a filtered view of recommendations that *have* attached evidence, nothing more |
| Community Places (street vendors, trucks, stalls) | Remind me not every good place is on Google | ⚠️ Partial — §5.1 Community Places exist in the data model and Post flow; there's no dedicated homepage surfacing section for them yet |
| Restaurant Spotlight / Sponsored | (only once monetization exists) | ⏸ Correctly not built — Phase 4, Principle #2 requires visible "Sponsored" labeling whenever it ships, never blended into organic sections |
| CTA — Recommend a Dish / Become a Trusted Foodie | What should I do if I have nothing to browse | ✅ "Recommend a Dish" built (empty-state CTA); "Become a Trusted Foodie" CTA not yet surfaced on Home — it currently only appears as a threshold-unlocked button in Profile (§7.1) |
| How It Works | Why should I trust any of this | ✅ Built (3-step: Recommend → Get Votes → Build Trust — matches the real trust mechanics, not marketing copy) |

**Never show nothing:** every section above either hides itself cleanly when empty (already the pattern for Trending/Hidden Gems/Trusted Foodies, §21's honest-empty-state approach) or falls through §12's empty-state ladder. No section should ever render a bare "no results" — that's already a locked, non-negotiable rule (§12) and the current build honors it.

## 25. Restaurant Page IA

Current (`RestaurantProfile.tsx`): name/area/price, Google Maps link, "Best Dish" aggregate card, all recommendations (grid, §21 desktop fix). Gaps against this pass's ask, in priority order:

1. **Gallery** — photos pulled from recommendations' own `photo` field (shipped 2026-07-25) aggregated onto the restaurant page; no separate photo-upload path needed, reuse what recommendations already contribute
2. **Instagram/YouTube posts section** — surfaces recommendations on this restaurant that have a `proofUrl` attached, rendered as a distinct "Evidence" strip (§27), not a generic embed grid
3. **Community Score** — this is `aggregates.recCount` + trust-tier distribution of contributors, already computable from existing data; needs a small aggregate widget, not new backend work
4. **Menu, Offers, Business Hours** — Owner-editable fields, correctly gated behind §7.2's deferred Owner claim path; do not build editable UI before the claim flow exists
5. **Related restaurants / similar dishes** — needs the Dish Profile page (§26) to exist first; a restaurant's "similar" set is naturally "other restaurants serving this restaurant's top dish," which is a dish-page query, not a restaurant-page one

## 26. Dish Page IA (net-new)

`dishes/{dishId}` already exists in the locked schema (§15) and is currently **never written to** — every recommendation stores `dishName` as a free-text string on itself, with no dish-level aggregation. Building this page means, in order:
1. Backend: on `createRecommendation`, resolve/create a `dishes/{dishId}` doc keyed by `(restaurantId, normalized dish name)` or a city-wide dish-category doc if the intent is cross-restaurant aggregation (**owner call — which of these two is intended is genuinely ambiguous from the checklist and needs a decision before backend work starts, logging as D15**)
2. Frontend: `/dish/:id` — dish hero, best restaurant for it, top recommendations mentioning it, nearby alternatives, community-confirmed "Would Return %" (derived from existing `signalTags` containing `would_return`, not a new field)
3. Do not build this before the Ranking Engine (§21.5 priority 2) ships — "best restaurant for this dish" is a ranking query, and ranking by `createdAt` would make this page actively misleading on day one

## 27. Creator Evidence Model (formalizes checklist items 20–22, D12)

**Locked framing, adopted from the owner's own correction in this pass:** creators are evidence providers, not a separate content lane. The object relationship is:

```
Recommendation
  └── optionally carries evidence:
        - photos (shipped)
        - one YouTube/Instagram link — `proofUrl` (shipped 2026-07-25)
        - Google Maps link (already present via restaurant location)
        - receipt upload (§10 L3+ verification — schema exists, upload flow doesn't)
```

Never the reverse (`CreatorProfile → recommendations[]` as a portfolio) — that would recreate exactly the influencer-centric model the owner's note explicitly rejected. A Creator's profile (D12, still open) should show their **recommendations that happen to carry evidence**, not a media gallery independent of the recommendation object. This also means: no video *uploads*, ever — `proofUrl` already enforces official YouTube/Instagram URLs only (validated server-side against a host allowlist), which is exactly what item 22 asked for ("only official public URLs"). Embedding the actual Instagram/YouTube player inline (vs. today's plain outbound link) is the only remaining piece of items 20–22, and is a frontend-only addition (oEmbed) once D12's profile-field scope is decided.

## 28. Component Inventory & Design System

**Design tokens:** already locked in §4.2 (color palette) and §4.3 (typography) — this pass does not re-litigate them, only catalogs what's built against them.

**Built components:** `RecommendationCard`, `CompactRecCard`, `TrustBadge`, `VerificationBadge`, `FilterChips` (now icon-capable), `PhotoPlaceholder`, `LocationSheet`, `AreaMealHeader`, `Layout`/`BottomNav`.

**Gaps, in the order §24.1/§25/§26 need them:**
- Header profile avatar + entry point (currently the header has location/meal only, no visible signed-in state indicator — small, high-value fix)
- Evidence strip (renders `proofUrl` as a labeled chip/embed, used on both Recommendation Detail and the new Restaurant Gallery section, §25 item 2)
- Achievement badge (Trusted Foodie tier progress — §9.1's tier bar exists on own Profile; a shareable/displayable achievement component doesn't yet)
- Admin table/queue components — needed for §8.1 screen 11, don't exist at all yet
- Owner dashboard card shells — correctly not built, Phase 2/DEFERRED (§7.2)

**States every new component must define before shipping (per the owner's checklist and this doc's existing §19 standards):** loading, empty, error, success — already the working pattern in every built page (Home/Search/Saved all show explicit loading and empty states); hold new components to the same bar.

## 29. User Flows

§18 already documents U1–U8 (core journeys) and E1–E11 (edge cases) — unchanged, still the canonical flow list. This pass adds two flows implied by the new IA, not yet in §18:

- **U9 · Creator attaches evidence:** posts a recommendation → at the caption step, optionally pastes a YouTube/Instagram URL (already built) → recommendation publishes with an Evidence badge → later visible in the Restaurant page's Evidence strip (§25 item 2, once built)
- **U10 · Admin reviews a report:** a recommendation crosses the negative-feedback threshold (§11.7, D7) or is flagged via §14's abuse checks → appears in the Editor Console moderation queue (§8.1 screen 11, D14) → editor approves/suppresses/removes with a reason, never silent, never auto-removed (§11.7 already locks this)

## 30. Frontend Implementation Plan

This does not replace §17's Phased Roadmap or §21.5's priority order — it's the sequencing of *this Part's* IA work relative to that existing plan:

1. **Now / already in flight per §21.5:** Ranking Engine → Editor Console → Follow system → Google Places (unchanged by this Part)
2. **Immediately after, informed by this Part:** header profile-avatar fix (§28), Restaurant page Gallery + Evidence strip (§25 items 1–2) — both cheap, both use data that already exists, both directly answer this pass's "too much whitespace, weak hierarchy" critique of the current build
3. **Once Ranking Engine ships:** Dish Profile page (§26) — explicitly sequenced after ranking, per §26's own note
4. **Once Follow ships:** Home's "personalized feed" and "because you liked" slots (§24.1) go from hidden to live — no new UI work needed, they're already designed to appear once the data exists
5. **Owner decisions still open before their sections can start:** D9 (SEO/rendering — this pass's "everything indexable" restates the ask but doesn't change the recommendation to defer past Phase 3), D12 (Creator Profile field scope), D15 (dish-aggregation key, §26, new this pass)

Wireframes for §24.1 (Discovery Dashboard), §25 (Restaurant), and §26 (Dish) are published as a companion visual artifact rather than pasted here as text — low-fidelity box diagrams read far better rendered than as markdown ASCII. High-fidelity wireframes are the next step once these low-fidelity layouts and this IA are confirmed, per the owner's own sequencing instruction ("only after architecture is perfect should you design UI") — building high-fidelity comps against an unconfirmed IA would mean redoing them.

---

# PART 9 — PRODUCT BIBLE CROSS-CHECK (v1.6, 2026-07-30)

## 31. Source & Method

Second external reference this pass: a 21-chapter "People's Taste Product Bible v0.1" (Chapter 22, "Search, Discovery & Ranking Algorithms," was announced in the source's table of contents but never written — nothing to cross-check there yet). It's broader and more philosophical than this document — closer to a design manifesto than an implementation spec — and in one place assumes a different frontend stack (Next.js App Router) where this doc has a locked, already-deployed Vite + Vercel stack (§16). Same method as v1.3's Kimi-spec cross-check: read the whole thing, merge nothing silently, log genuine gaps as new sections, log real conflicts as owner decisions instead of resolving them unilaterally, and explicitly say what was read and found consistent-but-not-additive so it isn't mistaken for something missed.

## 32. Dish Ecosystem Enrichment (extends §26 Dish Page IA)

- **Dish variants as child entities.** The source models "Biryani" as a parent concept with Chicken/Mutton/Veg/Fish/Prawns as distinct dish docs, each with its own recommendation set and aggregate score, rather than one flat bucket. This bears directly on D15 (§26, still open — per-restaurant name vs. city-wide category as the dish key): variant modeling suggests a third shape, a city-wide category *with* variant children, not a binary choice between the two already listed. Folded into D15's still-open decision, not logged as a separate one.
- **Complementary/similar dish suggestions** ("Biryani → Double Ka Meetha, Lassi") — a recommendation-graph feature, same tier as §11.2's deferred v2 ranking formula: needs real usage data to be worth anything, not five more guessed weights on day one. `[DEFERRED]`.
- **Seasonal/weather dish mapping** (Ramadan → Haleem, Monsoon → Pakoda) is legitimate Discovery Dashboard content once the Dish page ships, but it's an Editor-curated tag list using the existing Editor's Picks mechanism (§12 layer 4, `editorsPicks/{pickId}`), not a new AI system or new collection.
- **Dish badges** (Trending / Community Favorite / Worth Travelling / Hidden Gem / Verified Signature) already exist conceptually as this doc's `signalTags[]` (§6), computed per-recommendation. A Dish page aggregates and displays them; it doesn't need a second, parallel badge system.

## 33. Business Owner Platform Depth (extends §7.2, still `[Phase 2/DEFERRED]`)

- **Business hierarchy** (Business Account → Business Profile → Restaurant(s) → Branches) matters once a chain/franchise claims multiple locations, which §7.2's current schema doesn't model (`restaurants/{id}.claimedBy = uid` is one owner per restaurant, no shared entity grouping several). When §7.2 actually gets built, reserve a `businessProfiles/{id} { ownerUid, managerUids[], restaurantIds[] }` collection in the schema alongside it — still deferred, only the shape is worth reserving now.
- **Staff roles** (Owner/Manager/Editor/Viewer within a claimed business) extend §7.2's single-owner model. Recommend deferring this granularity until the 1-tier claim flow (§7.2, D6) actually ships and a real multi-location owner asks for it — building 4-tier staff permissions before the 1-tier version exists is premature.
- **Subscription tiers** (Free/Pro/Enterprise — analytics, campaigns, multi-manager, API access) are a genuinely new monetization surface, not previously scoped in §17 Phase 4's existing sequence (affiliate reservations → premium Tastemaker tools → B2B insights → sponsored listings). Logged as **D16**.
- **QR code** (restaurant table QR → recommend-after-meal flow) is a cheap, real offline-to-online bridge that doesn't require the Owner Portal to exist first — any restaurant already has a URL (`/place/:id`, §24). Could ship as a printable QR generator on any restaurant's existing profile page well before §7.2's Owner claim is built. Worth a cheap Phase 2/3 addition on its own, not gated on the rest of this section.

## 34. Creator Platform Additions (extends §27 Creator Evidence Model, locked)

- **Creator Knowledge Score (CKS)** — the source proposes an internal-only score for lasting-knowledge contribution: recommendation quality, confirmations, cuisine/city diversity, accuracy over time, freshness. This is structurally identical to this doc's own Trust Score (§9.1) — same inputs in spirit, same "never a raw number to the user" rule, same "diversity helps tier progression, never the score itself" carve-out (Principle #7). Recommend: do **not** build a second parallel score. If Creator-specific signal is ever needed, it's a query filter over existing Trust Score data (e.g. trust among users with `proofUrl` on most of their recommendations), not a new field, function, or collection — this is exactly what §27's "evidence provider, not a separate lane" framing already implies.
- **Food Trails** (a Creator-curated multi-stop route: Restaurant → Dish → Restaurant → Dish) is genuinely new — not covered anywhere in this doc today. Structurally it's a named, ordered list of existing `recommendations`/`restaurants`, closer to a public Collection than a new object type. Recommend: `trails/{trailId} { creatorUid, title, area, stops: [{restaurantId, dishId, order, note}], public }` — new collection, but it reuses existing IDs and needs no new restaurant/dish/recommendation logic. `[Phase 4]`, same tier as this doc's other deferred discovery features — not core loop.

## 35. Location Intelligence Additions (extends §11.3, §16)

- **Three location types — Current / Home City / Destination City.** A genuinely useful distinction this doc doesn't currently make; today §11.3 only has GPS-on-open vs. manual area selection (State A/B, §8). A user based in Hyderabad opening the app while traveling in Goa should get Goa results, not silently fall back to their last-selected Hyderabad area — that gap is real. Concretely: `users/{uid}.city` (§15, line 427) is already "home city" in substance; the clarification is to layer a live, session-only reverse-geocoded "current/destination city" on top (never persisted, per §11.3's no-background-tracking rule) rather than conflating the two. Schema clarification, not new infrastructure — noted against §15, not logged as a new decision.
- **Discovery Radius Engine** — adaptive search radius by intent (Hungry Now 2–5km, Coffee Break 1–3km, Family Dinner 10–15km, Weekend Plan 30–50km, Worth Travelling unlimited) is a real upgrade over today's fixed radius-per-mode and composes cleanly with the already-locked "proximity is a tie-breaker, never an override" rule (§11.3). Cheap to add: radius becomes a lookup keyed off the same `mealTag`/intent chips already in `query_tags` (§13.1) — a constants table, not a new backend system. Recommend building alongside §11.1's Ranking Engine, already §21.5 priority 2, since both consume the same query context.
- **Travel/Vacation Mode** (opening the app in a different city auto-shifts suggested categories) falls directly out of the Destination-City distinction above once it exists — it's what State A already does when session city ≠ home city, not a separate feature. Noted so it isn't mistaken for new scope later.

## 36. Community & Gamification Additions (extends §11.6, §9.1)

- **Food Lists / Curated Collections** ("Top 10 Biryani," "Best Cafes") — this doc has private/public saves implicitly (`saves/{uid}_{recId}`, §15) but no *named, shareable, multi-item* collection object. Genuine gap: a `collections/{id} { ownerUid, title, recIds[], public }` doc — effectively the Food Trail shape from §34 minus ordered-route semantics. If both ship, they should share one schema (ordered = trail, unordered = list) rather than becoming two near-identical collections — a build-time consolidation note, not two separate features.
- **Food Passport** (gamified count of cities/areas/restaurants/dishes visited) is the one gamification idea worth checking against Principle #4 and this doc's existing anti-vanity-metric stance (§9.1, §14 point 7). It's different in kind from follower-count or raw-like mechanics — self-referential, competing against your own history rather than publicly against other users — closer to Duolingo-style intrinsic motivation than the Beli-style social pressure this doc already rejects. Low-risk, but still `[Phase 4]`: its only real data source, `checkins` (§10 "I'm Here"), is itself still `[Phase 2]`.
- **Community Challenges** ("Hyderabad Biryani Week") — the source frames these as discovery-driven, not competitive, consistent with this doc's principles. Still needs an owner call: Editor-run challenges are operationally heavy (curation + judging) for a team this doc's own numbers put at 1–2 people during MVP. Logged as **D17**.

## 37. Admin Role Hierarchy & CMS Depth (extends D14, Editor Console)

- The source proposes seven admin roles (Support Executive → Content Moderator → Verification Manager → Business Manager → Operations Manager → Product Admin → Super Admin). This doc has two in substance today: Editor (§7) and an undocumented implicit Owner/full-access role. Recommend **against** building seven permission tiers now — consistent with D14's own "build a minimal skeleton" call, a 1–2 person team needs one moderation queue and one login gate, not a permission matrix sized for a support org. Reserve the *shape* only — a `role` string field on the admin user doc, not hardcoded to `"editor"` — so roles can be added later without a schema migration. Logged as **D18**.
- **CMS for homepage sections** (toggle Trending/Hidden Gems/Community Places, publish Editor's Picks, festival campaigns, no deploy required) is genuinely useful once all of §24.1's Home sections exist and an Editor wants to curate without code changes. `editorsPicks/{pickId}` (§15) already covers the Editor's Picks piece; a generic per-section visibility toggle is new scope, but it's only worth building *after* §24.1's sections all exist — natural continuation of §30's plan, not an earlier insertion point.
- **Feature flags / Remote Config** (city rollout, A/B tests, beta gating) are directly useful for §17 Phase 3's single-district launch and any later second-city expansion, and Firebase Remote Config costs nothing extra given this is already an all-Firebase project. Recommend: gate the Phase 3 launch city behind a Remote Config flag (`launchCity`) instead of a hardcoded value, so a second city later doesn't need a code deploy. Cheap enough to fold into Phase 3 as-is, not logged as a separate decision.

## 38. Backend Architecture Pattern (informational — not a build item)

The source proposes an event-bus pattern (`RecommendationCreated` fanning out in parallel to Trust/Search/Analytics/Notification services) and a `functions/src/{domain}/` folder-per-service convention. This is consistent with, not additive to, what this doc already implies: §11.1's Cloud-Function-recomputed `rankingScore` on every vote event, §15's "Cloud Function-maintained" aggregates throughout the schema, and §19's "client never calculates trust/ranking" rule are already an event-driven design in substance, just not named as one. Worth adopting the explicit folder convention (`functions/src/{trust,recommendations,restaurants,search,notifications}/`) as housekeeping once the Cloud Functions codebase outgrows its current size — a code-organization note, not a schema or feature change.

**Stack note:** the source's own tech-stack chapter assumes Next.js App Router; this doc's stack is locked as React + Vite, Vercel-hosted, not Firebase Hosting (§16) — an already-live, deployed decision, unchanged by this cross-check. This isn't a new conflict — D9 (§20) already names "Next.js migration" as one of its two SSR options. The source restates one branch of an already-logged open decision; it doesn't add a new one. See D9.

## 39. New Open Decisions From This Pass

| # | Decision | Options | Default if unresolved |
|---|---|---|---|
| D16 | Business subscription tiers (Free/Pro/Enterprise, §33) — a monetization surface not in §17 Phase 4's existing sequence | Add as a distinct fifth Phase 4 stream / fold into "B2B insights," already in the sequence | Fold into existing "B2B insights" — don't let Phase 4 grow longer than it needs to be before Phase 2/3 even ship |
| D17 | Editor-run Community Challenges (§36) — operationally heavy for current team size | Build once team > 2 people / never build, let §11.4's organic Trending leaderboard serve the same purpose | Don't build — §11.4 already surfaces momentum without a curated campaign layer |
| D18 | Admin role granularity (§37) — 7-tier hierarchy proposed vs. today's 2-role model | Reserve a flexible `role` field now, stay single-role until needed / build granular roles now | Reserve field shape only, stay flat — matches D14's own "minimal skeleton" call |

## 40. What Was Not Merged

The source's chapters on the Trust Engine, Recommendation Engine, Verification, ownership boundaries (business-facts vs. community-opinions), ranking philosophy, "every ranking must be explainable," and Firestore schema/security philosophy all restate — in less numerically specific, non-implementable form — what §9–§15 and §19 already lock with real formulas, real field names, and real code-audit status against the live app. None of that was re-merged. Where the source's phrasing was sharper than this doc's own (e.g. "trust grows slowly, trust falls quickly" as a plain-language restatement of §9.3's velocity-check mechanism), it's noted here as confirmation, not treated as new content. Chapter 22 of the source ("Search, Discovery & Ranking Algorithms") was announced but never written — nothing to cross-check there; worth re-running this pass against it if the owner later supplies the finished chapter.

---

*End of Master Build Document v1.7. Every line above is subject to owner revision. Claude Code: confirm §21.5 build order AND this Part's Home/Restaurant/Dish IA with the owner before further UI work, per instruction #3 (top of this doc).*
