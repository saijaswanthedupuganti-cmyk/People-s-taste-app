import { ChevronDown, MapPin } from "lucide-react";
import { MEAL_LABEL } from "../types";
import type { MealTag } from "../types";

export default function AreaMealHeader({
  area,
  meal,
  onChangeArea,
  onChangeMeal,
}: {
  area: string;
  meal: MealTag;
  onChangeArea: () => void;
  onChangeMeal: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-pt-border bg-pt-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onChangeArea}
          className="flex cursor-pointer items-center gap-1 rounded-full py-1.5 pl-1 pr-2 text-left transition-colors duration-150 hover:bg-pt-surface-2"
        >
          <MapPin className="h-4 w-4 shrink-0 text-pt-primary" aria-hidden="true" strokeWidth={2} />
          <span className="font-display text-base font-semibold text-pt-ink">{area}</span>
          <ChevronDown className="h-4 w-4 text-pt-ink-soft" aria-hidden="true" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onChangeMeal}
          className="flex cursor-pointer items-center gap-1 rounded-full border border-pt-border bg-white px-3 py-1.5 text-sm font-medium text-pt-ink transition-colors duration-150 hover:border-pt-primary/50"
        >
          {MEAL_LABEL[meal]}
          <ChevronDown className="h-3.5 w-3.5 text-pt-ink-soft" aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
