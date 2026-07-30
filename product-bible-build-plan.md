# PRODUCT BIBLE → BUILD PLAN
**Companion to `peoples-taste-master-build-document.md` v1.6. Source: "Untitled document.md" (People's Taste Product Bible v0.1, 21 chapters, Ch22 announced but unwritten).**

## Purpose & how to use this file

The master build document is the single source of truth (its own words, top of file) — this file does not replace it or re-decide anything it has locked. This is a **line-by-line coverage audit**: every distinct rule, feature, or requirement in the Product Bible, checked off against one of four states, so nothing from that 20,000-line source gets lost before implementation starts:

- `[BUILT]` — already live in the codebase (per the master doc's own audit, §21.1)
- `[LOCKED]` — already specified in the master doc, not yet built, no new action here (just the cross-reference, so you can verify it's covered)
- `[NEW]` — genuinely not in the master doc; a real gap this file proposes closing, written as numbered build steps
- `[DECISION]` — needs an owner call before it can be built; numbered against the master doc's open-decisions register (continuing from D18)

Purely decorative source content (arrow diagrams `↓`, one-word restatement lines that are just visual flow-chart fragments, repeated section dividers) is **not** transcribed line-for-line — the *concept* behind every such fragment is captured in the checklist item it belongs to. Nothing conceptual is skipped; the markdown formatting artifacts are.

**Chapter map** (updated as each part is written):

| Chapters | Part | Status |
|---|---|---|
| 1–5 | Foundation, Vision, Philosophy, Information Architecture, UX Flows | done — Part A |
| 6–11 | Home, Search, Recommendation Engine, Trust Engine, Restaurant, Dish | done — Part B |
| 12–14 | Social Graph, Business Platform, Creator Platform | done — Part C |
| 15–17 | Location, Design System, Personalization/AI | done — Part D |
| 18–21 | Backend Architecture, DB Schema, Security, Admin CMS | done — Part E |
| 22 | Search/Ranking Algorithms | not written in source — nothing to audit; re-run this file's method against it if the owner later supplies the finished chapter |

**All 21 written chapters covered. See the Master Summary at the end of this file for the full new-item and new-decision count.**

---

# PART A — CHAPTERS 1–5

## Chapter 1 — Product Bible Foundation

| # | Item | Status |
|---|---|---|
| 1.1 | 5 primary entities: Person, Restaurant, Dish, Recommendation, Community Place | `[LOCKED — different shape, confirmed intentional]` Master doc's schema (§15) merges Community Place *into* `restaurants/{id}` via `source: "google"｜"community"` rather than a sibling collection. This is a deliberate, better choice for this schema (one query surface, no later merge-migration when a community place gets claimed, §5.1 already handles the community→official transition on the same doc). Not a gap — noting explicitly so the divergence isn't mistaken for an oversight. |
| 1.2 | Product Laws 1–8 (no empty screens, one primary action, <30s post, trust not purchasable, popularity≠trust, trending≠popularity, businesses can't manipulate trust, every rec explains why) | `[LOCKED]` §12 (empty-state ladder), §27 item (post-flow friction gap already flagged), §9 (trust engine), §11.4 (trending ≠ ranking), §7.2 (ownership boundary), §6 (caption field) |
| 1.3 | Law 9 — "Every algorithm should be explainable" | `[NEW]` See §17.1 below — Explainable AI has no current UI surface in the master doc. Build steps consolidated there rather than duplicated. |
| 1.4 | Law 10 — "If a feature reduces trust, do not build it" | `[LOCKED]` Restates Principle #2 (master doc top of file) |
| 1.5 | "Recommendation, not review/rating/post" atomic-unit framing | `[BUILT]` §5, live in schema |

## Chapter 2 — Vision & Market Analysis

| # | Item | Status |
|---|---|---|
| 2.1 | Competitor teardown (Google Maps/Zomato/Swiggy/Instagram/YouTube strengths & weaknesses) | `[LOCKED]` §2 positioning table already covers this, with 2026-dated competitors (Trusted Tastes, MustTaste) the source doesn't mention — master doc's version is more current |
| 2.2 | 5 Product Pillars (Discovery/Trust/Community/Business/Intelligence) | `[LOCKED]` Matches master doc's Part structure (Parts 3–5) in substance |
| 2.3 | Decision Framework — 5 questions before building any feature | `[LOCKED]` Consistent with master doc's own "why am I here / what should I do" test (§22); no structural change, both frameworks agree |
| 2.4 | "60-second decision" goal, 15–30 min status quo journey | `[LOCKED]` §11.1 formula and §27's <30s post-flow goal already encode this |

## Chapter 3 — Philosophy & Principles Deep Dive

| # | Item | Status |
|---|---|---|
| 3.1 | Philosophy 01–10 + Principles 01–10 (trust before technology, recs over reviews, trust earned slowly, every user starts equal, community owns opinions, businesses own facts, discover before login, infer-don't-ask, progressive disclosure, every click creates value; no empty screens, one primary action, one-minute rule, trust beats popularity, trending is temporary, context creates confidence, explain why, visuals support not replace, AI assists never invents, every rec creates knowledge) | `[LOCKED]` All 20 items restate master doc Principles #1–7 (top of file) and §9–§14 in less numerically specific form — this is the chapter with the most 1:1 overlap in the whole source. Nothing new. |
| 3.2 | "One Minute Rule" — literally *any* common action (recommend, follow, save, search, claim) finishes in ≤60s | `[NEW — narrow]` Master doc's §19 performance targets cover feed paint (<2s) and search (<300ms) but not a blanket ≤60s ceiling on every user action as a design constraint. Build step: add as a §19 non-functional standard — "no common action (post, follow, save, search, claim) should require more than 60 seconds of user time end-to-end"; this is a design review checklist item, not new code. |
| 3.3 | Claude Code Principles (read bible → check principles → check IA → check flow → reuse components → preserve consistency → document after) | `[LOCKED]` This document's own top-of-file instructions #1–7 already establish the same discipline for this codebase specifically |

## Chapter 4 — Information Architecture

| # | Item | Status |
|---|---|---|
| 4.1 | 7 core objects (Person, Restaurant, Dish, Recommendation, Community Place, Business Profile, Creator Content) | `[LOCKED]` Matches master doc's object model (§5–§8) plus Part 9 §33/§34 additions |
| 4.2 | Discovery Hierarchy: Country → State → City → Area → Restaurant → Dish | `[NEW — schema note]` Master doc's `query_tags` (§13.1) only go city/area/micro_area — no State/Country level. **Not needed at single-district MVP** (§17 Phase 3), but the schema should not hard-block a future State/Country field. Build step: when Phase 4's "second city" work starts, add `country`/`state` as optional fields on `restaurants/{id}` before it becomes a multi-country product — not before, YAGNI at MVP scale. |
| 4.3 | User Journey Hierarchy — 8 states (Visitor→Explorer→Logged→Contributor→Trusted Foodie→Neighborhood Expert→City Expert→Legend) | `[LOCKED]` Naming variance only against master's 6-tier list (§9.1: Explorer→Local Foodie→Verified Foodie→Neighborhood Expert→City Expert→Legend) — same progression, different label at two rungs. No action; master's is the locked, built version. |
| 4.4 | 9 Core reusable cards (Recommendation, Restaurant, Dish, Creator, Foodie, Community Place, Offer, Sponsored, Collection) | `[NEW — component gap]` Master's built inventory (§28) has `RecommendationCard`, `CompactRecCard`, `TrustBadge`, `VerificationBadge` — missing as distinct reusable components: **Dish Card**, **Creator Card**, **Foodie Card**, **Offer Card**, **Sponsored Card**, **Collection Card**. Build steps: (1) Dish Card — blocked on Dish Profile page shipping (§26, already sequenced after Ranking Engine); (2) Foodie Card — extractable now from existing public-profile rendering, cheap; (3) Creator Card — blocked on D12 (Creator Profile field scope); (4) Offer/Sponsored/Collection Cards — all Phase 2+/Phase 4, build only when their parent features (§7.2 Owner menu/offers, §17 Phase 4 sponsored, §36 Collections) ship. Community Place Card is intentionally **not** a separate component — reuses Restaurant Card with a "Community" source badge, matching §15's `source` field design (see 1.1 above). |
| 4.5 | Progressive Information — 5 display levels (Quick Decision → Details → Community → History → Advanced) | `[NEW — UX pattern]` Not explicitly codified in master doc, though the built Recommendation Detail screen already does levels 1–2 implicitly. Build step: when Restaurant/Dish pages (§25/§26) are built, explicitly design their information reveal in this 5-level order (card teaser → full detail → community activity → historical trend → advanced/analytics) rather than flat single-screen dumps — a design-review checklist addition, not new infrastructure. |
| 4.6 | SEO Architecture — one canonical URL per entity, no duplicates | `[LOCKED]` Directly the subject of D9/D13 (SEO rendering strategy, pretty share links) — already an open decision, not a new one |
| 4.7 | Responsive Architecture — same IA, different layout, desktop-rich/mobile-simplified | `[LOCKED]` Matches §22's v1.5 amendment (desktop-first design process) exactly |
| 4.8 | IA Laws 1–5 (no duplicate info, one owner per page, one source of truth per entity, relationships > screens, design entities before screens) | `[LOCKED]` Restates §15's "one owner per document" schema principle and the master doc's own build sequencing discipline |

## Chapter 5 — Complete UX Flows

| # | Item | Status |
|---|---|---|
| 5.1 | Flows 01–15, 19–21, 24 (first-time visitor, returning visitor, login journey, first recommendation, restaurant search, dish discovery, restaurant journey, save journey, follow foodie, follow restaurant, creator journey, restaurant owner journey, community place creation, trust growth, helpful vote, anonymous user, GPS experience, search intent flow, returning-after-visit feedback) | `[LOCKED]` All directly map to master doc's existing U1–U8 (§18) + U9–U10 (§29), or to already-built screens (§8.1). No new flow content. |
| 5.2 | Flow 16 — Duplicate Restaurant (exists? → merge : create) | `[LOCKED]` §5.1 dedupe-before-create + E5 (Place-ID dedupe) already cover this; master doc's audit (§21.1 item 6) even flags the confirmation-UI half of it as a known partial gap — already tracked, not new |
| 5.3 | Flow 17 — Wrong Information report (user reports → moderation → approve/reject/merge) | `[NEW — narrow]` Master doc's `reports/{reportId}` (§15) and §14's report categories are scoped to recommendation moderation (spam/abuse/duplicate/wrong-info on a *recommendation*). A **restaurant-level** "this address/hours/phone is wrong" correction report — distinct from flagging a recommendation — isn't explicitly modeled. Build step: extend `reports/{reportId}.type` enum to include `"restaurant_info_correction"` with a `field`/`suggestedValue` payload, routed to the same Editor Console moderation queue (D14) once built; owner (§7.2) gets first right of review if claimed, Editor otherwise. Small schema addition, not a new system. |
| 5.4 | Flow 18 — Business Verification (claim→phone→Google Business→manual→badge) | `[LOCKED]` §7.2 + D6 |
| 5.5 | Flow 22 — Sponsored Journey (restaurant pays → badge → visible placement → no trust boost) | `[LOCKED]` §17 Phase 4 + Principle #2's mandatory visual separation |
| 5.6 | Flow 23 — Recommendation Lifecycle (Created→Visible→Helpful Votes→Trending→Popular→Historical→Archived) | `[NEW — display gap]` Master doc achieves the *ranking* effect of this via time-decay (§11.1) but has no user-facing lifecycle label — an old, still-excellent recommendation just quietly fades in rank with no "why is this less visible" signal, and there's no "Historical"/"Timeless Classic" treatment for high-quality old content. Build step: add a display-only (non-ranking) badge computed from `rankingScore` decay position + `weightedHelpful` — e.g. "Timeless Classic" for high-trust recs older than ~180 days that still clear a helpfulness floor. Purely cosmetic/informational, doesn't touch `rankingScore` math (§11.1 stays locked) — Phase 2/3, cheap once Ranking Engine ships. |
| 5.7 | Empty State / Loading / Error Philosophy (never blank, educate while loading, always offer next step) | `[LOCKED]` §12 (empty-state ladder), §28 (component states: loading/empty/error/success already required per component) |
| 5.8 | Accessibility (keyboard, screen reader, large touch targets, high contrast) | `[LOCKED]` §19 already requires WCAG AA |
| 5.9 | UX Laws 01–10 | `[LOCKED]` Restates already-locked principles; no new items |

## Part A summary

Out of ~55 distinct items across Chapters 1–5: **6 genuinely new** (3.2 One Minute Rule, 4.2 State/Country schema headroom, 4.4 six missing card components, 4.5 Progressive Information display levels, 5.3 restaurant-info correction reports, 5.6 recommendation lifecycle badge), **0 new decisions**, everything else already `[BUILT]` or `[LOCKED]` elsewhere in the master doc. No chapter in this part introduced a conflict with a locked decision.

---

# PART B — CHAPTERS 6–11

## Chapter 6 — Home Experience

Master doc's §24.1 Discovery Dashboard table already tracks this chapter section-by-section with real build status (✅/⚠️/❌/⏸) — it is, in substance, an audit of this exact chapter already. Only checking for items §24.1 doesn't cover:

| # | Item | Status |
|---|---|---|
| 6.1 | 5 Home Objectives, full section list (Trending/Best Near You/Best In City/Worth Travelling/Hidden Gems/Trusted Foodies/Creator Picks/Community Places/Spotlight), Home Ranking priority (Intent→Trust→Location→Freshness→Trending→Popularity) | `[LOCKED]` 1:1 match to §24.1's table, already build-audited there |
| 6.2 | Hero quick-category chips with emoji (🍗 Biryani, 🍕 Pizza, 🥘 Meals, 🥞 Breakfast, ☕ Cafe, 🍰 Dessert) | `[NEW — cheap]` §24.1 confirms Hero search is built, but doesn't mention a quick-category chip row beneath it. Build step: add a static row of 5–6 high-frequency dish/category shortcuts under the hero search bar, each just a pre-filled search — no new backend, reuses existing search (§13). |
| 6.3 | GPS distance shown as human time ("5 min walk," "12 min drive") not raw meters/km | `[NEW — cheap]` Not explicit anywhere in the master doc's location or card specs. Build step: add a `formatDistance(meters, mode)` display helper used everywhere a distance currently renders (Restaurant Card, Nearby section) — pure frontend formatting, no schema change, walking-speed constant (~80m/min) is enough for MVP; driving-time needs the Maps Distance Matrix API, so gate driving-time strings behind a cheap cache the same way §16's Iron Cache Rule already governs other Maps calls. |
| 6.4 | Notification deep-links to direct context, never a flat list | `[LOCKED]` §15 `notifications/{notifId}.payload.deepLink` already designed this way |
| 6.5 | "Invest more design time in Home than any other screen" | `[LOCKED]` Philosophy, matches §22–§24.1's own weight in the master doc (the largest single IA section) |

## Chapter 7 — Universal Search Engine

Master §13 already covers structured-first search, intent auto-context, `query_tags` taxonomy, and People Search. Residual items:

| # | Item | Status |
|---|---|---|
| 7.1 | 15 named intents (Hungry Now, Best In City, Worth Travelling, Nearby, Family Dinner, Office Lunch, Breakfast, Late Night, Budget, Luxury, Cafe, Dessert, Explore, Healthy, Quick Bite) | `[NEW — narrow]` §13.1's `occasion`/`budget`/`vibe` tag groups cover most of these implicitly, but "Healthy" and "Quick Bite" aren't in the current taxonomy. Build step: add `healthy`, `quick_bite` to the `vibe:` tag group (§13.1) — a vocabulary extension, not new infrastructure. |
| 7.2 | Constraint filters: wheelchair access, pet friendly, delivery, takeaway | `[NEW — narrow]` §13.1's `constraint:` group has `veg, parking, late_night, no_wait` — missing `wheelchair_access`, `pet_friendly`, `delivery`, `takeaway`. Same fix as 7.1: vocabulary extension to the existing tag array, no schema change. |
| 7.3 | Smart Filters — show contextual filter options based on the query (Cafe → WiFi/Outdoor Seating; Biryani → Chicken/Mutton/Spicy) | `[NEW — Phase 3]` A real UX upgrade over static filter chips, but needs the tag vocabulary (7.1/7.2) populated with real data first to know which filters are worth surfacing per category — sequence after those, and after enough live `query_tags` data exists to make "smart" mean something (same "needs real usage data" reasoning as §11.2's deferred v2 ranking weights). |
| 7.4 | **Search Success definition** — a successful search is NOT "search completed," it's "user visited / saved / created a recommendation from it" | `[NEW — analytics]` Genuinely valuable and not defined anywhere in the master doc. Build step: define a `searchSuccessful` analytics event fired when a search session leads to a save/vote/check-in/recommendation within N minutes (N = TBD, start at 30) — informational analytics only per §19's cost guardrails, never a ranking input (matches the existing `viewCount`/`shareCount` "informational, not ranking" pattern, §15). |
| 7.5 | Discovery Feed mix — 70% trusted / 20% discovery / 10% experimental | `[DEFERRED — consistent]` A specific ratio for §11.6's feed layers 3–6, but tuning a 3-way mix with no usage data yet has the exact same problem §11.2 already names for the 5-weight v2 ranking formula — don't hardcode a ratio before real data exists to tune it against. |
| 7.6 | Voice Search, Image Search (future) | `[DEFERRED]` Explicitly future in the source too; no action, logged for completeness only |
| 7.7 | Zero Result Philosophy, Anti Filter Bubble, Trending Searches (local not global) | `[LOCKED]` Match §12 empty-state ladder, §11.6 discovery layers, and §11.4's per-bucket (city/area) leaderboards respectively |

## Chapter 8 — Recommendation Engine

| # | Item | Status |
|---|---|---|
| 8.1 | Recommendation formula, required-fields-only rule (restaurant+dish), 30-second post goal, Recommendation Types, optional Context tags | `[LOCKED]` Matches §5, §6, §27's flagged friction gap |
| 8.2 | Verification Levels 0–5 (Unverified/GPS/GPS+Photo/GPS+Photo+Time/Community Confirmed/Highly Trusted) | `[LOCKED — different scheme, not adopted]` Master doc's L1–L3+ (§10, locked, built, with real multipliers ×1.0–×2.0) is the system of record. The source's 6-level scheme isn't merged — two verification ladders would be a real inconsistency, not an enhancement. Noted so this isn't rediscovered as a gap later. |
| 8.3 | Duplicate Detection before publish, "Did you mean [X]?" prompt | `[LOCKED]` Same gap already flagged in master's own audit (§21.1 item 6) — confirmation UI is missing, not new scope |
| 8.4 | Community Confirmation (visit confirms accuracy → confidence++) | `[LOCKED]` §11.7 feedback loop, `[Phase 2]` |
| 8.5 | Editing rules — reason/photo/tags/creator link editable; restaurant/dish locked after community validation | `[NEW — narrow]` Not explicit in the master doc. Build step: add an edit-permission check in the recommendation-update Cloud Function — once a recommendation has ≥1 Helpful vote or ≥1 verified confirmation, `restaurantId`/`dishId` become immutable server-side (Security Rules deny the write); `reason`/`photo`/`signalTags`/`proofUrl` stay editable by the author indefinitely. Prevents bait-and-switch manipulation of an already-trusted recommendation. |
| 8.6 | Deleting Recommendations — soft delete → hidden → recoverable → permanent archive | `[NEW — narrow]` §15's `status` enum has `live｜suppressed｜removed` but no defined recovery window for an author-initiated delete (as opposed to moderation suppression). Build step: author-delete sets `status: "removed"` with a `deletedAt` timestamp; a scheduled function (§17's existing monthly-archive job) purges only after 30 days, matching the account-deletion pattern already locked at §19. Same job, same window, no new infrastructure. |
| 8.7 | Anti-Spam: copy-paste/near-duplicate caption text detection | `[NEW — narrow]` §14's fraud detection list (mass upload, duplicate photos, repeated text, bot behavior, fake GPS, fake accounts) already names "repeated text" — so this is effectively already `[LOCKED]` at §14; flagging only because it's easy to under-scope "repeated text" as exact-match when the real threat is near-duplicate (a few words changed). Implementation note for whoever builds §14's Cloud Function: use a text-similarity threshold, not exact-match. |
| 8.8 | Edge cases: dish removed (rec preserved, marked historical), restaurant renamed (rec auto-updates via reference), business ownership changed (rec unchanged) | `[NEW — narrow]` §18's E1–E11 has E7 (restaurant closes) but not these three. Build step: log as **E12** (dish removed from menu → recommendation and `dishId` reference both survive, dish shows "no longer on menu" badge, still searchable), **E13** (restaurant renamed → since recs reference `restaurantId` not a name string, this is already correct by construction — confirm the frontend never caches the name outside the reference), **E14** (ownership/claim transferred → recommendations are untouched by design, §7.2 already locks this; add to the edge-case list for completeness, not because behavior is undefined). |
| 8.9 | Recommendation Success ("user visited and confirmed it met expectations," not vanity metrics) | `[LOCKED]` Exact match to §11.7's feedback loop philosophy and the master doc's overall trust-over-popularity stance |
| 8.10 | Collections, Comments/replies, Sharing (web/WhatsApp/IG story/QR) | `[LOCKED]` Collections → Part 9 §36; Comments → D8 (§20, already an open decision, not new); Sharing → D13 |
| 8.11 | Product Laws (one rec=one dish=one restaurant, trust beats popularity, recs belong to people, quality beats quantity) | `[LOCKED]` Restates §5/§9/§7.2 |

## Chapter 9 — Trust Engine

| # | Item | Status |
|---|---|---|
| 9.1 | Trust Pyramid, Trust Is/Is Not, Trust Score internal-only (0–1000 in source vs. this doc's locked 0–100, scale only, not a real conflict), tier display, `trustSnapshot`, Helpful Vote weighting | `[LOCKED]` Matches §9.1–§9.2 in substance |
| 9.2 | Per-tier vote-count thresholds (5/25/100/300/1000 Helpful votes) | `[DEFERRED — source agrees]` The source's own text says "Numbers will evolve. Never hardcode" right after listing these — so this isn't actually being proposed as a locked spec even by its own source. No action; matches this doc's existing stance of not hardcoding tier thresholds without usage data (same reasoning as §11.2, §9.2's example numbers are illustrative only). |
| 9.3 | Trust Categories — 6 separate sub-scores (Contribution/Recommendation/Verification/Community/Creator/Restaurant Trust) instead of one unified score | `[DEFERRED]` A real architectural alternative to §9.1's single formula, but splitting into 6 tunable sub-scores has the same "needs real data to weight" problem already named for the v2 ranking formula (§11.2) — don't build a 6-way trust split with a two-person team's worth of usage data. Worth reconsidering only alongside §11.2's own v2 trigger. |
| 9.4 | Trust decay on inactivity pauses (doesn't drop); only violations drop trust immediately | `[NEW — narrow]` §9.1's formula lists `accountAgeFactor` (grows) and `penalties` (violations) but doesn't explicitly state that *inactivity alone never subtracts* — worth stating as an explicit rule so a future contributor doesn't accidentally add a time-based decay term to the trust formula (as opposed to the ranking formula, §11.1, where time-decay is correct and intentional). One-line addition to §9.1. |
| 9.5 | Community Moderation — a mid-tier of trusted *users* (not paid Editors) getting lightweight review-queue/duplicate-detection/verification powers | `[DECISION]` This is a real scope question, not a narrow addition — it introduces a privilege tier between Member and Editor that doesn't exist in §7's role table today. Logged as **D19**. |
| 9.6 | Reputation Dashboard / Trust Journey timeline (visual milestone history, not just a progress bar) | `[NEW — narrow]` §8.1 screen 7 (own Profile) shows tier + progress-to-next only. Build step: extend the same screen with a simple milestone list (tier-up dates, verification-count crossings) sourced from the existing `users.counts` + a lightweight `trustEvents` subcollection written by the same Cloud Function that already updates trust (§9.1) — additive logging, not new trust logic. Phase 2+, cosmetic. |
| 9.7 | Vote-ring detection (small clusters of accounts consistently upvoting each other) distinct from mass-account farming | `[NEW — narrow]` §14 lists "vote rings" as a detection target already but doesn't specify the mechanism. Implementation note: this needs a graph-pattern check (repeated voter↔author pairs), not just the velocity/fingerprint checks §14 already has — flag for whoever implements this specific line item of §14, not a new line item itself. |
| 9.8 | Tier-up notifications should state *why*, not just *that* ("12 helpful votes this month," not just "You're now a Trusted Foodie") | `[NEW — narrow]` Cheap payload addition to `notifications/{notifId}.payload.message` (§15) — content-writing detail for whoever builds §8.1 screen 13, not a schema change. |
| 9.9 | Restaurant Health Score concept (profile completeness/response speed/verification/update freshness) | `[NEW]` See Chapter 10, item 10.9 below — same concept, fuller context there. |
| 9.10 | Per-cuisine Trust specialization ("Biryani Expert," "Dessert Expert" — a biryani expert isn't automatically a dessert expert) | `[NEW — Phase 4]` Directly strengthens Principle #7 (specialists are authorities, never penalized) rather than conflicting with it. Natural v2 extension once §9.3's "needs real data" bar is cleared — log as a Phase 4 idea alongside §17's other deferred personalization work, not before. |
| 9.11 | Leaderboards not based on followers, based on trust/city/area/cuisine | `[LOCKED]` Already built as `/people` (People directory, ranked) per §24's sitemap |
| 9.12 | AI & Trust (assists detection, never bans, humans review), Recovery (bans only for fraud/spam/malicious/illegal) | `[LOCKED]` Matches Part 9 §37's AI-moderation philosophy and §19's existing Suspend/Warn/Restore admin actions |
| 9.13 | Product Laws (trust can't be purchased/transferred/inherited, trust is earned) | `[LOCKED]` Restates §9 top-level philosophy |

## Chapter 10 — Restaurant Ecosystem

| # | Item | Status |
|---|---|---|
| 10.1 | Restaurant lifecycle, official-vs-community info separation, Restaurant Dashboard sections, Gallery source-labeling, Menu system, Followers/Official Updates/Offers, Verification, Google Business integration, Business Profile (chains), Community Place → Official conversion, Duplicate merge, Restaurant APIs | `[LOCKED]` All match §7.2, §25, §16, §5.1, E5, or Part 9 §33 — no new content |
| 10.2 | Restaurant sub-types: Cloud Kitchen (delivery-only), Pop-up/limited-time kitchen — beyond today's binary `source: google｜community` | `[NEW — narrow]` Add an optional `restaurantType` enum field (`dine_in｜cloud_kitchen｜pop_up｜community`, default `dine_in`) for filtering/labeling only — purely descriptive, doesn't touch trust/ranking. Cheap, Phase 2+. |
| 10.3 | Restaurant Status beyond binary open/closed: temporarily closed, moved, permanently closed, seasonal | `[NEW — narrow]` Master's E7 only distinguishes closed/not. Build step: expand the status field to the fuller enum when the Editor Console (D14) ships restaurant-management actions — same UI surface, richer options, no separate feature. |
| 10.4 | Community Suggestions (address/timing/phone/menu fix, owner or admin approves) | `[LOCKED]` Same object as item 5.3 above (restaurant-info correction reports) — one build item, not two. |
| 10.5 | Restaurant Collections (Featured/Trending/Family Friendly/Date Night/etc.) | `[LOCKED]` Same underlying object as Part 9 §36's Food Lists/Collections — implementation note: that `collections/{id}` schema should support either `recIds[]` or `restaurantIds[]`, not force restaurant collections to be modeled as a collection of recommendations. Design note against Part 9 §36, not a new decision. |
| 10.6 | Nearby Alternatives on restaurant pages | `[LOCKED]` §25 item 5, already sequenced after Dish Page ships |
| 10.7 | QR code (table QR → recommend-after-meal) | `[LOCKED]` Part 9 §33 |
| 10.8 | Sponsored Restaurants, never affecting trust/ranking | `[LOCKED]` Phase 4 + Principle #2 |
| 10.9 | **Restaurant/Business Health Score** — profile completeness, response speed, verification status, menu/gallery freshness; owner-facing only, explicitly never touches recommendation trust or ranking | `[NEW]` Genuinely missing from both the master doc and Part 9. Build step: a Cloud-Function-computed score shown only in the (still deferred) Owner Dashboard (§7.2/§33) — inputs are boolean/simple: has hours set? has ≥3 photos? responded to claim review within 7 days? menu updated in last 90 days? This is a completeness *nudge* for the business, structurally identical in spirit to Community Health metrics (§37) but scoped to one restaurant. Sequence alongside the rest of the deferred Owner Portal — no reason to build it before §7.2 itself ships. |
| 10.10 | Product Laws | `[LOCKED]` Restates §7.2 |

## Chapter 11 — Dish Ecosystem

Already substantially covered by **Part 9 §32** (dish variants, complementary dishes, seasonal mapping, dish badges). Residual items Part 9 didn't capture:

| # | Item | Status |
|---|---|---|
| 11.1 | Dish-first philosophy, Dish Page (`/dish/:id`), Best Version/Nearby/Worth Travelling/Trending per dish, Restaurant Comparison, Dish Gallery, Dish Collections, Dish Tags, AI Metadata | `[LOCKED]` Matches §26 (Dish Page IA, already sequenced after Ranking Engine) and D15 |
| 11.2 | Dish Timeline ("old recs → current → trending → seasonal," history matters) | `[LOCKED]` Same concept as item 5.6 above (Recommendation Lifecycle display badge) applied at dish-aggregate level — one build item, not a separate one. |
| 11.3 | Dish Availability states (available/limited/seasonal/weekend-only/festival-only, future sold-out-today) | `[NEW — narrow]` Small enum on the `dishes/{dishId}` doc once it's actually written to (currently unused per D15) — cosmetic filter/label, no ranking impact. Bundle into the Dish Page build (§26), not a separate task. |
| 11.4 | Meal Mapping — AI auto-detects breakfast/lunch/dinner/late-night from photo EXIF timestamp | `[BUILT]` Already shipped — §8.1 screen 5's "EXIF-timestamp pre-selects meal tag" is exactly this |
| 11.5 | Community Tips as **structured** fields (best time, parking, wait time, spice level, cash/card, must-try combo) rather than free-text caption only | `[NEW — Phase 3, optional only]` A real enrichment, but must stay fully optional per Principle #4 (never add mandatory posting friction) — the 30-second post goal (§27) is already flagged as under strain from existing required fields; adding more, even optional ones, needs care. Recommend: if built, surface these as *post-publish* quick-add prompts ("add a tip?") rather than fields in the main post flow, so the core loop stays fast. |
| 11.6 | AI Dish Assistant (suggest dishes from stated taste preference) | `[LOCKED]` §13.2 preferences already serve this exact purpose as a ranking tie-breaker |

## Part B summary

**15 genuinely new items** (6.2 quick-category chips, 6.3 human-readable distance, 7.1–7.2 tag vocabulary extensions, 7.4 search-success analytics event, 8.5 edit-lock rule, 8.6 recommendation soft-delete window, 8.8 three new edge cases E12–E14, 9.4 inactivity-doesn't-decay rule, 9.6 trust journey timeline, 9.8 tier-up notification content, 10.2 restaurant sub-types, 10.3 fuller restaurant status enum, 10.9 Business Health Score, 11.3 dish availability states, 11.5 structured tips), **1 new decision** (D19 — community-moderator privilege tier), **2 explicitly deferred-not-adopted** (9.3 six-way trust split, 8.2's alternate verification-level scheme — noted so they aren't rediscovered as gaps).

---

# PART C — CHAPTERS 12–14

## Chapter 12 — Social Graph & Community Ecosystem

Following, Followers-never-affect-trust, Save/Collection system, Food Trails, Sharing, Community Verification, Reputation Loop, Social Notifications, "good vs. bad gamification" (badges from real achievement vs. streaks/points/coins), Food Passport, Community Health, Anti-Abuse, and Blocking are all already `[LOCKED]` — matching §11.6, §9.1, Part 9 §34/§36, §11.7, §15, §37, and §14 respectively. Residual items:

| # | Item | Status |
|---|---|---|
| 12.1 | Activity Feed (chronological log of a user's own recommended/saved/visited/voted/followed actions, separate from the main content feed) | `[NEW — low priority]` Not in the master doc's screen map (§8.1) or sitemap (§24). This is closer to a personal-journal view than a discovery feature — arguably redundant with the already-built own-Profile screen (§8.1 screen 7, already lists recommendations/saves/trust). Recommend: don't build as a separate screen; if wanted, it's a filter/tab on the existing Profile screen. Not logged as a decision — low enough stakes to leave as a "build only if requested" note. |
| 12.2 | Mentions (`@handle` inside a recommendation, referencing another user/creator/restaurant) | `[DEFERRED — tied to D8]` Meaningless without some form of reply/comment surface to mention *within* — sequence this alongside whichever way D8 (comments/replies, §20) resolves, not before. If D8 resolves to "no comments," mentions likely don't apply either. |
| 12.3 | Achievements/milestone badges (First Recommendation, 10 Helpful Votes, 100 Saves, First Community Place, Verified Claim, Food Trail Created, Collection Shared) | `[NEW — consolidate with 9.6]` Same underlying mechanism as the Trust Journey timeline already logged at item 9.6 (Part B) — a lightweight `trustEvents`-style log can emit both tier-ups *and* one-off milestones from the same write path. One build item, not two. |
| 12.4 | Friends (contacts sync / Google contacts / QR-based friend-finding), explicitly "never mandatory" | `[DEFERRED — high caution]` The master doc's own §2 positioning table already cites forced-friend-invite as a **documented Beli failure mode** ("4-friend invite before use → abandonment") and Principle #4 exists specifically to prevent repeating it. If ever built, it must be fully optional and never gate any core action — flagging with extra weight here precisely because this is the single feature in the whole Product Bible most likely to violate an already-hard-learned lesson if built carelessly. |
| 12.5 | Referral System (invite → both discover → reward is recognition, not money) | `[DEFERRED]` `[Phase 4]` in the source too; no conflict, just logged for completeness |
| 12.6 | General "activity visibility" privacy toggle (beyond the already-covered private-collections toggle, Part 9 §36) | `[NEW — low priority]` Given this is fundamentally a discovery/reputation platform where public recommendations *are* the product, most profile activity is meant to be public by design — a blanket visibility toggle is lower-value here than on a general social network. Phase 3+, not urgent. |

## Chapter 13 — Business Platform & Restaurant Owner Ecosystem

Nearly all of this chapter is already captured at Part 9 §33 (business hierarchy, staff roles, subscription tiers → D16, QR) or matches existing `[Phase 2/DEFERRED]` §7.2 scope directly. Residual items Part 9 didn't capture:

| # | Item | Status |
|---|---|---|
| 13.1 | Extended staff-role list (Marketing Manager, Franchise Manager, Corporate/Regional Administrator) beyond Part 9 §33's Owner/Manager/Editor/Viewer | `[DEFERRED]` Same "defer until a real chain owner asks" reasoning already logged at Part 9 §33 — this just confirms the source's own list is even longer than what was already deferred, not a reason to reconsider. |
| 13.2 | Customer Insights — anonymous only, never expose personal data to business owners | `[LOCKED]` Reinforces §19's existing privacy stance exactly; no new action, useful confirmation that the Owner Portal design already had this right |
| 13.3 | Third-party integration roadmap (Google Business/Maps done; Instagram/Facebook/WhatsApp/Swiggy/Zomato/Website/reservation systems; future POS/inventory/payments) | `[DEFERRED — informational]` Each of these is its own partnership/API-integration project, well beyond MVP scope and not sequenced anywhere in §17. Logged as a Phase 4+ wishlist, not actionable now — flagging so it isn't lost, not because anything should start on it. |
| 13.4 | AI assistance for business owners (auto-write menu descriptions, detect missing info, SEO suggestions, gallery suggestions, flag outdated hours) | `[DEFERRED — Phase 4]` Master's AI Service (§20) is currently scoped to recommendation/search assistance only — extending it to business-facing tasks is a real scope increase, and lower priority than the Owner Portal itself (§7.2), which isn't built yet. Sequence after, not alongside. |
| 13.5 | Business moderation consequences (spam/fake offers/misleading info → lose verification/campaign access/business privileges; community recommendations always untouched) | `[LOCKED]` Reinforces the ownership-boundary principle (§7.2) exactly as already locked — good confirmation, no new build |

## Chapter 14 — Creator Platform & Influencer Ecosystem

The bulk of this chapter is already resolved by Part 9 §34 and the locked §27 Creator Evidence Model — including the explicit recommendation *against* building a separate Creator Trust/CKS system, which several items below would otherwise have reintroduced. Residual items:

| # | Item | Status |
|---|---|---|
| 14.1 | Creator Types taxonomy (Blogger/Vlogger/IG/YouTube/Local Reviewer/Critic/Home Chef/Travel Creator/Street Food Explorer) | `[LOCKED — descriptive only]` A free-text/tag field on the eventual Creator Profile (D12), not a system with build implications of its own |
| 14.2 | 5-level Creator Verification ladder (Verified Identity → Verified Social → Trusted Creator → Community Creator → Featured Creator), separate from account verification | `[DEFERRED — not adopted]` Same reasoning Part 9 §34 already applied to the Creator Knowledge Score: don't build a second, parallel verification/trust system for creators. Existing account verification (§10, locked) plus the `proofUrl` evidence trail already shipped are enough — a creator who wants more visibility earns it the same way every user does, through §9's trust engine, not a creator-only ladder. |
| 14.3 | Supported platforms list (Instagram/YouTube/Facebook/Threads/X/Website/Blog now; TikTok/Snapchat/Podcasts future) | `[LOCKED — feeds D12]` This is a direct, useful input to D12's still-open "which platforms" question (§20) — not a new decision on its own, just narrows the existing one. |
| 14.4 | OAuth account-connection flow for linking social platforms | `[NEW — narrow, sequencing note only]` Standard OAuth, no special design needed — just noting it's part of whatever gets built once D12 resolves, not a separate feature to plan around. |
| 14.5 | Media rule: max 1 Instagram + 1 YouTube link per recommendation | `[LOCKED — confirms existing design]` The shipped single `proofUrl` field already enforces effectively the same constraint; no change needed |
| 14.6 | Creator profile → creator-filter on People Search (§13.3) | `[NEW — narrow]` Once D12 ships a Creator Profile with connected platforms, People Search results could show a small "Creator" badge/filter alongside the existing tier badge — cheap UI addition once D12 lands, not before |
| 14.7 | Creator Analytics/Reputation/Badges/Leaderboards as creator-specific systems | `[DEFERRED — not adopted]` Same reasoning as 14.2 and Part 9 §34 — reuse the existing Trust Score and `/people` leaderboard (already built, item 9.11 above), don't build parallel creator-only versions |
| 14.8 | Restaurant-invites-creator collaboration, creator remains independent, can't be forced to remove negative content even if sponsored | `[LOCKED]` Reinforces the ownership-boundary and Principle #2 exactly as already locked — good confirmation |

## Part C summary

**5 genuinely new items** (12.1 Activity Feed — low priority, 12.6 activity-visibility toggle — low priority, 14.4 OAuth connection flow — sequencing note, 14.6 Creator filter on People Search), **0 new decisions** (12.4 Friends flagged with extra caution but doesn't need a formal decision entry — it's already governed by existing Principle #4), **4 explicitly deferred-and-not-adopted** (12.2 Mentions tied to D8, 13.3 integration roadmap, 13.4 business AI assistance, 14.2/14.7 separate creator verification+analytics systems — all logged so they aren't rediscovered as gaps, none are being built).

---

# PART D — CHAPTERS 15–17

## Chapter 15 — Location, Maps & Discovery Engine

The three-location-type model, Discovery Radius Engine, and Travel/Vacation Mode are already captured at **Part 9 §35**. GPS-on-open-only, State A/B guest flows, browser storage fields, the Iron Cache Rule, reverse-geocoding cache, and location privacy/analytics are all `[LOCKED]`, matching §11.3, §8, §15, §16, and §19 exactly. Residual items:

| # | Item | Status |
|---|---|---|
| 15.1 | Temporary GPS cache — hold current-location fix for 30 minutes to cut repeat reads | `[NEW — narrow]` §11.3 already says "GPS captured on app open/search only, no background tracking" but doesn't specify a session-cache duration. Build step: cache the GPS fix client-side for 30 minutes (matching the source's own number, which is reasonable) before re-requesting — same cost-reduction spirit as §16's Iron Cache Rule, just applied to the device GPS call instead of the Maps API call. |
| 15.2 | City/Area detection fallback order: GPS → Browser storage → Profile → Manual selection → Default | `[NEW — narrow]` Implied by §8's State A/B and §11.3 but never written as an explicit ordered sequence. Worth codifying as a one-line implementation note for whoever builds the location-detection hook, not a new feature. |
| 15.3 | Smart Radius — denser cities get a smaller default search radius, sparser areas get a larger one | `[NEW — narrow]` A refinement to the Discovery Radius Engine already logged at Part 9 §35 — fold into that same build item (a radius lookup that also considers restaurant density per area, not just intent), not a separate task. |
| 15.4 | Dedicated multi-pin Map/Explore view (as opposed to the single-restaurant Maps embed already built at §25) | `[NEW — Phase 3, moderate value]` Master's screen map (§8.1) has no visual, multi-pin discovery mode — search results and feed are list-based only. A map view showing many recommendation/restaurant pins at once (with Food Trail routes overlaid once §34 ships) is a real, distinct interaction mode some users will want, especially for "worth travelling" and area-browsing use cases. Not urgent — sequence after the Ranking Engine and Search chip system are solid, since a map view is only as good as the ranked data underneath it. |
| 15.5 | Edge case — GPS reads as technically valid but implausible (e.g., jumps mid-session) → ask the user to confirm rather than silently trusting it | `[NEW — narrow]` §18's edge-case list (E1–E14 after this file's earlier additions) doesn't cover GPS-plausibility, only GPS-unavailable (E1). Log as **E15**: implausible GPS delta within a session → treat like the existing geo-mismatch suppression (§10) rather than a hard block — silent, non-shaming, same pattern already locked for every other trust-adjacent ambiguity in this doc. |

## Chapter 16 — Design System & Component Architecture

Master §4's design philosophy, brand personality, exact color palette (with hex values and rationale), typography direction, and voice/tone are **more specific** than this chapter's generic "Apple × Airbnb × Linear × Notion" framing — nothing from the source's philosophy layer is worth merging over what's already locked. What the source has that §4/§28 don't yet define are concrete **numeric design tokens**:

| # | Item | Status |
|---|---|---|
| 16.1 | Spacing scale — 8pt grid: 4/8/12/16/24/32/40/48/64/96 | `[NEW]` §4.2 defines color tokens but no spacing scale. Build step: adopt this scale as `--pt-space-*` CSS variables (Tailwind config `spacing` overrides) — a sensible, standard 8pt system, cheap to adopt exactly as given, no reason to invent a different one. |
| 16.2 | Border radius scale — Small 8 / Medium 12 / Large 16 / Hero 24 / Floating 28 | `[NEW]` Same treatment as 16.1 — adopt as `--pt-radius-*` tokens. |
| 16.3 | Elevation system — Level 0 flat / 1 card / 2 hover / 3 modal / 4 overlay, soft shadows only, never heavy | `[NEW]` Not defined anywhere in §4 or §28. Build step: define 5 shadow tokens matching these levels, apply consistently instead of ad hoc `box-shadow` values per component. |
| 16.4 | Layout grid — Desktop 1440px container / 12-column; Tablet 8-column; Mobile 4-column | `[NEW]` §22's desktop-first amendment sets *process* (design desktop first) but not the actual grid numbers. Build step: adopt this as the concrete grid spec for the desktop-first pass §22 already committed to. |
| 16.5 | Component states — every component must define default/hover/focus/pressed/disabled/loading/success/error | `[NEW — narrow, extends §28]` §28 already requires loading/empty/error/success per component (confirmed as the working pattern on Home/Search/Saved). Extend that same checklist to explicitly include hover/focus/pressed/disabled — mostly a design-review reminder, not new engineering, since interactive elements already need these states to function at all; the gap is treating them as a documented requirement, not an accident of CSS. |
| 16.6 | Icon library — Lucide or Phosphor, outlined, 24px base | `[DECISION]` Master doc doesn't commit to an icon library anywhere, and one is needed before real component work proceeds. Logged as **D20** — default **Lucide** (pairs natively with the Tailwind/shadcn ecosystem this doc's stack already implies, §16 tech stack) unless the owner prefers Phosphor. |
| 16.7 | Dark mode — designed simultaneously with light, warm dark palette, never OLED black | `[DECISION]` §4.2's palette is light-only today; dark mode isn't mentioned anywhere in the roadmap (§17) or design tokens. Logged as **D21** — build dark-mode tokens now alongside the still-open typography decision (D3), or explicitly defer past Phase 3? Default if unresolved: defer — light-only ships first, matching this doc's general "don't build ahead of real need" discipline elsewhere (§11.2, §9.3), revisit once the core loop and district launch are stable. |
| 16.8 | Glassmorphism / Neumorphism / Brutalism — all explicitly rejected | `[LOCKED]` Consistent with §4's already-minimal, premium, non-trendy direction — no conflict, good confirmation |
| 16.9 | Figma component rules (auto layout, variants, tokens, never detach) | `[NEW — process note, not code]` Only relevant if/when Figma design work happens for this project; this doc's current design process is code-first (Tailwind tokens, §16 stack), not Figma-first. Log as a standard to follow *if* Figma work starts, not an action item now. |
| 16.10 | Engineering rule: "Server Components where possible, Client Components only when needed" | `[LOCKED — not adopted]` Assumes a React Server Components-capable framework (Next.js). This doc's stack is a Vite SPA (§16, locked) — there is no server/client component split in that architecture. Same category as Part 9 §38's Next.js stack note: the source's framework assumption doesn't transfer, and this doc's own stack decision is unchanged by it. |
| 16.11 | "PTDL" — a named, owned design language rather than a generic component library | `[LOCKED]` Already effectively in motion — §4.2's tokens are already named with a `--pt-` prefix, i.e. already a proprietary token namespace, not borrowed from Material or any generic system. No new action, just confirms the existing direction is right. |

## Chapter 17 — Product Intelligence & Personalization Engine

Most of this chapter maps directly onto §13.2 (preferences as tie-breaker) and the already-reserved `tasteSeeds[]` field (§15) — worth calling out explicitly: **this doc already anticipated and named the exact thing this chapter calls a "Taste Graph."** The schema comment at §15 literally reads *"fuels future Taste Graph. Write from day one."* That's an unusually direct hit, not a gap.

| # | Item | Status |
|---|---|---|
| 17.1 | **Explainable AI** — every recommendation/ranking decision should be able to say *why* it was shown ("You like Hyderabadi food · 12 trusted foodies confirmed · 8 min away") | `[NEW]` This is Chapter 1's Law 9 (item 1.3, Part A) fully specified here — consolidating both into one build item. Genuinely valuable and genuinely missing: nothing in the master doc currently surfaces *why* a card ranked where it did. Build step: a "Why this?" expandable note on Recommendation/Restaurant cards, template-filled from data the ranking formula (§11.1) and preferences (§13.2) already compute server-side — trust tier, verification level, proximity, matched preference tags. **No new AI model needed** — this is presentation of existing signals, not a new inference system. Cheap relative to its trust payoff; reasonable Phase 2/3 addition. |
| 17.2 | Cold Start (city → trending → community favorites → nearby → hidden gems, never ask "what do you like") | `[LOCKED]` §12's empty-state ladder + Principle #4's zero-mandatory-questions rule, exact match |
| 17.3 | Taste Graph / Taste Dimensions (cuisine, dish, budget, meal time, travel distance, spice, exploration score — auto-accumulated, no forms) | `[LOCKED]` Already reserved at `users.tasteSeeds[]` (§15), `[DEFERRED consumption]` — this chapter is effectively documentation for a field that already exists in the schema |
| 17.4 | Exploration Score (explorer index derived from behavior, used only for recommendation mix) | `[DEFERRED — consistent]` A natural v2 consumer of `tasteSeeds[]` once it has real data — same "don't tune what you can't measure yet" reasoning as §11.2, not a new item to plan around now |
| 17.5 | Confidence Engine (per-recommendation internal confidence score, shown to users only as a Trust Label) | `[LOCKED — already achieved]` This is what §11.1's `rankingScore` (trust × verification × weighted-helpful × time-decay) already *is*, in substance — no second, parallel confidence score needed |
| 17.6 | Weather Intelligence (rain → pakoda/tea; summer → juice/ice-cream) | `[DEFERRED — Phase 4]` Needs an external weather API dependency not currently in scope anywhere in §16/§20 — genuinely new integration surface, low priority relative to core-loop work |
| 17.7 | Festival Intelligence (Ramadan → Haleem, dynamic homepage) | `[LOCKED]` Same mechanism as the seasonal dish mapping already logged at §32 (Part 9) — Editor-curated via `editorsPicks`, not a new system |
| 17.8 | Travel Intelligence (Goa trip → seafood/beach suggestions) | `[LOCKED]` Direct consequence of the Destination-City model already logged at Part 9 §35, not separate scope |
| 17.9 | Group Intelligence (dining alone/date/family/office/kids) | `[LOCKED — mostly]` Already substantially covered by `query_tags`' existing `occasion:` group (date, friends, family, solo, work_lunch — §13.1); "kids" specifically isn't in the current vocabulary — small tag-vocabulary addition if wanted, same pattern as items 7.1–7.2, not worth its own entry |
| 17.10 | Decision Speed modes — "Quick Decision" (one recommendation) vs. "Deep Discovery" (many comparisons), user-selectable | `[NEW — low priority]` An interesting UX experiment, not currently in the Home/Search IA (§24.1/§13). Worth a Phase 3+ design spike, not a committed build item — flagging as an idea, not a plan. |
| 17.11 | Recommendation Diversity ratio (80% known interest / 20% exploration) | `[DEFERRED — consistent]` Same hardcoded-ratio caution already applied to item 7.5 (Discovery Feed mix) — one instance of the same "don't guess weights without data" rule, not two separate concerns |
| 17.12 | Feed Intelligence formula — Intent × Trust × Location × Taste × Freshness × Exploration × Time | `[DEFERRED — consistent]` This is what §11.2's already-deferred v2 ranking formula would look like if built today — confirms the shape of that future work, doesn't change its "needs real usage data first" status |
| 17.13 | AI Suggestions / AI Boundaries (can suggest/rank/detect/predict; cannot write opinions, fake recommendations, or replace human judgment) | `[LOCKED]` Matches §20's AI Service scope and the "AI never invents" boundary already established throughout this doc (§8's AI Assistance rules, Part 9 §34's CKS discussion) |
| 17.14 | Restaurant/Visit Prediction (predictive suggestions on entering a new area; save-triggered reminders) | `[DEFERRED — Phase 4]` Needs both usage-data volume and push-notification infrastructure maturity beyond what §17's current roadmap has reached |
| 17.15 | "Food Intelligence Graph" (FIG) — connect User↔Taste↔Dish↔Restaurant↔Area↔City↔Trust↔Creator as one queryable graph | `[LOCKED — already the design]` The reference-based Firestore schema (§15, "relationships use references, not nested documents") already *is* this graph structurally. Named differently, same substance — and its eventual analytical/query needs are exactly what §16.1's already-logged Postgres+pgvector migration trigger anticipates. No new decision, no new schema — this is confirmation the schema was already designed with this in mind. |

## Part D summary

**9 genuinely new items** (15.1 GPS session cache, 15.2 location-detection fallback order, 15.3 Smart Radius refinement, 15.4 Map/Explore view, 15.5 edge case E15, 16.1–16.5 five design-token additions treated as one build item, 17.1 Explainable AI, 17.10 Decision Speed modes), **2 new decisions** (D20 icon library, D21 dark-mode timing), **7 explicitly deferred-and-confirmed-consistent** (17.4, 17.6, 17.11, 17.12, 17.14 need-more-data-first items; 16.10 Server Components stack mismatch; 17.5/17.15 already-achieved-differently items) — the highest ratio of "already right, just not named that" in any part so far, which is a good sign for how well the master doc's existing architecture holds up against a much broader source.

---

# PART E — CHAPTERS 18–21

## Chapter 18 — Firebase Backend Architecture & Knowledge Graph

The collection list, design principles (references not nesting, event-driven, Cloud-Function-only writes to derived fields), caching strategy, and cost-optimization rules are all `[LOCKED]`, matching §15/§16/§19/§20 almost line for line — this chapter and this doc's own backend sections were clearly arrived at independently but converge closely. The Next.js tech-stack mismatch is already logged at Part 9 §38 — not repeated here. Residual items:

| # | Item | Status |
|---|---|---|
| 18.1 | `restaurant_claims` as its own audit-trail collection, separate from a status field on the restaurant doc | `[NEW — narrow]` §15's schema tracks claim status as `restaurants/{id}.ownerClaimStatus` (a single current-state field) — there's no history of *past* claim attempts (rejected claims, prior owners). Worth adding a lightweight `restaurantClaims/{claimId} { restaurantId, claimantUid, status, reviewedBy, reviewNotes, createdAt }` log once §7.2 actually ships, mirroring the existing `applications/{uid}` Tastemaker-queue pattern — same shape, different subject. Not urgent before §7.2 itself is built. |
| 18.2 | `verification_requests` as one unified collection across restaurant claims, business verification, creator verification, and community-place review | `[NEW — recommendation]` Today these four verification flows each have their own ad hoc status field/collection (`ownerClaimStatus`, `applications/{uid}` for Tastemaker, community-place approval inline). Recommend: when the Editor Console (D14) is actually built, give it **one** unified `verificationQueue/{id} { type, subjectId, requestedBy, status, reviewedBy, reviewNotes }` collection to render as a single queue UI with a type filter, rather than four separate admin screens. A UI/data-modeling recommendation for D14's implementation, not a new decision — D14 already says "build now," this just specifies *how*. |
| 18.3 | `cities`/`areas` as first-class collections rather than string fields | `[DEFERRED]` Same reasoning as item 4.2 (Part A) — only matters once there's a second city; a single-district Phase 3 launch doesn't need it. Not repeated as a separate item, cross-referenced. |
| 18.4 | Everything else — Firestore design rules (≤2 levels nesting, references over nesting, doc <500KB, UUIDs not names), Cloud Function authority, event-driven triggers, image optimization, caching layers, AI-ready metadata fields, cursor-based pagination, soft delete, scheduled backups | `[LOCKED]` Matches §15/§16/§19/§20 in substance and often in near-identical wording — no new content |

## Chapter 19 — Firestore Schema & Security Rules

This is the most detailed chapter in the source, and also the one with the highest overlap with an already-locked, already-built master doc section (§15, §19B — note the source independently arrived at the exact same "19B" sub-numbering for its security-rules chapter, which this doc already used first). Field-by-field, collection-by-collection, the source restates §15's schema in less precise form (no real field names, no real types) — not re-derived here. Residual items with real, addable content:

| # | Item | Status |
|---|---|---|
| 19.1 | Explicit Role × Collection permission matrix table | `[NEW — documentation]` §7 and §19B describe permissions per-role in prose; there's no single table cross-referencing every role against every collection's read/write/delete rights. Build step: assemble one reference table (Guest/Member/Creator/Business Owner/Moderator/Admin × users/restaurants/recommendations/dishes/menus/offers/businessProfiles/reports/analytics) directly from what §7/§7.2/§14/§19B already decided — a documentation consolidation for whoever writes the actual `firestore.rules` file, not a new decision, since every cell is already answerable from existing locked text. |
| 19.2 | File upload validation — allowed types (JPEG/PNG/WEBP, future HEIC), rejected types (executables/ZIP/APK/unknown), size limits per upload type (profile 5MB, restaurant 10MB, recommendation 8MB, gallery 15MB) | `[NEW]` §15's Storage section names *what* gets uploaded but not validation rules or size ceilings. These specific numbers are reasonable defaults — adopt as-is for the Storage Rules implementation, auto-compress above them per §15's existing "automatically compress" note. |
| 19.3 | Rate limits beyond what §14 already locks | `[LOCKED — one conflict noted]` §14 already locks recommendations at **5/hour** (built into the Anti-Abuse Stack per the v1.4 changelog); the source proposes **10/hour** — this doc's number is already locked and shipped, the source's isn't adopted. Two numbers the source has that §14 doesn't yet specify are genuinely additive, not conflicting: **restaurant claim, 3/day** and **image upload, 30/day** — reasonable defaults to fold into §14's velocity-limit list since no number exists there today. |
| 19.4 | Audit log entries should capture previous-value/new-value diffs, not just the action name | `[NEW — narrow]` §19's "every admin action is logged" requirement doesn't specify diff-level detail. Cheap addition once the Editor Console (D14) is built: log `{previousValue, newValue}` alongside `{who, what, when}` for any admin edit — standard audit-log practice, worth stating explicitly so it isn't built as action-name-only logging by default. |
| 19.5 | Everything else — Zero Trust chain (Auth → Rules → Functions → DB), per-collection read/write ownership rules, App Check mandate, secrets in Secret Manager never frontend, Google Maps key restriction, account deletion 30-day soft delete → anonymized recommendations, security monitoring, disaster recovery | `[LOCKED]` Matches §19B nearly verbatim in places — this doc's security section was already this thorough |

## Chapter 20 — Backend Service Architecture & Cloud Functions

The event-bus pattern and domain-service folder convention are already logged at Part 9 §38. Residual items:

| # | Item | Status |
|---|---|---|
| 20.1 | Explicit `maps/`, `media/`, `moderation/` service folders | `[NEW — narrow]` §20's existing folder structure (`auth/users/restaurants/dishes/recommendations/trust/business/creators/analytics/search/notifications/ai`) is already an near-exact match to the source's domain-service list — these three are the only named services missing from the explicit folder list. Fold into the same Part 9 §38 housekeeping item, not a separate task. |
| 20.2 | Dead-letter queue for failed async events (retry → DLQ → alert → manual review) | `[NEW — Phase 2+]` §20's error-handling section doesn't yet describe a DLQ pattern — reasonable reliability improvement once the event-bus pattern (Part 9 §38) is actually implemented, not before there's an event bus to attach it to. |
| 20.3 | API versioning (`/api/v1/`, future `/v2/`) | `[DEFERRED]` No external API consumer exists yet (mobile app is Phase 4, §17) — versioning a surface nobody outside this codebase calls yet is premature. Revisit alongside the Phase 4 mobile-app trigger. |
| 20.4 | Deployment pipeline — GitHub → CI/CD → tests → deploy functions/rules/hosting → monitoring | `[NEW — Phase 2+ ops]` Today's deploy path (§16) covers hosting via Vercel's GitHub integration, but not a described CI/CD gate for Cloud Functions and Security Rules specifically (test-gated deploys). Worth building once the team grows past solo deploys — an operational maturity item, not a product feature, low urgency now. |
| 20.5 | Testing strategy — unit, integration, Firestore emulator, Functions emulator, security-rule tests, performance tests | `[NEW — formalizes existing practice]` The master doc's own v1.4 changelog already mentions "42 tests" shipped alongside the Anti-Abuse Stack work — so testing is already happening, just not written down as a standard anywhere. Worth adding one line to §19's non-functional standards: baseline is Firestore + Functions emulators plus explicit Security Rule tests, matching what's already been done in practice. |
| 20.6 | Performance targets — function cold start <500ms, function execution <2s, recommendation publish <1s (search <300ms already matches §19 exactly) | `[NEW — narrow, consolidated with 21.7]` Two genuinely new numbers to fold into §19's existing performance-target list alongside the dashboard/analytics numbers logged at 21.7 below — one combined addition to §19, not two separate ones. |
| 20.7 | Everything else — Cloud Function types (HTTPS/Callable/Firestore Trigger/Storage Trigger/Scheduled/Pub-Sub), queue architecture for heavy operations, logging/monitoring discipline | `[LOCKED]` Standard Firebase patterns already implied throughout §15/§19/§20 |

## Chapter 21 — Admin CMS & Operations Platform

Role hierarchy (→ D18), homepage CMS, and feature flags/Remote Config are already logged at Part 9 §37. Residual items:

| # | Item | Status |
|---|---|---|
| 21.1 | Explicit "transfer restaurant ownership" admin action (re-point `claimedBy` to a different business profile) | `[NEW — narrow]` §7.2/§19B describe claiming but not a transfer-between-owners path (e.g. a restaurant sold to a new owner). Fold into the eventual Editor Console's restaurant-management actions once D14/§7.2 ship — a single additional admin action, not new infrastructure. |
| 21.2 | Report `type` enum should include `fake_business` and `copyright_claim` | `[NEW — narrow]` Extends the same enum already flagged growing at item 5.3 (restaurant-info correction) — one schema field, three additive values total across this file (`restaurant_info_correction`, `fake_business`, `copyright_claim`), not three separate build items. |
| 21.3 | Unified Verification Center UI across all four verification types | `[LOCKED]` Same recommendation already made at item 18.2 above — one collection, one queue screen, cross-referenced not repeated |
| 21.4 | Admin global search (users/restaurants/recommendations/businesses/creators/reports/logs from one search box) | `[NEW — Phase 2+]` A real Editor Console convenience feature, but sequenced after the "minimal skeleton" D14 already calls for (a working moderation queue matters more than a search box across it) |
| 21.5 | Bulk actions (approve/reject/archive/merge/notify/export, role-limited) | `[NEW — Phase 2+]` Same sequencing logic as 21.4 — real efficiency gain, but only worth building once single-item moderation is proven and the queue is big enough that bulk action saves real time |
| 21.6 | Support ticketing center with per-issue history | `[DEFERRED — low priority]` A genuine customer-support system, well beyond what a 1–2 person team (this doc's own stated team size, §21.5 of the master doc) needs at MVP — log as a future idea only |
| 21.7 | System Settings — a general non-technical config panel (app/security/AI/notifications/maps/search/moderation/storage) instead of code-level constants files | `[DEFERRED — consistent]` This doc already prefers "one constants file" for tunable values (e.g. §13's meal-window boundaries) — simpler and sufficient until a non-technical team member needs to change these without a developer, which isn't the case yet. Same "don't build ahead of real need" reasoning as D18/D19. |
| 21.8 | Admin dashboard/analytics performance targets — dashboard load <2s, analytics <3s | `[NEW — narrow, consolidated with 20.6]` Folded into the single §19 performance-target addition noted at 20.6 — not a separate build item |
| 21.9 | Everything else — Dashboard Overview cards, User Management + timeline (→ consolidates with item 9.6's Trust Journey), Recommendation Moderation queue, AI Moderation (flag-only), Restaurant/Community Place management actions, Business/Creator verification, Analytics Dashboard, Fraud Detection, Data Export, Disaster Recovery, Admin Notifications | `[LOCKED]` Matches Part 9 §37 and §19B closely — no new content beyond what's cross-referenced above |

## Part E summary

**11 genuinely new items** (18.1 restaurant-claims audit trail, 18.2 unified verification-queue recommendation, 19.1 permission matrix table, 19.2 file-upload validation spec, 19.3 two new rate-limit numbers, 19.4 audit-log diffs, 20.1 three service folders, 20.2 dead-letter queue, 20.4 CI/CD pipeline, 20.5 testing standard, 20.6+21.8 combined performance-target addition, 21.1 ownership-transfer action, 21.2 two report-type additions, 21.4 admin global search, 21.5 bulk actions — fifteen, not eleven, corrected count), **0 new decisions** (this part's items are all narrow additions or explicitly deferred, nothing rose to needing an owner call), **1 conflict resolved in favor of the already-locked doc** (19.3's recommendation-rate-limit number — this doc's 5/hour stands, source's 10/hour is not adopted), **3 explicitly deferred as premature for current team size/stage** (20.3 API versioning, 21.6 support ticketing, 21.7 config panel).

---

# MASTER SUMMARY

## Coverage confirmation

All 21 written chapters of the Product Bible (Ch22 was announced in the source's own table of contents but never written — nothing existed there to check) were read in full and checked item-by-item, continuing directly from the earlier Part 9 cross-check (§31–§40 of the master build document, chapters 8–21's first pass). Nothing in the source was skipped; every distinct rule, feature, formula, list, or edge case was assigned one of `[BUILT]` / `[LOCKED]` / `[NEW]` / `[DEFERRED]` / `[DECISION]`. Pure markdown flow-diagram artifacts (arrows, one-word connector lines) were not transcribed individually — their meaning was captured wherever the surrounding concept was addressed.

## Totals across Parts A–E (this file) plus Part 9 (already in the master doc)

| Source | New items proposed | New decisions logged | Explicitly deferred/not-adopted |
|---|---|---|---|
| Part 9 (master doc, Ch 8–21 first pass) | ~20 | D16, D17, D18 | several — see master doc §40 |
| Part A (Ch 1–5) | 6 | 0 | 0 |
| Part B (Ch 6–11) | 15 | D19 | 2 |
| Part C (Ch 12–14) | 5 | 0 | 4 |
| Part D (Ch 15–17) | 9 | D20, D21 | 7 |
| Part E (Ch 18–21) | 15 | 0 | 4 (incl. 1 numeric conflict resolved in favor of the locked doc) |
| **Total, this file (Parts A–E)** | **~50 new items** | **D19, D20, D21** | **17** |

Combined with Part 9, the two passes together identified roughly **70 genuinely new items** across the entire Product Bible, **6 new owner decisions (D16–D21)**, and confirmed the overwhelming majority of the source — the trust/ranking/verification/schema/security core especially — already exists in more precise, implementable form in the master build document than in the source that inspired this check.

## What "new" actually means here — sizing reality check

Not all ~70 new items are equal weight. Rough breakdown by what kind of action each implies:

- **Pure documentation/consolidation** (no code): permission matrix table (19.1), unified verification-queue *recommendation* (18.2), a handful of naming/cross-reference notes — safe to fold into the master doc any time, zero build risk.
- **Cheap, additive, no schema risk** (small enum extensions, tag-vocabulary additions, formatting helpers, folder renames): the majority of items — e.g. 6.3 human-readable distance, 7.1/7.2 tag vocabulary, 10.2/10.3 restaurant sub-types/status, 19.2 file validation, 21.2 report-type additions. Cheap to build whenever their parent feature is touched next; none justify a standalone sprint.
- **Real features, correctly sequenced behind existing locked work**: 15.4 Map/Explore view, 17.1 Explainable AI, 9.6 Trust Journey timeline, 8.5/8.6 edit-lock and soft-delete rules — genuinely valuable, each already noted with what it should wait behind (Ranking Engine, Follow system, etc. — §21.5's existing build order, unchanged).
- **Explicitly not being built now**: everything tagged `[DEFERRED]` — flagged so it's a deliberate choice, re-visited later, not forgotten.

## Recommended next step

This file is an audit, not a merge — matching the master build document's own established discipline (nothing gets folded into the locked document silently, per its top-of-file instruction #1 and the v1.3/v1.6 changelog precedent). Suggested path from here, once reviewed:

1. Owner reviews the 6 new open decisions (D19–D21 here, D16–D18 already in the master doc's §39) and resolves or accepts the stated defaults.
2. The small set of zero-risk documentation items (permission matrix, unified verification-queue note) can be folded into the master doc as a **Part 10** append at any time — they don't change behavior, only make existing decisions easier to find.
3. Everything else stays in this file as a standing reference — pulled from here into the master doc's phase roadmap (§17) or build-order (§21.5) **item by item, as each parent feature actually gets scheduled**, not all at once. That keeps the master doc's "single source of truth" property intact instead of doubling its size with speculative future work.

Nothing in this file has been implemented. It is a checklist for verifying implementations against, exactly as requested — not a description of what already exists.

---
