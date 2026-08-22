import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PastryVisual } from "./PastryVisual";
import { useApp } from "../context/AppContext";
import { useGifts } from "../hooks/useGifts";
import { pastries } from "../data/pastries";

function pastryFor(id: string) {
  return pastries.find((pastry) => pastry.id === id) ?? pastries[0];
}

/**
 * Announces gifts on arrival and on sign-in: first any unclaimed pastry waiting
 * for you, then any thanks a friend sent back for one you gave. Shown one at a
 * time so a pile of gifts does not stack modals.
 */
export function GiftAlertModal() {
  const { t } = useTranslation();
  const { appState, handleClaimGift } = useApp();
  const { incomingGifts, unseenThanks, sayThanks, dismissThanks } = useGifts(
    appState.user?.uid,
  );
  const [busy, setBusy] = useState(false);
  const [thanked, setThanked] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const gift = incomingGifts[0] ?? null;
  const thanks = !gift ? (unseenThanks[0] ?? null) : null;
  const open = Boolean(gift || thanks);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      setThanked(false);
    }
  }, [open, gift?.id, thanks?.id]);

  if (!open) {
    return null;
  }

  // A friend thanked us for a pastry we sent.
  if (thanks) {
    return (
      <div className="modal-backdrop">
        <section
          aria-modal="true"
          className="confirmation-modal session-summary"
          role="dialog"
        >
          <PastryVisual
            className="session-summary__visual"
            emoji={pastryFor(thanks.pastryId).emoji}
            pastryId={thanks.pastryId}
            pastryName={pastryFor(thanks.pastryId).name}
          />
          <h2>{t("gifts.thanksTitle")}</h2>
          <p>
            {t("gifts.thanksBody", {
              name: thanks.toUsername,
              pastry: pastryFor(thanks.pastryId).name,
            })}
          </p>
          <div className="confirmation-modal__actions">
            <button
              className="button primary"
              onClick={() => void dismissThanks(thanks.id)}
              ref={closeRef}
              type="button"
            >
              {t("gifts.thanksClose")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!gift) {
    return null;
  }

  const pastry = pastryFor(gift.pastryId);

  async function handleClaim() {
    if (!gift || busy) {
      return;
    }

    setBusy(true);

    try {
      await handleClaimGift(gift);
    } finally {
      setBusy(false);
    }
  }

  async function handleThanks() {
    if (!gift || busy) {
      return;
    }

    setBusy(true);

    try {
      // Thank first so the sender still hears about it even though claiming
      // removes this gift from the list and closes the modal.
      await sayThanks(gift.id);
      setThanked(true);
      await handleClaimGift(gift);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        aria-modal="true"
        className="confirmation-modal session-summary"
        role="dialog"
      >
        <PastryVisual
          className="session-summary__visual"
          emoji={pastry.emoji}
          pastryId={pastry.id}
          pastryName={pastry.name}
        />
        <h2>{t("gifts.alertTitle")}</h2>
        <p>
          {t("gifts.alertBody", {
            name: gift.fromUsername,
            pastry: pastry.name,
          })}
        </p>
        {thanked && (
          <p className="auth-notice" role="status">
            {t("gifts.thanksSent", { name: gift.fromUsername })}
          </p>
        )}
        <div className="confirmation-modal__actions">
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void handleThanks()}
            ref={closeRef}
            type="button"
          >
            {t("gifts.sayThanks")}
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => void handleClaim()}
            type="button"
          >
            {t("gifts.justClaim")}
          </button>
        </div>
      </section>
    </div>
  );
}
