import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, ExternalLink, Flame, ThumbsUp } from "lucide-react";
import { MOCK_FEED } from "../data/mockData";
import { MEAL_LABEL, SIGNAL_LABEL } from "../types";
import TrustBadge from "../components/TrustBadge";
import VerificationBadge from "../components/VerificationBadge";
import PhotoPlaceholder from "../components/PhotoPlaceholder";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function RecommendationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rec = MOCK_FEED.find((r) => r.id === id);

  const [voted, setVoted] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(rec?.helpfulVoteCount ?? 0);

  if (!rec) {
    return (
      <div className="px-4 py-10 text-center text-pt-ink-soft">
        Recommendation not found.
      </div>
    );
  }

  const isMustTry = rec.primarySignal === "must_try";

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
        <h1 className="truncate font-display text-base font-semibold text-pt-ink">Recommendation</h1>
      </header>

      <div className="mx-auto max-w-2xl">
        {rec.photo && <PhotoPlaceholder tone={rec.photo} className="aspect-[4/3] w-full" />}

        <div className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-pt-ink">{rec.dishName}</h2>
              <Link to={`/place/${rec.restaurant.id}`} className="mt-1 inline-block text-sm text-pt-primary hover:underline">
                {rec.restaurant.name} · {rec.restaurant.area}
              </Link>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isMustTry ? "bg-pt-primary text-white" : "bg-pt-surface-3 text-pt-ink"
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

          <p className="mt-4 text-base leading-relaxed text-pt-ink">{rec.caption}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {rec.mealTags.map((tag) => (
              <span key={tag} className="rounded-full border border-pt-border px-2.5 py-1 text-xs text-pt-ink-soft">
                {MEAL_LABEL[tag]}
              </span>
            ))}
            {rec.signalTags.map((tag) => (
              <span key={tag} className="rounded-full bg-pt-surface-2 px-2.5 py-1 text-xs text-pt-ink">
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
              onClick={() => {
                setVoted((v) => !v);
                setHelpfulCount((c) => c + (voted ? -1 : 1));
              }}
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
              aria-label="Save recommendation"
              className="ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pt-ink-soft transition-colors duration-150 hover:bg-pt-surface-2 hover:text-pt-primary"
            >
              <Bookmark className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
