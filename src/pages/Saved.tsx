import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { fetchRecommendation } from "../lib/queries";
import RecommendationCard from "../components/RecommendationCard";
import type { Recommendation } from "../types";

export default function Saved() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(false);
    getDocs(query(collection(db, "saves"), where("uid", "==", user.uid)))
      .then(async (snap) => {
        const recIds = snap.docs.map((d) => (d.data() as { recId: string }).recId);
        const fetched = await Promise.all(recIds.map(fetchRecommendation));
        setRecs(fetched.filter((r): r is Recommendation => r !== null));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="pb-24 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-xl font-semibold text-pt-ink">Saved</h1>

        {loading && <p className="mt-6 text-center text-sm text-pt-ink-soft">Loading…</p>}

        {!loading && error && (
          <p className="mt-6 text-center text-sm text-pt-ink-soft">Couldn't load your saved recommendations. Try again later.</p>
        )}

        {!loading && !error && recs.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-pt-border px-4 py-12 text-center">
            <Bookmark className="h-8 w-8 text-pt-ink-soft" aria-hidden="true" strokeWidth={1.5} />
            <p className="mt-3 font-medium text-pt-ink">Nothing saved yet</p>
            <p className="mt-1 text-sm text-pt-ink-soft">Tap the bookmark on any recommendation to keep it here.</p>
          </div>
        )}

        {!loading && !error && recs.length > 0 && (
          <div className="mt-6 space-y-4">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
