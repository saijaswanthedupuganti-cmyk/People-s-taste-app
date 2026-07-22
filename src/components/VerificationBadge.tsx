import { BadgeCheck } from "lucide-react";
import type { VerificationLevel } from "../types";

const LEVEL_LABEL: Record<VerificationLevel, string> = {
  1: "Claimed",
  2: "GPS Verified",
  3: "Photo Verified",
  4: "Receipt Verified",
};

export default function VerificationBadge({ level }: { level: VerificationLevel }) {
  if (level === 1) {
    return <span className="text-xs text-pt-ink-soft">{LEVEL_LABEL[1]}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-pt-trust">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
      {LEVEL_LABEL[level]}
    </span>
  );
}
