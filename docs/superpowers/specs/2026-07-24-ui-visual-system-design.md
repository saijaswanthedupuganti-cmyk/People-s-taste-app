# UI Visual System Refresh — Design Spec

**Date:** 2026-07-24 · **Status:** Awaiting owner review
**Relates to:** existing tokens in `src/index.css` (unchanged) — this spec is a visual-execution pass, not a rebrand or feature addition.

---

## 1. Problem

The owner's framing, after reviewing the live app at peoplestaste.in: the UI feels generic/templated, has weak visual hierarchy, and inconsistent spacing/density. Confirmed by direct inspection of the deployed site:

- On desktop, the feed column floats unconstrained against the left edge with a large dead-space gap on the right — reads as unfinished, not intentional.
- Recommendation cards use a single flat color-block placeholder (a lone fork/knife icon centered on a solid pink rectangle) in place of a photo — reads as a broken image, not a designed empty state.
- Card text (dish name, restaurant name, caption, tags) is close to one size/weight throughout, so there's no scan path — nothing tells the eye what to read first.
- Spacing (card padding, gaps, section margins) is ad-hoc rather than drawn from a scale.

**Explicitly not changing:** the color palette (`--color-pt-*` in `src/index.css`), the type family choice (Bricolage Grotesque display / Inter body), or any product logic, data flow, or Firestore schema. This is execution polish on an identity the owner wants to keep, benchmarked against Beli's visual quality bar.

**Explicitly not building this pass:** a real two-pane desktop layout (feed + contextual right rail). Worth doing later as a feature addition, but it's new surface area, not a fix to what exists — out of scope here.

## 2. Layout

Single content column, centered, at every breakpoint — no new grid system, no sidebar content added.

- Content container: `max-w-[640px]`, `mx-auto`, horizontal padding `px-4` (mobile) / `px-6` (desktop).
- Page background: `--color-pt-surface-2` (a step deeper than the current `--color-pt-surface`) extends full viewport width behind the centered column, so the column reads as a deliberate reading width, not a narrow accident. Cards themselves stay white/`--color-pt-surface` for contrast against that background.
- Left icon nav rail (desktop) and bottom tab bar (mobile) are unchanged in structure — only the content column gets the max-width treatment.

Applies to every page: Home, Search, Post, Profile, Public Profile, Recommendation Detail, Restaurant Profile, Saved.

## 3. Typography scale

Both font families stay (`--font-display`: Bricolage Grotesque, `--font-body`: Inter). What's missing today is a disciplined scale — every text role gets one fixed size/weight/color, used everywhere that role appears:

| Role | Size / line-height | Font / weight | Color token |
|---|---|---|---|
| Page title | 20px / 28px | display, 600 | `pt-ink` |
| Card dish name | 18px / 24px | display, 600 | `pt-ink` |
| Restaurant name + area | 14px / 20px | body, 500 | `pt-ink-soft` |
| Caption / body text | 15px / 22px | body, 400 | `pt-ink` |
| Meta / tag label | 12px / 16px, uppercase, tracking-wide | body, 500 | `pt-ink-soft` |
| Badge label | 12px / 16px | body, 600 | badge-specific (see §5) |

Caption text is line-clamped to 2 lines on feed cards (full text still shows on Recommendation Detail).

## 4. Spacing scale

Standardize on Tailwind's default steps — no custom spacing values:

- Card internal padding: `p-4` (16px) mobile → `p-5` (20px) desktop.
- Gap between cards in a feed: `space-y-4` (16px) mobile → `space-y-6` (24px) desktop.
- Section padding (page top/bottom): `py-6` (24px) mobile → `py-8` (32px) desktop.

Any spacing value outside this set (4/8/12/16/24/32/48px) in touched files gets normalized to the nearest step.

## 5. Card anatomy (feed + detail)

Redesigned structure for `RecommendationCard.tsx`, reused conceptually (larger scale) in `RecommendationDetail.tsx`'s hero section:

1. **Image** — 4:3 aspect ratio (not square), `rounded-t-2xl`. Real photo when `rec.photo` is present.
   - **No-photo placeholder:** replaces the flat color block + centered fork/knife icon. New treatment: a subtle repeating dot texture in `pt-surface-3`/`pt-border` tones behind a small (32-40px), muted-opacity fork/knife icon — reads as an intentional empty state, not a broken image.
   - Signal badge (Must-Try / Recommend) floats as a pill in the image's top-right corner, not stacked in the text block below it. Verification checkmark (if any) floats top-left.
2. **Content block** (padded per §4): dish name → restaurant name + area → caption (clamped) → tag pills row. Each line uses its designated role from the type scale in §3, so the hierarchy is visible even glancing at the card.
3. **Footer row**, separated from the content block by a 1px `pt-border` hairline: author avatar + display name + trust-tier badge (left), helpful-vote count + bookmark icon (right).
4. **Hover (pointer devices only, via existing `prefers-reduced-motion` guard already in `index.css`):** `shadow-card` → `shadow-card-hover`, plus a 2px upward translate, 200ms ease. No hover effect on touch.

## 6. Badge color mapping

Consistent, not ad-hoc per screen:

- **Must-Try:** filled pill, `pt-primary` background, white text.
- **Recommend:** outline pill, `pt-primary` border/text, transparent background — except when the badge floats on top of an image (e.g. the feed card thumbnail), where transparent would be unreadable against an unpredictable future photo. There, use a translucent white/blurred backing (`bg-white/90 backdrop-blur`) with `pt-primary` text instead. Inline placements (e.g. Recommendation Detail's header, not on the image) use the plain outline.
- **Signal tags** (Hidden Gem, Worth Traveling For, Would Return, etc.): outline pill, `pt-ink-soft` text, `pt-surface-2` background, `pt-border` border.
- **Verification checkmark:** `pt-trust` icon + text, `pt-trust-soft` background pill — unchanged from current usage, just made consistent everywhere it appears (some screens currently render it differently).

## 7. Scope of rollout

Sequenced per the owner's earlier decision:

1. **This spec + one implementation pass** builds the shared pieces (type scale as Tailwind utility patterns, spacing normalization, the new card component, the layout container) against **Home feed** and **Recommendation Detail** — the two screens that best exercise the card and hero-image treatment.
2. **Owner reviews those two screens live** before the same system rolls out to the remaining six: Search, Post, Profile, Public Profile, Restaurant Profile, Saved.

## 8. Explicitly out of scope

- Any change to Firestore schema, Cloud Functions, or data-fetching logic — this is a presentational pass over already-wired real data (Feed & Trust Foundation, merged 2026-07-24).
- New features (two-pane desktop layout, restaurant photo uploads, richer empty states with suggested actions) — noted as good phase-2 ideas, not built here.
- Dark mode — not requested, current app is light-only.
- Accessibility audit beyond what this system naturally improves (contrast, touch targets) — worth a dedicated pass later, not blocking this one.
