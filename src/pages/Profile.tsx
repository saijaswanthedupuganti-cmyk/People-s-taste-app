import { useEffect, useState } from "react";
import { ChevronDown, LogOut, MapPin } from "lucide-react";
import { collection, doc, getCountFromServer, getDoc, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import TrustBadge from "../components/TrustBadge";
import LocationSheet from "../components/LocationSheet";
import { TIER_LABEL } from "../types";
import type { Tier } from "../types";

interface OwnTrust {
  tier: Tier;
  trustScore: number;
  recCount: number;
  savedCount: number;
  homeArea: string | null;
}

const TIER_MIN_SCORE: Record<Tier, number> = {
  explorer: 0,
  local_foodie: 20,
  verified_foodie: 35,
  neighborhood_expert: 50,
  city_expert: 65,
  legend: 80,
};

const TIER_ORDER: Tier[] = ["explorer", "local_foodie", "verified_foodie", "neighborhood_expert", "city_expert", "legend"];

export default function Profile() {
  const { user, logOut } = useAuth();
  const [trust, setTrust] = useState<OwnTrust | null>(null);
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);
  const [savingArea, setSavingArea] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getCountFromServer(query(collection(db, "saves"), where("uid", "==", user.uid))),
    ]).then(([userSnap, savesCount]) => {
      const data = userSnap.data() as
        | { tier: Tier; trustScore: number; recCount: number; homeArea?: string | null }
        | undefined;
      setTrust({
        tier: data?.tier ?? "explorer",
        trustScore: data?.trustScore ?? 10,
        recCount: data?.recCount ?? 0,
        savedCount: savesCount.data().count,
        homeArea: data?.homeArea ?? null,
      });
    });
  }, [user]);

  async function handleSelectArea(area: string) {
    setAreaSheetOpen(false);
    setSavingArea(true);
    try {
      const updateHomeArea = httpsCallable(functions, "updateHomeArea");
      await updateHomeArea({ homeArea: area });
      setTrust((cur) => (cur ? { ...cur, homeArea: area } : cur));
    } finally {
      setSavingArea(false);
    }
  }

  if (!trust) {
    return <div className="px-4 py-10 text-center text-pt-ink-soft">Loading…</div>;
  }

  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(trust.tier) + 1];
  const tierProgress = nextTier
    ? Math.round(
        ((trust.trustScore - TIER_MIN_SCORE[trust.tier]) / (TIER_MIN_SCORE[nextTier] - TIER_MIN_SCORE[trust.tier])) * 100,
      )
    : 100;

  return (
    <div className="pb-24 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pt-surface-3 text-xl font-semibold text-pt-ink-soft">
              {(user?.displayName ?? user?.email ?? "?")[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold text-pt-ink">
              {user?.displayName ?? user?.email}
            </h1>
            <TrustBadge tier={trust.tier} className="mt-1" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAreaSheetOpen(true)}
          disabled={savingArea}
          className="mt-4 flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-2xl border border-pt-border bg-white px-4 text-left transition-colors duration-150 hover:border-pt-primary/40 disabled:opacity-70"
        >
          <MapPin className="h-4 w-4 shrink-0 text-pt-primary" aria-hidden="true" strokeWidth={2} />
          <span className="flex-1 text-sm text-pt-ink">
            {trust.homeArea ? (
              <>
                Home area: <span className="font-medium">{trust.homeArea}</span>
              </>
            ) : (
              "Set your home area"
            )}
          </span>
          <ChevronDown className="h-4 w-4 text-pt-ink-soft" aria-hidden="true" strokeWidth={2} />
        </button>

        {areaSheetOpen && (
          <LocationSheet
            currentArea={trust.homeArea ?? ""}
            onClose={() => setAreaSheetOpen(false)}
            onSelect={handleSelectArea}
          />
        )}

        {nextTier && (
          <div className="mt-5 rounded-2xl border border-pt-border bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-pt-ink-soft">Progress to {TIER_LABEL[nextTier]}</span>
              <span className="font-medium text-pt-ink">{tierProgress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pt-surface-3">
              <div
                className="h-full rounded-full bg-pt-primary transition-[width] duration-300"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-pt-border bg-white p-4 text-center">
            <p className="font-display text-2xl font-semibold text-pt-ink">{trust.recCount}</p>
            <p className="text-sm text-pt-ink-soft">Recommendations</p>
          </div>
          <div className="rounded-2xl border border-pt-border bg-white p-4 text-center">
            <p className="font-display text-2xl font-semibold text-pt-ink">{trust.savedCount}</p>
            <p className="text-sm text-pt-ink-soft">Saved</p>
          </div>
        </div>

        {trust.recCount === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-pt-border px-4 py-8 text-center">
            <p className="font-medium text-pt-ink">No recommendations yet</p>
            <p className="mt-1 text-sm text-pt-ink-soft">Post your first one to start building trust.</p>
          </div>
        )}

        <button
          type="button"
          onClick={logOut}
          className="mt-8 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-pt-border text-sm font-medium text-pt-ink-soft transition-colors duration-150 hover:border-pt-danger/40 hover:text-pt-danger"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );
}
