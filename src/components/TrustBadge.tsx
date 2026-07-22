import type { Tier } from "../types";
import { TIER_LABEL } from "../types";

const TIER_STYLE: Record<Tier, string> = {
  explorer: "text-pt-ink-soft bg-pt-surface-3",
  local_foodie: "text-pt-ink-soft bg-pt-surface-3",
  verified_foodie: "text-pt-ink bg-pt-surface-3",
  neighborhood_expert: "text-white bg-pt-primary/80",
  city_expert: "text-white bg-pt-primary",
  legend: "text-white bg-pt-primary-deep",
};

export default function TrustBadge({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none ${TIER_STYLE[tier]} ${className}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
