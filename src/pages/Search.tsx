import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { MOCK_FEED, MOCK_RESTAURANTS } from "../data/mockData";
import RecommendationCard from "../components/RecommendationCard";
import FilterChips from "../components/FilterChips";
import TrustBadge from "../components/TrustBadge";
import { MEAL_LABEL } from "../types";
import type { MealTag } from "../types";

type Tab = "dishes" | "places" | "people";

const MEAL_FILTERS: MealTag[] = ["breakfast", "lunch", "dinner", "late_night"];

const MOCK_PEOPLE = Array.from(new Map(MOCK_FEED.map((r) => [r.author.username, r.author])).values());

export default function Search() {
  const [tab, setTab] = useState<Tab>("dishes");
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();

  const dishResults = useMemo(
    () =>
      MOCK_FEED.filter((rec) => {
        const matchesQuery = !q || rec.dishName?.toLowerCase().includes(q) || rec.caption.toLowerCase().includes(q);
        const matchesMeal = meals.size === 0 || rec.mealTags.some((m) => meals.has(m));
        return matchesQuery && matchesMeal;
      }),
    [q, meals],
  );

  const placeResults = useMemo(
    () => MOCK_RESTAURANTS.filter((r) => !q || r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q)),
    [q],
  );

  const peopleResults = useMemo(
    () =>
      MOCK_PEOPLE.filter(
        (p) => !q || p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q),
      ),
    [q],
  );

  return (
    <div className="pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-pt-border bg-pt-surface/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-pt-ink-soft"
              aria-hidden="true"
              strokeWidth={2}
            />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="biryani, chai, hidden gem…"
              aria-label="Search dishes, places, or people"
              className="min-h-[44px] w-full rounded-full border border-pt-border bg-white py-2.5 pl-10 pr-9 text-base text-pt-ink placeholder:text-pt-ink-soft/70 focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-pt-ink-soft hover:bg-pt-surface-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-1 border-b border-pt-border" role="tablist">
            {([
              ["dishes", "Dishes & Places"],
              ["places", "Places"],
              ["people", "People"],
            ] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  tab === id ? "border-pt-primary text-pt-primary" : "border-transparent text-pt-ink-soft hover:text-pt-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl">
        {tab === "dishes" && (
          <>
            <div className="pt-3">
              <FilterChips active={meals} onToggle={(id) => setMeals((c) => (c.has(id) ? new Set([...c].filter((x) => x !== id)) : new Set(c).add(id)))} options={MEAL_FILTERS.map((id) => ({ id, label: MEAL_LABEL[id] }))} />
            </div>
            <div className="space-y-4 px-4 py-4">
              {dishResults.length === 0 ? (
                <p className="py-10 text-center text-sm text-pt-ink-soft">No matches. Try a different search.</p>
              ) : (
                dishResults.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
              )}
            </div>
          </>
        )}

        {tab === "places" && (
          <div className="space-y-3 px-4 py-4">
            {placeResults.map((r) => (
              <Link
                key={r.id}
                to={`/place/${r.id}`}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-pt-border bg-white px-4 py-3 transition-colors duration-150 hover:border-pt-primary/40"
              >
                <div>
                  <p className="font-medium text-pt-ink">{r.name}</p>
                  <p className="text-sm text-pt-ink-soft">{r.area} · {r.aggregates.recCount} recs</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "people" && (
          <div className="space-y-3 px-4 py-4">
            {peopleResults.map((p) => (
              <Link
                key={p.uid}
                to={`/u/${p.username}`}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-pt-border bg-white px-4 py-3 transition-colors duration-150 hover:border-pt-primary/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pt-surface-3 text-sm font-semibold text-pt-ink-soft">
                  {p.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-pt-ink">{p.displayName}</p>
                  <p className="truncate text-sm text-pt-ink-soft">@{p.username}</p>
                </div>
                <TrustBadge tier={p.tier} className="ml-auto shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
