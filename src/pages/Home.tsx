import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  ChevronRight,
  Gem,
  Moon,
  Plane,
  Repeat2,
  Search as SearchIcon,
  ShieldCheck,
  SlidersHorizontal,
  ThumbsUp,
  UserRound,
  Utensils,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";
import AreaMealHeader from "../components/AreaMealHeader";
import LocationSheet from "../components/LocationSheet";
import FilterChips from "../components/FilterChips";
import RecommendationCard from "../components/RecommendationCard";
import CompactRecCard from "../components/CompactRecCard";
import TrustBadge from "../components/TrustBadge";
import { fetchFeed } from "../lib/queries";
import type { Recommendation } from "../types";
import { currentMealWindow } from "../lib/mealWindow";
import { requestLocation } from "../lib/geo";
import { SIGNAL_LABEL } from "../types";
import type { MealTag, SignalTag, Tier } from "../types";

const DEFAULT_AREA = "Jubilee Hills";
const MEALS: MealTag[] = ["breakfast", "lunch", "dinner", "late_night"];
const SIGNAL_FILTERS: SignalTag[] = [
  "hidden_gem",
  "best_value",
  "worth_traveling_for",
  "would_return",
  "late_night_favorite",
  "family_friendly",
  "solo_friendly",
];
const SIGNAL_ICON: Partial<Record<SignalTag, ComponentType<{ className?: string; strokeWidth?: number }>>> = {
  hidden_gem: Gem,
  best_value: Wallet,
  worth_traveling_for: Plane,
  would_return: Repeat2,
  late_night_favorite: Moon,
  family_friendly: Baby,
  solo_friendly: UserRound,
};
const TIER_ORDER: Tier[] = ["explorer", "local_foodie", "verified_foodie", "neighborhood_expert", "city_expert", "legend"];
const ASKED_KEY = "pt_location_asked";

const HOW_IT_WORKS = [
  { icon: Utensils, title: "1. Recommend", body: "Share your favorite dish and why." },
  { icon: ThumbsUp, title: "2. Get Votes", body: "The community validates with helpful votes." },
  { icon: ShieldCheck, title: "3. Build Trust", body: "Your trust score grows, rewards unlock." },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Home() {
  const [area, setArea] = useState(DEFAULT_AREA);
  const [meal, setMeal] = useState<MealTag>(currentMealWindow());
  const [activeSignals, setActiveSignals] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [feed, setFeed] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed()
      .then(setFeed)
      .finally(() => setLoading(false));
  }, []);

  // §11.3 (locked): GPS captured on app open. §E1 (locked): denied -> manual fallback,
  // no nagging re-prompts. So we auto-ask exactly once, ever, per browser — after that,
  // "Use current location" in the sheet is the only way it's asked again, and that's a
  // user-initiated tap, not a re-prompt.
  useEffect(() => {
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, "1");
    requestLocation().then((result) => {
      if (result.status === "granted") setArea(result.area);
    });
  }, []);

  function toggleSignal(id: string) {
    setActiveSignals((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function cycleMeal() {
    setMeal((cur) => MEALS[(MEALS.indexOf(cur) + 1) % MEALS.length]);
  }

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

  // Empty-state ladder (§12), simplified for Phase 1 UI: area falls back to whole-city
  // before we have real leaderboards/adjacent-area logic to fall back through properly.
  const showingFallback = strictResults.length === 0;
  const fallbackResults = useMemo(
    () => feed.filter((rec) => activeSignals.size === 0 || rec.signalTags.some((t) => activeSignals.has(t))),
    [feed, activeSignals],
  );
  const results = showingFallback ? fallbackResults : strictResults;

  const trending = useMemo(() => [...feed].sort((a, b) => b.helpfulVoteCount - a.helpfulVoteCount).slice(0, 3), [feed]);

  const localFoodies = useMemo(() => {
    const byUsername = new Map<string, Recommendation["author"]>();
    for (const rec of results) {
      if (!byUsername.has(rec.author.username)) byUsername.set(rec.author.username, rec.author);
    }
    return [...byUsername.values()].sort((a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier)).slice(0, 6);
  }, [results]);

  const hiddenGems = useMemo(() => feed.filter((rec) => rec.signalTags.includes("hidden_gem")).slice(0, 6), [feed]);

  return (
    <div className="pb-24 md:pb-8">
      <AreaMealHeader area={area} meal={meal} onChangeArea={() => setSheetOpen(true)} onChangeMeal={cycleMeal} />

      {sheetOpen && (
        <LocationSheet
          currentArea={area}
          onClose={() => setSheetOpen(false)}
          onSelect={(next) => {
            setArea(next);
            setSheetOpen(false);
          }}
        />
      )}

      <div className="mx-auto max-w-2xl md:max-w-4xl lg:max-w-6xl">
        <div className="px-4 pt-4">
          <h1 className="font-display text-xl font-semibold text-pt-ink md:text-2xl">What are you craving today?</h1>
          <p className="mt-1 text-sm text-pt-ink-soft">Trusted recommendations from real foodies, not just ratings.</p>
        </div>

        <Link
          to="/search"
          className="mx-4 mt-3 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-full border border-pt-border bg-white px-4 text-sm text-pt-ink-soft transition-colors duration-150 hover:border-pt-primary/40"
        >
          <SearchIcon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" strokeWidth={2} />
          Search for dishes, restaurants, cuisines…
          <SlidersHorizontal className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} />
        </Link>

        <div className="pt-3">
          <FilterChips
            active={activeSignals}
            onToggle={toggleSignal}
            options={SIGNAL_FILTERS.map((id) => ({ id, label: SIGNAL_LABEL[id], icon: SIGNAL_ICON[id] }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="space-y-4">
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
                  <Link
                    to="/post"
                    className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-pt-primary px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep"
                  >
                    Recommend a Dish
                  </Link>
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                {results.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            )}
          </div>

          {trending.length > 0 && (
            <aside className="hidden lg:block">
              <h2 className="font-display text-base font-semibold text-pt-ink">Trending in Hyderabad</h2>
              <div className="mt-3 space-y-3">
                {trending.map((rec) => (
                  <CompactRecCard key={rec.id} rec={rec} />
                ))}
              </div>
            </aside>
          )}
        </div>

        {localFoodies.length > 0 && (
          <section className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-pt-ink">Trusted Foodies Near You</h2>
              <Link to="/people" className="flex items-center gap-0.5 text-sm font-medium text-pt-primary hover:underline">
                See all
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {localFoodies.map((author) => (
                <Link
                  key={author.username}
                  to={`/u/${author.username}`}
                  className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 text-center"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pt-surface-3 text-lg font-semibold text-pt-ink-soft">
                    {initials(author.displayName)}
                  </span>
                  <span className="w-full truncate text-xs font-medium text-pt-ink">{author.displayName}</span>
                  <TrustBadge tier={author.tier} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {hiddenGems.length > 0 && (
          <section className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-pt-ink">Hidden Gems</h2>
              <Link to="/search" className="flex items-center gap-0.5 text-sm font-medium text-pt-primary hover:underline">
                See all
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6">
              {hiddenGems.map((rec) => (
                <CompactRecCard key={rec.id} rec={rec} />
              ))}
            </div>
          </section>
        )}

        <section className="px-4 py-6">
          <h2 className="font-display text-base font-semibold text-pt-ink">How It Works</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-pt-border bg-white p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pt-surface-2 text-pt-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
                </span>
                <p className="mt-3 font-display text-sm font-semibold text-pt-ink">{title}</p>
                <p className="mt-1 text-sm text-pt-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
