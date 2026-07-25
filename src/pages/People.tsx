import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPeople } from "../lib/queries";
import type { PersonSummary } from "../lib/queries";
import TrustBadge from "../components/TrustBadge";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function People() {
  const [people, setPeople] = useState<PersonSummary[] | null>(null);

  useEffect(() => {
    fetchPeople().then(setPeople);
  }, []);

  return (
    <div className="pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-pt-border bg-pt-surface/95 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-base font-semibold text-pt-ink">Foodies</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4 md:max-w-4xl lg:max-w-6xl">
        {people === null && <p className="py-10 text-center text-pt-ink-soft">Loading…</p>}

        {people?.length === 0 && (
          <p className="py-10 text-center text-pt-ink-soft">No foodies yet — be the first to post.</p>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {people?.map((person) => (
            <Link
              key={person.uid}
              to={`/u/${person.username}`}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-pt-border bg-white p-3 transition-colors duration-150 hover:border-pt-primary/40"
            >
              {person.photoURL ? (
                <img src={person.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pt-surface-3 text-sm font-semibold text-pt-ink-soft">
                  {initials(person.displayName)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-pt-ink">{person.displayName}</p>
                <p className="truncate text-sm text-pt-ink-soft">@{person.username}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <TrustBadge tier={person.tier} />
                <span className="text-xs text-pt-ink-soft">{person.recCount} recs</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
