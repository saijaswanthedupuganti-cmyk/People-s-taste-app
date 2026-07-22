import { useMemo, useState } from "react";
import AreaMealHeader from "../components/AreaMealHeader";
import FilterChips from "../components/FilterChips";
import RecommendationCard from "../components/RecommendationCard";
import { MOCK_FEED } from "../data/mockData";
import { currentMealWindow } from "../lib/mealWindow";
import { SIGNAL_LABEL } from "../types";
import type { MealTag, SignalTag } from "../types";

const AREAS = ["Jubilee Hills", "Banjara Hills", "Madhapur", "Ameerpet", "Tolichowki", "Charminar"];
const MEALS: MealTag[] = ["breakfast", "lunch", "dinner", "late_night"];

const SIGNAL_FILTERS: SignalTag[] = ["hidden_gem", "best_value", "worth_traveling_for", "would_return"];

export default function Home() {
  const [area, setArea] = useState(AREAS[0]);
  const [meal, setMeal] = useState<MealTag>(currentMealWindow());
  const [activeSignals, setActiveSignals] = useState<Set<string>>(new Set());

  function cycleArea() {
    setArea((cur) => AREAS[(AREAS.indexOf(cur) + 1) % AREAS.length]);
  }
  function cycleMeal() {
    setMeal((cur) => MEALS[(MEALS.indexOf(cur) + 1) % MEALS.length]);
  }
  function toggleSignal(id: string) {
    setActiveSignals((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const strictResults = useMemo(
    () =>
      MOCK_FEED.filter((rec) => {
        const areaMatch = rec.restaurant.area === area;
        const mealMatch = rec.mealTags.includes(meal);
        const signalMatch = activeSignals.size === 0 || rec.signalTags.some((t) => activeSignals.has(t));
        return areaMatch && mealMatch && signalMatch;
      }),
    [area, meal, activeSignals],
  );

  // Empty-state ladder (§12), simplified for Phase 1 UI: area falls back to whole-city
  // before we have real leaderboards/adjacent-area logic to fall back through properly.
  const showingFallback = strictResults.length === 0;
  const fallbackResults = useMemo(
    () => MOCK_FEED.filter((rec) => activeSignals.size === 0 || rec.signalTags.some((t) => activeSignals.has(t))),
    [activeSignals],
  );
  const results = showingFallback ? fallbackResults : strictResults;

  return (
    <div className="pb-24 md:pb-8">
      <AreaMealHeader area={area} meal={meal} onChangeArea={cycleArea} onChangeMeal={cycleMeal} />

      <div className="mx-auto max-w-2xl">
        <div className="pt-3">
          <FilterChips
            active={activeSignals}
            onToggle={toggleSignal}
            options={SIGNAL_FILTERS.map((id) => ({ id, label: SIGNAL_LABEL[id] }))}
          />
        </div>

        <div className="space-y-4 px-4 py-4">
          {showingFallback && (
            <p className="rounded-xl bg-pt-surface-2 px-4 py-3 text-sm text-pt-ink-soft">
              No recs for {area} at this hour yet — showing all of Hyderabad instead.
            </p>
          )}
          {results.length === 0 && (
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
    </div>
  );
}
