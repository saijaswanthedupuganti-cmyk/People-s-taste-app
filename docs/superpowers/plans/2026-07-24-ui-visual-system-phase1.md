# UI Visual System Refresh — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the visual system from `docs/superpowers/specs/2026-07-24-ui-visual-system-design.md` to the shared layout shell, the recommendation card, and the Recommendation Detail page — the two screens the spec targets for Phase 1 owner review before rolling out to the other six.

**Architecture:** No new dependencies, no data/schema changes. This is a CSS/JSX pass over five existing files: `src/index.css` (one token), `src/components/Layout.tsx` and `src/components/AreaMealHeader.tsx` (page background depth), `src/components/PhotoPlaceholder.tsx` (rebuilt as an always-rendered image/placeholder slot instead of a conditionally-skipped block), `src/components/RecommendationCard.tsx` and `src/pages/RecommendationDetail.tsx` (type scale, spacing scale, badge placement, tag-pill consistency).

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v4 (existing `@theme` tokens in `src/index.css`, unchanged).

## Global Constraints

- Do not change any `--color-pt-*`, `--font-*`, or `--shadow-card*` token values in `src/index.css` — the spec keeps the existing brand identity, this is execution polish only.
- No Firestore/Cloud Functions/data changes — `Recommendation`/`Restaurant`/`Author` shapes in `src/types/index.ts` are untouched.
- `src/` has no test runner configured — verify every task by running `npx tsc -b` (must stay clean) and `npm run dev` (manually check the page renders as expected in the browser). State explicitly in each task's verification step that this is a manual check, not an automated test.
- Per the owner's standing workflow preference for this project: work directly on `main`, no feature branch or worktree — commit each task straight to `main` after verification.
- Type scale, spacing scale, and badge color rules are defined in the spec (§3, §4, §6) — use the exact values below, copied from there.

---

### Task 1: Page background depth (shared shell)

**Files:**
- Modify: `src/index.css:9` (the `--color-pt-surface` line stays; no token change — see Step 1 for what actually changes)
- Modify: `src/components/Layout.tsx:6`
- Modify: `src/components/AreaMealHeader.tsx:17`

**Interfaces:**
- Consumes: existing `--color-pt-surface-2` token (`#f6ede3`), already defined in `src/index.css:10` — no new token needed.
- Produces: every route now sits on `pt-surface-2` instead of `pt-surface`, so the centered content column (Task 4) reads as deliberate against a slightly deeper background. `RecommendationDetail.tsx`'s sticky header (Task 5) must match this — noted there, not duplicated here.

- [ ] **Step 1: Change the shared page background**

In `src/components/Layout.tsx`, change the outer `div`'s background class from `bg-pt-surface` to `bg-pt-surface-2`:

```tsx
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-pt-surface-2 md:pl-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
```

(`BottomNav.tsx` already uses `bg-white/95` for the nav bar itself, and cards use `bg-white` — both stay unchanged and now contrast more clearly against the deeper page background instead of nearly matching it.)

- [ ] **Step 2: Match the sticky area/meal header to the new background**

In `src/components/AreaMealHeader.tsx:17`, change `bg-pt-surface/95` to `bg-pt-surface-2/95`:

```tsx
  return (
    <header className="sticky top-0 z-20 border-b border-pt-border bg-pt-surface-2/95 backdrop-blur">
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/`. Confirm the page background is a visibly deeper warm cream than the white cards and white bottom/side nav — not a jarring change, a subtle depth cue. This is a manual visual check (no test runner in `src/`).

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx src/components/AreaMealHeader.tsx
git commit -m "Deepen page background for visual depth behind cards and nav"
```

---

### Task 2: Rebuild PhotoPlaceholder as an always-rendered image slot

**Files:**
- Modify: `src/components/PhotoPlaceholder.tsx` (full rewrite)
- Modify: `src/components/RecommendationCard.tsx:26-29`
- Modify: `src/pages/RecommendationDetail.tsx:68`

**Interfaces:**
- Produces: `PhotoPlaceholder({ photo, className }: { photo?: string | null; className?: string })` — replaces the old `PhotoPlaceholder({ tone, className }: { tone: string; className?: string })` signature. `photo` is `Recommendation.photo` (`string | null`, from `src/types/index.ts:47`) — today this is always `null` in production (`src/lib/queries.ts` hardcodes `photo: null`, no photo-upload feature exists yet), so in practice this always renders the textured placeholder branch until a future feature adds real photo URLs. The component still needs the `photo` branch now so it's correct the day that feature ships.
- Consumes: nothing new.

**Why this task exists:** today, `RecommendationCard.tsx:27-29` and `RecommendationDetail.tsx:68` only render `PhotoPlaceholder` `if (rec.photo)` — and `rec.photo` is always `null` in the real data path. That means once Feed & Trust Foundation's real reads are live, cards render **no image area at all**, jumping straight from the card's rounded top corner into the text block. The old `tone`-based placeholder (a single flat color fill behind a centered fork/knife icon) was also the exact thing the owner flagged as reading like a broken image. This task fixes both: the placeholder always renders, and it looks like a designed empty state instead of a missing one.

- [ ] **Step 1: Rewrite PhotoPlaceholder**

Replace the full contents of `src/components/PhotoPlaceholder.tsx`:

```tsx
import { UtensilsCrossed } from "lucide-react";

export default function PhotoPlaceholder({
  photo,
  className = "",
}: {
  photo?: string | null;
  className?: string;
}) {
  if (photo) {
    return <img src={photo} alt="" className={`object-cover ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-pt-surface-3 bg-[radial-gradient(circle,var(--color-pt-border)_1.5px,transparent_1.5px)] bg-[length:14px_14px] ${className}`}
    >
      <UtensilsCrossed className="h-8 w-8 text-pt-ink-soft/50" aria-hidden="true" strokeWidth={1.5} />
    </div>
  );
}
```

(The dot pattern uses the existing `--color-pt-border` token directly in an arbitrary Tailwind value — no new CSS variable needed. The icon drops from full `text-pt-ink-soft` to 50%-opacity via `/50`, so it reads as a quiet placeholder mark rather than competing with real card content.)

- [ ] **Step 2: Always render it in RecommendationCard**

In `src/components/RecommendationCard.tsx`, replace lines 26-29:

```tsx
      <Link to={`/rec/${rec.id}`} className="block cursor-pointer">
        {rec.photo ? (
          <PhotoPlaceholder tone={rec.photo} className="aspect-[4/3] w-full" />
        ) : null}
```

with:

```tsx
      <Link to={`/rec/${rec.id}`} className="block cursor-pointer">
        <PhotoPlaceholder photo={rec.photo} className="aspect-[4/3] w-full" />
```

(The outer `<article>` already has `overflow-hidden rounded-2xl` at line 25, so the image's top corners clip to match without adding rounding classes here.)

- [ ] **Step 3: Always render it in RecommendationDetail**

In `src/pages/RecommendationDetail.tsx:68`, replace:

```tsx
        {rec.photo && <PhotoPlaceholder tone={rec.photo} className="aspect-[4/3] w-full" />}
```

with:

```tsx
        <PhotoPlaceholder photo={rec.photo} className="aspect-[4/3] w-full" />
```

- [ ] **Step 4: Verify**

Run `npx tsc -b` — must be clean (confirms every call site's prop rename landed correctly). Run `npm run dev`, open `/` and any `/rec/:id` page. Confirm every card and the detail page now show a textured placeholder image area (dot pattern + muted fork/knife icon) instead of no image or a flat solid-color block. Manual check — no test runner in `src/`.

- [ ] **Step 5: Commit**

```bash
git add src/components/PhotoPlaceholder.tsx src/components/RecommendationCard.tsx src/pages/RecommendationDetail.tsx
git commit -m "Rebuild PhotoPlaceholder as an always-rendered, textured empty state"
```

---

### Task 3: RecommendationCard visual system (type scale, spacing, badge placement)

**Files:**
- Modify: `src/components/RecommendationCard.tsx` (full rewrite, building on Task 2's Step 2 change)

**Interfaces:**
- Consumes: `PhotoPlaceholder` from Task 2, `TrustBadge`, `VerificationBadge`, `useSave` (all unchanged).
- Produces: no exported interface changes — same `RecommendationCard({ rec }: { rec: Recommendation })` signature.

- [ ] **Step 1: Apply the full card redesign**

Replace the full contents of `src/components/RecommendationCard.tsx`:

```tsx
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Flame, ThumbsUp } from "lucide-react";
import type { Recommendation } from "../types";
import { MEAL_LABEL } from "../types";
import TrustBadge from "./TrustBadge";
import VerificationBadge from "./VerificationBadge";
import PhotoPlaceholder from "./PhotoPlaceholder";
import { useSave } from "../hooks/useSave";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  const isMustTry = rec.primarySignal === "must_try";
  const navigate = useNavigate();
  const { saved, toggle, signedIn } = useSave(rec.id);

  return (
    <article className="overflow-hidden rounded-2xl border border-pt-border bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] md:hover:-translate-y-0.5 md:transition-transform">
      <Link to={`/rec/${rec.id}`} className="relative block cursor-pointer">
        <PhotoPlaceholder photo={rec.photo} className="aspect-[4/3] w-full" />
        <span
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isMustTry ? "bg-pt-primary text-white" : "bg-white/90 text-pt-primary backdrop-blur"
          }`}
        >
          {isMustTry ? (
            <Flame className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
          )}
          {isMustTry ? "Must-Try" : "Recommend"}
        </span>

        <div className="p-4 md:p-5">
          <h3 className="truncate font-display text-lg font-semibold leading-6 text-pt-ink">
            {rec.dishName ?? rec.restaurant.name}
          </h3>
          <p className="mt-0.5 truncate text-sm font-medium leading-5 text-pt-ink-soft">
            {rec.restaurant.name} · {rec.restaurant.area}
          </p>

          <p className="mt-3 line-clamp-2 text-[15px] leading-[22px] text-pt-ink">{rec.caption}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {rec.mealTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-pt-border bg-pt-surface-2/60 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-pt-ink-soft"
              >
                {MEAL_LABEL[tag]}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-pt-border px-4 py-3 md:px-5">
        <Link to={`/u/${rec.author.username}`} className="flex min-w-0 cursor-pointer items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pt-surface-3 text-xs font-semibold text-pt-ink-soft">
            {initials(rec.author.displayName)}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-pt-ink">{rec.author.displayName}</span>
          <TrustBadge tier={rec.author.tier} className="shrink-0" />
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <VerificationBadge level={rec.verificationLevel} />
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
        </div>
      </div>
    </article>
  );
}
```

Changes from the original, per the spec:
- §5.1: the Must-Try/Recommend badge moves from a row inside the text block to a floating pill on the image itself (`absolute right-3 top-3` on a `relative` image wrapper). The non-must-try variant becomes a translucent white pill (`bg-white/90 backdrop-blur`) so it reads against any future real photo, not just the flat placeholder.
- §3: dish name goes from `text-base` (16px) to `text-lg`/`leading-6` (18px/24px) per the type scale's "card dish name" row; restaurant/area line gets explicit `font-medium` (500) and `leading-5` to match the "restaurant name + area" row; caption gets explicit `text-[15px] leading-[22px]` (the scale's exact caption size, Tailwind's `text-sm` is 14px which undershoots it).
- §6: meal-tag pills get `uppercase tracking-wide font-medium` and a faint `bg-pt-surface-2/60` fill, matching the spec's "meta/tag label" row and the signal-tag treatment used in `RecommendationDetail.tsx` (Task 5) — one consistent tag style instead of two. The Recommend badge here is a deliberate, position-driven exception to §6's "transparent background" rule: because this badge floats on top of the image (which will show real, unpredictable photos once a photo-upload feature ships), it needs a legible backing in every case — `bg-white/90 backdrop-blur` instead of fully transparent. Task 5's inline (not on-image) badge follows §6 exactly.
- §5.4: hover gets a 2px lift (`md:hover:-translate-y-0.5`) alongside the existing shadow transition, desktop-only via the `md:` prefix so touch devices see no hover artifact.
- §4: card padding steps from `p-4` to `p-4 md:p-5` (16px → 20px at desktop), matching the spacing scale.

- [ ] **Step 2: Verify**

Run `npx tsc -b` — must be clean. Run `npm run dev`, open `/`. Confirm: dish name is visibly bolder/larger than the restaurant line; the Must-Try/Recommend pill sits on the image, not below it; meal tags render as small-caps pills; hovering a card on a desktop-width viewport lifts it slightly. Manual check — no test runner in `src/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecommendationCard.tsx
git commit -m "Apply visual system to RecommendationCard: type scale, spacing, badge-on-image"
```

---

### Task 4: Home feed layout and spacing

**Files:**
- Modify: `src/pages/Home.tsx:90-115`

**Interfaces:**
- Consumes: `RecommendationCard` (Task 3), unchanged data/filtering logic above line 90 — this task only touches the render tree from the content container down.

- [ ] **Step 1: Apply the content container and spacing scale, and fix the loading/fallback-banner overlap**

Replace `src/pages/Home.tsx` lines 90-115:

```tsx
      <div className="mx-auto max-w-[640px] px-4 sm:px-6">
        <div className="pt-3">
          <FilterChips
            active={activeSignals}
            onToggle={toggleSignal}
            options={SIGNAL_FILTERS.map((id) => ({ id, label: SIGNAL_LABEL[id] }))}
          />
        </div>

        <div className="space-y-4 py-6 md:space-y-6 md:py-8">
          {loading && <p className="py-10 text-center text-sm text-pt-ink-soft">Loading recommendations…</p>}
          {!loading && showingFallback && (
            <p className="rounded-xl bg-pt-surface-2 px-4 py-3 text-sm text-pt-ink-soft">
              No recs for {area} at this hour yet — showing all of Hyderabad instead.
            </p>
          )}
          {!loading && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-pt-border px-4 py-10 text-center">
              <p className="font-display text-lg font-semibold text-pt-ink">Be the first foodie to put this on the map</p>
              <p className="mt-1 text-sm text-pt-ink-soft">No one's posted here yet. Your recommendation could be the first.</p>
            </div>
          )}
          {results.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      </div>
```

Two changes beyond the spec's direct scope, both small and in the exact block this task already touches:
1. The container moves from `mx-auto max-w-2xl` (no horizontal padding — it relied on `FilterChips`/card children for their own edge spacing) to `mx-auto max-w-[640px] px-4 sm:px-6`, matching spec §2's exact width and giving the column its own edge padding independent of what's inside it.
2. `showingFallback` gains a `!loading &&` guard. Previously the fallback banner ("No recs for {area}… showing all of Hyderabad instead") could render simultaneously with the "Loading…" line above it, because `showingFallback` is `strictResults.length === 0`, which is true while `feed` is still empty during the initial fetch. This was flagged in the Feed & Trust Foundation final review as a Minor, non-blocking item — fixing it here since this task already replaces the exact lines it lives on.

- [ ] **Step 2: Verify**

Run `npx tsc -b` — must be clean. Run `npm run dev`, open `/`. Confirm the feed column is 640px wide and centered with visible edge padding on mobile widths, card gaps are visibly larger at desktop widths than mobile, and the "no recs for {area}" banner no longer flashes alongside "Loading…" on a fresh page load (throttle network in devtools if needed to see the loading state clearly). Manual check — no test runner in `src/`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "Apply visual system to Home feed: container width, spacing scale, loading-banner fix"
```

---

### Task 5: Recommendation Detail visual system

**Files:**
- Modify: `src/pages/RecommendationDetail.tsx:55-125` (the sticky header background from Task 1's note, plus the full content block)

**Interfaces:**
- Consumes: `PhotoPlaceholder` (Task 2), `TrustBadge`, `VerificationBadge`, `useHelpfulVote`, `useSave` (all unchanged).

- [ ] **Step 1: Match the sticky header to the new page background**

In `src/pages/RecommendationDetail.tsx:55`, replace:

```tsx
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-pt-border bg-pt-surface/95 px-4 py-3 backdrop-blur">
```

with:

```tsx
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-pt-border bg-pt-surface-2/95 px-4 py-3 backdrop-blur">
```

(Same reasoning as Task 1, Step 2 — this file's header lives outside that task's file list since it's part of this page's own content, not the shared shell.)

- [ ] **Step 2: Apply the content container, type scale, and tag consistency**

Replace `src/pages/RecommendationDetail.tsx` lines 67-124 (from the `<div className="mx-auto max-w-2xl">` through the closing `</div>` right before the component's final `</div>`):

```tsx
      <div className="mx-auto max-w-[640px]">
        <PhotoPlaceholder photo={rec.photo} className="aspect-[4/3] w-full" />

        <div className="px-4 py-5 md:px-6 md:py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold leading-8 text-pt-ink">{rec.dishName}</h2>
              <Link to={`/place/${rec.restaurant.id}`} className="mt-1 inline-block text-sm font-medium text-pt-primary hover:underline">
                {rec.restaurant.name} · {rec.restaurant.area}
              </Link>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isMustTry ? "bg-pt-primary text-white" : "border border-pt-primary bg-transparent text-pt-primary"
              }`}
            >
              {isMustTry ? <Flame className="h-3.5 w-3.5" strokeWidth={2.25} /> : <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.25} />}
              {isMustTry ? "Must-Try" : "Recommend"}
            </span>
          </div>

          <Link to={`/u/${rec.author.username}`} className="mt-4 flex cursor-pointer items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-surface-3 text-sm font-semibold text-pt-ink-soft">
              {initials(rec.author.displayName)}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-pt-ink">{rec.author.displayName}</span>
              <TrustBadge tier={rec.author.tier} />
            </span>
            <VerificationBadge level={rec.verificationLevel} />
          </Link>

          <p className="mt-4 text-[15px] leading-[22px] text-pt-ink">{rec.caption}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {rec.mealTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-pt-border bg-pt-surface-2/60 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-pt-ink-soft"
              >
                {MEAL_LABEL[tag]}
              </span>
            ))}
            {rec.signalTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-pt-border bg-pt-surface-2/60 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-pt-ink-soft"
              >
                {SIGNAL_LABEL[tag]}
              </span>
            ))}
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${rec.restaurant.name} ${rec.restaurant.area} ${rec.restaurant.city}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-pt-primary hover:underline"
          >
            View on Google Maps
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          </a>

          <div className="mt-6 flex items-center gap-3 border-t border-pt-border pt-4">
            <button
              type="button"
              onClick={() => (signedIn ? toggleHelpful() : navigate("/login"))}
              aria-pressed={voted}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
                voted
                  ? "border-pt-trust bg-pt-trust-soft text-pt-trust"
                  : "border-pt-border text-pt-ink-soft hover:border-pt-trust/50 hover:text-pt-trust"
              }`}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" strokeWidth={2} fill={voted ? "currentColor" : "none"} />
              Helpful
            </button>
            <span className="text-sm text-pt-ink-soft">{helpfulCount} found this helpful</span>
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
          </div>
        </div>
      </div>
```

Changes from the original, per the spec:
- §2: container width matches Home's `max-w-[640px]`.
- §5.1: `PhotoPlaceholder` always renders (Task 2's fix applied here too — this page had the same `rec.photo &&` gap Task 2's rationale describes).
- §3: dish-name heading gets an explicit `leading-8` to pair with its existing `text-2xl`; caption gets the scale's exact `text-[15px] leading-[22px]`; author name/byline sizes are already correct against the scale and are left as-is.
- §6: meal tags and signal tags — previously two different pill styles (`border-pt-border text-pt-ink-soft` vs `bg-pt-surface-2 text-pt-ink`) — now share one consistent uppercase/tracking-wide tag style, matching Task 3's card tags exactly.
- Content padding steps from a flat `px-4 py-4` to `px-4 py-5 md:px-6 md:py-6`, matching the spacing scale.

- [ ] **Step 3: Verify**

Run `npx tsc -b` — must be clean. Run `npm run dev`, open any `/rec/:id` page. Confirm: header background matches the page background; the hero image area always renders (textured placeholder, since no real photos exist yet); meal tags and signal tags render in one consistent pill style; content column is 640px wide. Manual check — no test runner in `src/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RecommendationDetail.tsx
git commit -m "Apply visual system to Recommendation Detail: type scale, spacing, tag consistency"
```

---

## After Phase 1

Per spec §7: once these five tasks are live on `main` and the owner has reviewed Home + Recommendation Detail on peoplestaste.in, the same system (type scale, spacing scale, tag-pill style, `PhotoPlaceholder` usage) rolls out to Search, Post, Profile, Public Profile, Restaurant Profile, and Saved — a follow-up plan, not part of this one.
