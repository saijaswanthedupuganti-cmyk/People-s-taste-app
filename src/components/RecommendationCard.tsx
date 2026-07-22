import { Link } from "react-router-dom";
import { Bookmark, Flame, ThumbsUp } from "lucide-react";
import type { Recommendation } from "../types";
import { MEAL_LABEL } from "../types";
import TrustBadge from "./TrustBadge";
import VerificationBadge from "./VerificationBadge";
import PhotoPlaceholder from "./PhotoPlaceholder";

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

  return (
    <article className="overflow-hidden rounded-2xl border border-pt-border bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]">
      <Link to={`/rec/${rec.id}`} className="block cursor-pointer">
        {rec.photo ? (
          <PhotoPlaceholder tone={rec.photo} className="aspect-[4/3] w-full" />
        ) : null}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold text-pt-ink">
                {rec.dishName ?? rec.restaurant.name}
              </h3>
              <p className="mt-0.5 truncate text-sm text-pt-ink-soft">
                {rec.restaurant.name} · {rec.restaurant.area}
              </p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isMustTry ? "bg-pt-primary text-white" : "bg-pt-surface-3 text-pt-ink"
              }`}
            >
              {isMustTry ? (
                <Flame className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
              )}
              {isMustTry ? "Must-Try" : "Recommend"}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-pt-ink">{rec.caption}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {rec.mealTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-pt-border px-2 py-0.5 text-xs text-pt-ink-soft"
              >
                {MEAL_LABEL[tag]}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-pt-border px-4 py-3">
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
            aria-label="Save recommendation"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pt-ink-soft transition-colors duration-150 hover:bg-pt-surface-2 hover:text-pt-primary"
          >
            <Bookmark className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
}
