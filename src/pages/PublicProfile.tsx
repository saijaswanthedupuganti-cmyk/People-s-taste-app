import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MOCK_FEED } from "../data/mockData";
import RecommendationCard from "../components/RecommendationCard";
import TrustBadge from "../components/TrustBadge";

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const recs = MOCK_FEED.filter((r) => r.author.username === username);
  const author = recs[0]?.author;
  const areas = [...new Set(recs.map((r) => r.restaurant.area))];

  if (!author) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">User not found.</div>;
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
        <h1 className="truncate font-display text-base font-semibold text-pt-ink">@{author.username}</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pt-surface-3 text-xl font-semibold text-pt-ink-soft">
            {author.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-pt-ink">{author.displayName}</h2>
            <TrustBadge tier={author.tier} className="mt-1" />
          </div>
        </div>

        {areas.length > 0 && (
          <p className="mt-4 text-sm text-pt-ink-soft">Covers {areas.join(", ")}</p>
        )}

        <h3 className="mt-6 font-display text-lg font-semibold text-pt-ink">Recommendations</h3>
        <div className="mt-3 space-y-4">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      </div>
    </div>
  );
}
