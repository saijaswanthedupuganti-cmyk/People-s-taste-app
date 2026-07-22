import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TrustBadge from "../components/TrustBadge";
import { TIER_LABEL } from "../types";
import type { Tier } from "../types";

// Placeholder until the Phase 1 trust engine Cloud Function is live (§9).
const MOCK_OWN_TRUST = { tier: "explorer" as Tier, tierProgress: 12, recCount: 0, savedCount: 0 };

const TIER_ORDER: Tier[] = ["explorer", "local_foodie", "verified_foodie", "neighborhood_expert", "city_expert", "legend"];

export default function Profile() {
  const { user, logOut } = useAuth();
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(MOCK_OWN_TRUST.tier) + 1];

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
            <TrustBadge tier={MOCK_OWN_TRUST.tier} className="mt-1" />
          </div>
        </div>

        {nextTier && (
          <div className="mt-5 rounded-2xl border border-pt-border bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-pt-ink-soft">Progress to {TIER_LABEL[nextTier]}</span>
              <span className="font-medium text-pt-ink">{MOCK_OWN_TRUST.tierProgress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-pt-surface-3">
              <div
                className="h-full rounded-full bg-pt-primary transition-[width] duration-300"
                style={{ width: `${MOCK_OWN_TRUST.tierProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-pt-border bg-white p-4 text-center">
            <p className="font-display text-2xl font-semibold text-pt-ink">{MOCK_OWN_TRUST.recCount}</p>
            <p className="text-sm text-pt-ink-soft">Recommendations</p>
          </div>
          <div className="rounded-2xl border border-pt-border bg-white p-4 text-center">
            <p className="font-display text-2xl font-semibold text-pt-ink">{MOCK_OWN_TRUST.savedCount}</p>
            <p className="text-sm text-pt-ink-soft">Saved</p>
          </div>
        </div>

        {MOCK_OWN_TRUST.recCount === 0 && (
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
