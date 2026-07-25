import type { ComponentType } from "react";

export interface ChipGroup {
  label: string;
  options: { id: string; label: string }[];
}

export interface ChipOption {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
}

export default function FilterChips({
  active,
  options,
  onToggle,
}: {
  active: Set<string>;
  options: ChipOption[];
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filters"
    >
      {options.map((opt) => {
        const isActive = active.has(opt.id);
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            aria-pressed={isActive}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "border-pt-primary bg-pt-primary text-white"
                : "border-pt-border bg-white text-pt-ink-soft hover:border-pt-primary/50 hover:text-pt-ink"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden strokeWidth={2} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
