import { UtensilsCrossed } from "lucide-react";

const TONE_STYLE: Record<string, string> = {
  warm: "bg-pt-primary/10 text-pt-primary",
  accent: "bg-pt-accent/15 text-pt-primary-deep",
  surface3: "bg-pt-surface-3 text-pt-ink-soft",
};

export default function PhotoPlaceholder({ tone, className = "" }: { tone: string; className?: string }) {
  const style = TONE_STYLE[tone] ?? TONE_STYLE.surface3;
  return (
    <div className={`flex items-center justify-center ${style} ${className}`}>
      <UtensilsCrossed className="h-8 w-8" aria-hidden="true" strokeWidth={1.5} />
    </div>
  );
}
