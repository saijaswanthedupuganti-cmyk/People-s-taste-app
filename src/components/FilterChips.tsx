export interface ChipGroup {
  label: string;
  options: { id: string; label: string }[];
}

export default function FilterChips({
  active,
  options,
  onToggle,
}: {
  active: Set<string>;
  options: { id: string; label: string }[];
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
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            aria-pressed={isActive}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "border-pt-primary bg-pt-primary text-white"
                : "border-pt-border bg-white text-pt-ink-soft hover:border-pt-primary/50 hover:text-pt-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
