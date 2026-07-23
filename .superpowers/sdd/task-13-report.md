# Task 13 Report: Wire RecommendationDetail.tsx to Real Data

## Summary
Successfully wired RecommendationDetail.tsx to fetch real Firestore data via `fetchRecommendation()` instead of the mock lookup. The page now loads recommendations dynamically based on the route parameter.

## Changes Made

### File Modified
- `src/pages/RecommendationDetail.tsx`

### Detailed Changes

1. **Imports (Lines 1–6)**
   - Added `useEffect` to the existing React import
   - Replaced `import { MOCK_FEED }` with `import { fetchRecommendation } from "../lib/queries"`
   - Added type import: `import type { Recommendation } from "../types"`
   - Kept existing `MEAL_LABEL, SIGNAL_LABEL` import

2. **State Management (Lines 18–28)**
   - Replaced synchronous mock lookup: `const rec = MOCK_FEED.find((r) => r.id === id);`
   - Added `useState` for recommendation: `const [rec, setRec] = useState<Recommendation | null>(null);`
   - Added loading state: `const [loading, setLoading] = useState(true);`
   - Created `useEffect` hook that:
     - Skips if `id` is undefined (early return)
     - Sets loading to true
     - Calls `fetchRecommendation(id)`
     - Updates state with fetched data and sets loading to false
     - Depends on `[id]` to refetch when route changes

3. **Loading Guard (Lines 33–35)**
   - Added loading check that returns early with "Loading…" message
   - Prevents "Recommendation not found" flash before fetch completes
   - Placed before the "not found" check for correct execution flow

4. **Preserved Logic (Lines 30–31, 37–43, 120–145)**
   - `voted` and `helpfulCount` state declarations left exactly as-is (no wiring to backend)
   - "Recommendation not found" JSX preserved unchanged
   - Vote button logic untouched (still uses local state)
   - Save button left completely untouched
   - All JSX rendering of recommendation details unchanged

## Build Verification

**Command:** `npx tsc -b`
**Result:** ✓ Clean build with zero errors

- No type mismatches
- `Recommendation` type properly imported
- `fetchRecommendation` function correctly typed
- State hooks correctly typed (`Recommendation | null`, `boolean`)

## Self-Review Findings

✓ **Vote/Save Logic Untouched:** The `voted` and `helpfulCount` local state remain unchanged. No attempt to wire them to backend (Task 17 responsibility).

✓ **Effect Skip Condition:** The effect includes `if (!id) return;` to handle undefined route parameters gracefully.

✓ **Loading Guard Placement:** Loading check returns before "not found" check, preventing flickering of error state during fetch.

✓ **Effect Dependency:** Correctly depends on `[id]` to refetch when navigating to different recommendations.

✓ **Type Safety:** All state properly typed; no implicit `any` types.

## Files Changed
1. `src/pages/RecommendationDetail.tsx` — wiring logic (18 insertions, 3 deletions)

## Commit
- **SHA:** `b76c7ef`
- **Message:** "Wire RecommendationDetail page to real Firestore data"

## Concerns
None. All requirements met, build clean, self-review passed.

## Next Steps
Task 14 onwards can depend on real recommendation loading. Task 17 will wire the `voted`/`helpfulCount` state to the `useHelpfulVote` hook.

## Fix: helpfulCount initialization bug

**Problem:** `const [helpfulCount, setHelpfulCount] = useState(rec?.helpfulVoteCount ?? 0);` was declared immediately after the `rec`/`loading` state and effect, but *before* the loading/not-found guards. `useState`'s initializer argument is only read on the component's very first render, and on that first render `rec` is still `null` (the async `fetchRecommendation` hasn't resolved yet). As a result `helpfulCount` always initialized to `0` and never reflected the real `helpfulVoteCount` once `rec` loaded — a user-visible bug (the "N found this helpful" count always showed 0 on the detail page).

**Fix applied:** Moved the two lines

```tsx
const [voted, setVoted] = useState(false);
const [helpfulCount, setHelpfulCount] = useState(rec.helpfulVoteCount ?? 0);
```

to immediately after the `if (!rec) { ... }` not-found guard (i.e., after both the loading guard and the not-found guard have already returned). Dropped the `?.` optional chain on `rec.helpfulVoteCount` since `rec` is guaranteed non-null there. This is the exact position Task 17 expects.

**tsc result:** `npx tsc -b` completed with no output — clean build, zero errors. TypeScript's control-flow narrowing confirms `rec` is non-null at the new call site.

**Caution for Task 17 / future work — Rules of Hooks violation introduced:** Placing `useState` calls *after* the two early `return` statements means these hooks are called conditionally: on the render where `loading` is `true` (or `rec` is `null`), only the `rec`/`loading` `useState` calls and the `useEffect` run (3 hook calls); on the render where the fetch has resolved and `rec` is non-null, the component additionally calls `useState` for `voted` and `helpfulCount` (5 hook calls total). This changes the number/order of hooks called between renders of the same component instance, which violates React's Rules of Hooks and will trigger a runtime error such as "Rendered more hooks than during the previous render" the first time `fetchRecommendation` resolves successfully. `npx tsc -b` does not catch this — hook-order checking is done by `eslint-plugin-react-hooks`, a lint rule, not the TypeScript compiler — so the clean `tsc` result above does not mean this code is safe to ship as-is. This was implemented exactly per the task specification; flagging it here so Task 17 (or a follow-up) addresses the hook-order issue, e.g. by declaring `voted`/`helpfulCount` unconditionally at the top of the component (as they were before this change) or by extracting the post-guard content into a child component so the hooks live at that component's top level.

## Fix: Rules-of-Hooks violation — split into outer/inner components

**Problem:** As flagged in the previous section, the `voted`/`helpfulCount` `useState` calls lived after the `if (loading) return …` and `if (!rec) return …` early returns inside the single `RecommendationDetail` component. That meant the component called a different number of hooks depending on which render path executed: 3 hook calls (`useState` for `rec`, `useState` for `loading`, `useEffect`) when returning early from either guard, versus 5 hook calls (those 3 plus `useState` for `voted` and `useState` for `helpfulCount`) once `rec` resolved to a real value. React requires every component instance to call the exact same hooks, in the exact same order, on every render — violating this throws "Rendered more hooks than during the previous render" the first time `fetchRecommendation` resolves successfully in a real browser (React's built-in dev-mode double-render, or StrictMode, could also surface it immediately). This is a structural problem, not a one-off: a later task wiring a `useHelpfulVote`/`useSave` custom hook into this same spot would hit the identical failure.

**Fix applied — outer/inner component split:**

- `RecommendationDetail` (default export, what the router renders) now does ONLY: `useParams`, the `rec`/`loading` `useState` pair, the fetch `useEffect`, and the two early-return guards (loading / not-found). Once both guards pass, it returns `<RecommendationDetailContent rec={rec} />`, handing off the confirmed-non-null `rec` as a prop. `useNavigate()` was removed from this component since nothing in it uses `navigate` — the back button lives inside the content component, not in the loading/not-found states (confirmed by reading the pre-fix file: the `<header>` with the back button is only rendered in the final JSX, after both guards, never during the loading or not-found returns).
- A new `RecommendationDetailContent({ rec }: { rec: Recommendation })` component now contains everything that previously rendered after the guards: `useNavigate()` (used by the header's back button `onClick={() => navigate(-1)}`), `useState(false)` for `voted`, `useState(rec.helpfulVoteCount)` for `helpfulCount` (dropped the `?? 0` fallback — `helpfulVoteCount` is a required `number` field on the `Recommendation` type per `src/types/index.ts`, and `rec` is now a guaranteed non-null prop, so no fallback is needed), and the full JSX (header, photo, caption, tags, Google Maps link, Helpful/Save buttons).
- Because `RecommendationDetailContent` only ever mounts when `rec` is a real, non-null value, its hooks are now called unconditionally on every render of that component instance — no more conditional hook count. This also gives Task 17's forthcoming `useHelpfulVote`/`useSave` hook wiring a safe home: it can be added inside `RecommendationDetailContent` without reintroducing the same class of bug.
- No behavioral change: `voted`/`helpfulCount` remain local-only `useState`, not wired to any Cloud Function — that remains a distinct, later task.

**tsc result:** `npx tsc -b` from the worktree root completed with no output — clean build, zero errors.
