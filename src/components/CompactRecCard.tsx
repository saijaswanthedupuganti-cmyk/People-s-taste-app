import { Link } from "react-router-dom";
import { ThumbsUp } from "lucide-react";
import type { Recommendation } from "../types";
import PhotoPlaceholder from "./PhotoPlaceholder";

export default function CompactRecCard({ rec }: { rec: Recommendation }) {
  return (
    <Link
      to={`/rec/${rec.id}`}
      className="block w-40 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-pt-border bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] md:w-full"
    >
      <PhotoPlaceholder photo={rec.photo} className="aspect-square w-full" />
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold text-pt-ink">{rec.dishName ?? rec.restaurant.name}</p>
        <p className="truncate text-xs text-pt-ink-soft">{rec.restaurant.name}</p>
        <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-pt-trust">
          <ThumbsUp className="h-3 w-3" aria-hidden="true" strokeWidth={2.25} />
          {rec.helpfulVoteCount}
        </span>
      </div>
    </Link>
  );
}
