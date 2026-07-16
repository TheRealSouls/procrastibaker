import { useEffect, useMemo, useState } from "react";
import { listenToIncomingGifts, type Gift } from "../services/giftService";

/**
 * Subscribes to gifts addressed to the current user and exposes only the
 * unclaimed ones (filtered client-side so the query stays a single equality
 * filter — no composite index, same as {@link useFriends}).
 */
export function useGifts(uid?: string) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setGifts([]);
      return;
    }

    const unsubscribe = listenToIncomingGifts(uid, setGifts, (err) =>
      setError(err.message),
    );

    return () => unsubscribe();
  }, [uid]);

  const incomingGifts = useMemo(
    () => gifts.filter((gift) => gift.status === "unclaimed"),
    [gifts],
  );

  return { incomingGifts, error };
}
