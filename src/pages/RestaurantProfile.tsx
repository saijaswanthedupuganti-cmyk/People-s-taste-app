import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MOCK_FEED, MOCK_RESTAURANTS } from "../data/mockData";
import RecommendationCard from "../components/RecommendationCard";

const PRICE_LABEL: Record<number, string> = { 1: "₹", 2: "₹₹", 3: "₹₹₹" };

export default function RestaurantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
  const recs = MOCK_FEED.filter((r) => r.restaurant.id === id);

  if (!restaurant) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Place not found.</div>;
  }

  return (
    <div className="pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-pt-border bg-pt-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pt-ink transition-colors duration-150 hover:bg-pt-surface-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="truncate font-display text-base font-semibold text-pt-ink">{restaurant.name}</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-pt-ink">{restaurant.name}</h2>
            <p className="mt-1 text-sm text-pt-ink-soft">
              {restaurant.area}, {restaurant.city} · {PRICE_LABEL[restaurant.priceBand]}
            </p>
            {restaurant.source === "community" && (
              <span className="mt-2 inline-block rounded-full bg-pt-surface-2 px-2.5 py-1 text-xs text-pt-ink-soft">
                Community-added place
              </span>
            )}
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.area} ${restaurant.city}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-pt-primary hover:underline"
        >
          View on Google Maps
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
        </a>

        <div className="mt-5 rounded-2xl bg-pt-surface-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-pt-ink-soft">Emerges from the community</p>
          <p className="mt-1 font-display text-lg font-semibold text-pt-ink">
            Best Dish: {restaurant.aggregates.topDishName}
          </p>
          <p className="mt-0.5 text-sm text-pt-ink-soft">{restaurant.aggregates.recCount} recommendations</p>
        </div>

        <h3 className="mt-6 font-display text-lg font-semibold text-pt-ink">All recommendations</h3>
        <div className="mt-3 space-y-4">
          {recs.length === 0 ? (
            <p className="text-sm text-pt-ink-soft">No recommendations here yet.</p>
          ) : (
            recs.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
          )}
        </div>
      </div>
    </div>
  );
}
