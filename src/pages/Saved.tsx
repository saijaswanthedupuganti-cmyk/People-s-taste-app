import { Bookmark } from "lucide-react";

export default function Saved() {
  return (
    <div className="pb-24 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-xl font-semibold text-pt-ink">Saved</h1>
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-pt-border px-4 py-12 text-center">
          <Bookmark className="h-8 w-8 text-pt-ink-soft" aria-hidden="true" strokeWidth={1.5} />
          <p className="mt-3 font-medium text-pt-ink">Nothing saved yet</p>
          <p className="mt-1 text-sm text-pt-ink-soft">Tap the bookmark on any recommendation to keep it here.</p>
        </div>
      </div>
    </div>
  );
}
