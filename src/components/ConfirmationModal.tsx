import { type KeyboardEvent, useEffect, useRef } from "react";

type ConfirmationModalProps = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    if (document.activeElement === cancelButtonRef.current) {
      event.preventDefault();
      confirmButtonRef.current?.focus();
      return;
    }

    if (document.activeElement === confirmButtonRef.current) {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        aria-describedby="confirmation-message"
        aria-labelledby="confirmation-title"
        aria-modal="true"
        className="confirmation-modal"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <div className="confirmation-modal__icon" aria-hidden="true">
          {"\u{1F5D1}\u{FE0F}"}
        </div>
        <h2 id="confirmation-title">{title}</h2>
        <p id="confirmation-message">{message}</p>
        <div className="confirmation-modal__actions">
          <button
            className="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="button danger"
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
