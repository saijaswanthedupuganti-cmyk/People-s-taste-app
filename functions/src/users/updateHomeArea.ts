import type { Store } from "../store.js";

// Mirrors src/lib/geo.ts AREA_COORDS on the client — kept as a small server-side
// allowlist since the two packages don't share code across the functions/frontend split.
const VALID_AREAS = ["Jubilee Hills", "Banjara Hills", "Madhapur", "Ameerpet", "Tolichowki", "Charminar"];

export interface UpdateHomeAreaInput {
  uid: string;
  homeArea: string;
}

export async function updateHomeAreaHandler(input: UpdateHomeAreaInput, store: Store): Promise<{ homeArea: string }> {
  if (!VALID_AREAS.includes(input.homeArea)) {
    throw new Error("homeArea must be one of the supported areas");
  }
  await store.updateUserHomeArea(input.uid, input.homeArea);
  return { homeArea: input.homeArea };
}
