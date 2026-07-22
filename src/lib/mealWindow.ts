import type { MealTag } from "../types";

export function currentMealWindow(date: Date = new Date()): MealTag {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 16 && h < 22) return "dinner";
  return "late_night";
}
