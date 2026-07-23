import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export function useSave(recId: string) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "saves", `${user.uid}_${recId}`)).then((snap) => {
      if (!cancelled) setSaved(snap.exists());
    });
    return () => {
      cancelled = true;
    };
  }, [user, recId]);

  const toggle = useCallback(() => {
    if (!user || pending) return;
    setPending(true);
    setSaved((s) => !s);
    const toggleSave = httpsCallable(functions, "toggleSave");
    toggleSave({ recId })
      .then((response) => setSaved((response.data as { saved: boolean }).saved))
      .catch(() => setSaved((s) => !s))
      .finally(() => setPending(false));
  }, [user, recId, pending]);

  return { saved, toggle, signedIn: !!user };
}
