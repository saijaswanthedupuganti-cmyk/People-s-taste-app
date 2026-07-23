import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export function useHelpfulVote(recId: string, initialCount: number) {
  const { user } = useAuth();
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!user) {
      setVoted(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "recommendations", recId, "votes", user.uid)).then((snap) => {
      if (!cancelled) setVoted(snap.exists());
    });
    return () => {
      cancelled = true;
    };
  }, [user, recId]);

  const toggle = useCallback(() => {
    if (!user || pending) return;
    setPending(true);
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount((c) => c + (wasVoted ? -1 : 1));
    const toggleHelpfulVote = httpsCallable(functions, "toggleHelpfulVote");
    toggleHelpfulVote({ recId })
      .then((response) => {
        const data = response.data as { voted: boolean; helpfulVoteCount: number };
        setVoted(data.voted);
        setCount(data.helpfulVoteCount);
      })
      .catch(() => {
        setVoted(wasVoted);
        setCount((c) => c + (wasVoted ? 1 : -1));
      })
      .finally(() => setPending(false));
  }, [user, recId, pending, voted]);

  return { voted, count, toggle, signedIn: !!user };
}
