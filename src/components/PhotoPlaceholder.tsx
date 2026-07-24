import { UtensilsCrossed } from "lucide-react";

export default function PhotoPlaceholder({
  photo,
  className = "",
}: {
  photo?: string | null;
  className?: string;
}) {
  if (photo) {
    return <img src={photo} alt="" className={`object-cover ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-pt-surface-3 bg-[radial-gradient(circle,var(--color-pt-border)_1.5px,transparent_1.5px)] bg-[length:14px_14px] ${className}`}
    >
      <UtensilsCrossed className="h-8 w-8 text-pt-ink-soft/50" aria-hidden="true" strokeWidth={1.5} />
    </div>
  );
}
