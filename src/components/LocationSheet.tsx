import { useState } from "react";
import { Check, LocateFixed, MapPin, X } from "lucide-react";
import { AREA_COORDS, requestLocation } from "../lib/geo";

export default function LocationSheet({
  currentArea,
  onSelect,
  onClose,
}: {
  currentArea: string;
  onSelect: (area: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState(false);

  const filtered = AREA_COORDS.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function handleUseCurrentLocation() {
    setLocating(true);
    setDeniedMessage(false);
    const result = await requestLocation();
    setLocating(false);
    if (result.status === "granted") {
      onSelect(result.area);
    } else {
      // E1 (locked): denied -> fall back to manual selection, no nagging re-prompts.
      setDeniedMessage(true);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-pt-ink/40"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-card-hover)] md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-pt-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-pt-ink">Choose your area</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-pt-ink-soft hover:bg-pt-surface-2"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-pt-primary px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep disabled:opacity-70"
          >
            <LocateFixed className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
            {locating ? "Finding you…" : "Use current location"}
          </button>
          <p className="mt-2 text-center text-xs text-pt-ink-soft">
            We use your location once, when you open the app, to show what's genuinely near you.
            We never track you in the background.
          </p>

          {deniedMessage && (
            <p className="mt-3 rounded-xl bg-pt-surface-2 px-3 py-2 text-center text-sm text-pt-ink-soft">
              Couldn't get your location — no problem, just pick or type your area below.
            </p>
          )}

          <div className="relative mt-4">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-pt-ink-soft"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your area…"
              autoFocus
              className="min-h-[44px] w-full rounded-full border border-pt-border bg-white py-2.5 pl-10 pr-4 text-base focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
            />
          </div>

          <ul className="mt-3 max-h-64 overflow-y-auto">
            {filtered.map((a) => (
              <li key={a.name}>
                <button
                  type="button"
                  onClick={() => onSelect(a.name)}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-base text-pt-ink transition-colors duration-150 hover:bg-pt-surface-2"
                >
                  {a.name}
                  {a.name === currentArea && <Check className="h-4.5 w-4.5 text-pt-primary" aria-hidden="true" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-pt-ink-soft">
                Not listed yet — we'll add proper city-wide search once People's Taste covers more areas.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
