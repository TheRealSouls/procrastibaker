import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listenToIncomingGifts,
  listenToSentGifts,
  markThanksSeen,
  thankForGift,
  type Gift,
} from "../services/giftService";

/**
 * Subscribes to gifts addressed to the current user and exposes only the
 * unclaimed ones (filtered client-side so the query stays a single equality
 * filter, no composite index, same as {@link useFriends}).
 *
 * Also watches the gifts this user sent, so thanks coming back from a friend
 * can be announced once and then dismissed.
 */
export function useGifts(uid?: string) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [sent, setSent] = useState<Gift[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setGifts([]);
      setSent([]);
      return;
    }

    const unsubIncoming = listenToIncomingGifts(uid, setGifts, (err) =>
      setError(err.message),
    );
    const unsubSent = listenToSentGifts(uid, setSent, (err) =>
      setError(err.message),
    );

    return () => {
      unsubIncoming();
      unsubSent();
    };
  }, [uid]);

  const incomingGifts = useMemo(
    () => gifts.filter((gift) => gift.status === "unclaimed"),
    [gifts],
  );

  // Thanks the sender has not acknowledged yet.
  const unseenThanks = useMemo(
    () => sent.filter((gift) => gift.thanked && !gift.thanksSeen),
    [sent],
  );

  const sayThanks = useCallback((giftId: string) => thankForGift(giftId), []);
  const dismissThanks = useCallback(
    (giftId: string) => markThanksSeen(giftId),
    [],
  );

  return { incomingGifts, unseenThanks, error, sayThanks, dismissThanks };
}
