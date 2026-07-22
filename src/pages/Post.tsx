import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Flame, MapPinPlus, Search, ThumbsUp } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { MOCK_RESTAURANTS } from "../data/mockData";
import { MEAL_LABEL, SIGNAL_LABEL } from "../types";
import type { MealTag, PrimarySignal, Restaurant, SignalTag } from "../types";

const STEPS = ["Place", "Dish", "When", "Signal", "Tags", "Caption"] as const;
const ALL_MEALS: MealTag[] = ["breakfast", "lunch", "dinner", "late_night", "cafe", "dessert", "drinks", "brunch"];
const ALL_SIGNALS: SignalTag[] = [
  "hidden_gem",
  "worth_traveling_for",
  "best_value",
  "would_return",
  "late_night_favorite",
  "family_friendly",
  "solo_friendly",
];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`h-1.5 w-full rounded-full transition-colors duration-200 ${
              i <= step ? "bg-pt-primary" : "bg-pt-surface-3"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

export default function Post() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [placeQuery, setPlaceQuery] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [wantsCommunityPlace, setWantsCommunityPlace] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [dishName, setDishName] = useState("");
  const [mealTags, setMealTags] = useState<Set<MealTag>>(new Set());
  const [primarySignal, setPrimarySignal] = useState<PrimarySignal | null>(null);
  const [signalTags, setSignalTags] = useState<Set<SignalTag>>(new Set());
  const [caption, setCaption] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ verificationLevel: number } | null>(null);

  const placeMatches = placeQuery.trim()
    ? MOCK_RESTAURANTS.filter((r) => r.name.toLowerCase().includes(placeQuery.trim().toLowerCase()))
    : MOCK_RESTAURANTS;

  const hasPlace = restaurant || (wantsCommunityPlace && communityName.trim().length > 1);
  const canProceed = [
    hasPlace,
    dishName.trim().length > 0,
    mealTags.size > 0,
    primarySignal !== null,
    true, // signal tags optional
    caption.trim().length >= 10 && caption.trim().length <= 500,
  ];

  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, value: T) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setSet(next);
  }

  const { user } = useAuth();

  async function handleSubmit() {
    if (!user) {
      setSubmitError("Sign in to post a recommendation.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    let userLocation: { lat: number; lng: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
      );
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // No GPS - post still goes through at verification level 1 (§10: L1 is always allowed).
    }

    try {
      const createRecommendation = httpsCallable(functions, "createRecommendation");
      const payload = wantsCommunityPlace
        ? {
            communityPlace: {
              name: communityName.trim(),
              location: userLocation ?? { lat: 0, lng: 0 },
              area: "Unknown",
              city: "Hyderabad",
            },
            dishName: dishName.trim() || null,
            mealTags: [...mealTags],
            signalTags: [...signalTags],
            primarySignal,
            caption: caption.trim(),
            userLocation,
          }
        : {
            restaurantId: restaurant?.id,
            dishName: dishName.trim() || null,
            mealTags: [...mealTags],
            signalTags: [...signalTags],
            primarySignal,
            caption: caption.trim(),
            userLocation,
          };

      const response = await createRecommendation(payload);
      setResult(response.data as { verificationLevel: number });
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(
        message.includes("restaurant not found")
          ? "This demo restaurant isn't in the real database yet — try \"Add this place manually\" instead."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pt-trust-soft text-pt-trust">
          <Check className="h-7 w-7" aria-hidden="true" strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-pt-ink">Posted</h2>
        <p className="mt-2 max-w-sm text-sm text-pt-ink-soft">
          {result?.verificationLevel === 2
            ? "Verified by location — this'll carry more weight in rankings."
            : "Live on People's Taste. Add a photo next time for stronger verification."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 min-h-[44px] cursor-pointer rounded-full bg-pt-primary px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-pt-primary-deep"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-pt-border bg-pt-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
          aria-label="Back"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-pt-ink transition-colors duration-150 hover:bg-pt-surface-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="font-display text-base font-semibold text-pt-ink">New recommendation</h1>
      </header>

      <StepDots step={step} />

      <div className="mx-auto max-w-2xl px-4 py-2">
        {step === 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">Where?</h2>
            {!wantsCommunityPlace ? (
              <>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-pt-ink-soft" aria-hidden="true" />
                  <input
                    value={placeQuery}
                    onChange={(e) => {
                      setPlaceQuery(e.target.value);
                      setRestaurant(null);
                    }}
                    placeholder="Search restaurant, café, stall…"
                    className="min-h-[44px] w-full rounded-full border border-pt-border bg-white py-2.5 pl-10 pr-4 text-base focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {placeMatches.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRestaurant(r)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
                        restaurant?.id === r.id ? "border-pt-primary bg-pt-surface-2" : "border-pt-border bg-white hover:border-pt-primary/40"
                      }`}
                    >
                      <span>
                        <span className="block font-medium text-pt-ink">{r.name}</span>
                        <span className="block text-sm text-pt-ink-soft">{r.area}</span>
                      </span>
                      {restaurant?.id === r.id && <Check className="h-5 w-5 text-pt-primary" aria-hidden="true" />}
                    </button>
                  ))}
                  {placeMatches.length === 0 && (
                    <p className="py-4 text-sm text-pt-ink-soft">No matches on Google Places.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setWantsCommunityPlace(true)}
                  className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-pt-primary hover:underline"
                >
                  <MapPinPlus className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
                  Can't find it? Add this place manually
                </button>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-pt-ink-soft">
                  Community place — not on Google. We'll pin it at your current location and check nearby
                  duplicates before saving (§5.1).
                </p>
                <input
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="Place name"
                  className="mt-3 min-h-[44px] w-full rounded-xl border border-pt-border bg-white px-4 text-base focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setWantsCommunityPlace(false)}
                  className="mt-3 cursor-pointer text-sm font-medium text-pt-ink-soft hover:text-pt-ink"
                >
                  Search Google Places instead
                </button>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">What dish?</h2>
            <p className="mt-1 text-sm text-pt-ink-soft">Leave blank to recommend the place itself, not a specific dish.</p>
            <input
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="e.g. Mutton Biryani"
              className="mt-3 min-h-[44px] w-full rounded-xl border border-pt-border bg-white px-4 text-base focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
            />
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">When's this good for?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_MEALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(mealTags, setMealTags, m)}
                  aria-pressed={mealTags.has(m)}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                    mealTags.has(m) ? "border-pt-primary bg-pt-primary text-white" : "border-pt-border bg-white text-pt-ink-soft hover:border-pt-primary/50"
                  }`}
                >
                  {MEAL_LABEL[m]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">How much do you rate it?</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrimarySignal("recommend")}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 transition-colors duration-150 ${
                  primarySignal === "recommend" ? "border-pt-primary bg-pt-surface-2" : "border-pt-border bg-white hover:border-pt-primary/40"
                }`}
              >
                <ThumbsUp className="h-6 w-6 text-pt-ink" aria-hidden="true" strokeWidth={1.75} />
                <span className="font-medium text-pt-ink">Recommend</span>
              </button>
              <button
                type="button"
                onClick={() => setPrimarySignal("must_try")}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 transition-colors duration-150 ${
                  primarySignal === "must_try" ? "border-pt-primary bg-pt-surface-2" : "border-pt-border bg-white hover:border-pt-primary/40"
                }`}
              >
                <Flame className="h-6 w-6 text-pt-primary" aria-hidden="true" strokeWidth={1.75} />
                <span className="font-medium text-pt-ink">Must-Try</span>
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">Anything else? (optional)</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_SIGNALS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(signalTags, setSignalTags, s)}
                  aria-pressed={signalTags.has(s)}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                    signalTags.has(s) ? "border-pt-primary bg-pt-primary text-white" : "border-pt-border bg-white text-pt-ink-soft hover:border-pt-primary/50"
                  }`}
                >
                  {SIGNAL_LABEL[s]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-pt-ink">Tell us why</h2>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Order medium spice. Avoid weekends after 8pm."
              maxLength={500}
              rows={5}
              className="mt-3 w-full resize-none rounded-xl border border-pt-border bg-white p-4 text-base leading-relaxed focus:border-pt-primary focus:outline-none focus:ring-2 focus:ring-pt-primary/20"
            />
            <p className="mt-1 text-right text-xs text-pt-ink-soft">{caption.length}/500 (min 10)</p>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-pt-border bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:left-20">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canProceed[step]}
              onClick={() => setStep((s) => s + 1)}
              className="min-h-[44px] flex-1 cursor-pointer rounded-full bg-pt-primary px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep disabled:cursor-not-allowed disabled:bg-pt-surface-3 disabled:text-pt-ink-soft"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canProceed[step] || submitting}
              onClick={handleSubmit}
              className="min-h-[44px] flex-1 cursor-pointer rounded-full bg-pt-primary px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pt-primary-deep disabled:cursor-not-allowed disabled:bg-pt-surface-3 disabled:text-pt-ink-soft"
            >
              {submitting ? "Posting…" : "Post recommendation"}
            </button>
          )}
        </div>
        {submitError && (
          <p className="mx-auto max-w-2xl px-4 pb-2 text-sm text-pt-danger">{submitError}</p>
        )}
      </div>
    </div>
  );
}
