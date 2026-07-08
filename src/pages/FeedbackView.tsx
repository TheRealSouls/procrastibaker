import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Recaptcha } from "../components/Recaptcha";
import { trackEvent } from "../services/analytics";
import type { AppState } from "../types";

type FeedbackViewProps = {
  state: AppState;
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mjkokqqz";

const categories = [
  { value: "bug", labelKey: "feedback.categoryBug" },
  { value: "interface", labelKey: "feedback.categoryInterface" },
  { value: "feature", labelKey: "feedback.categoryFeature" },
  { value: "performance", labelKey: "feedback.categoryPerformance" },
  { value: "other", labelKey: "feedback.categoryOther" },
] as const;

export function FeedbackView({ state }: FeedbackViewProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>(categories[0].value);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || !captchaToken || status === "submitting") {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("category", category);
    formData.append("message", trimmedMessage);
    formData.append("_subject", `Procrastibaker feedback (${category})`);
    formData.append("g-recaptcha-response", captchaToken);

    if (state.user?.email) {
      formData.append("email", state.user.email);
    }

    if (state.user?.username) {
      formData.append("username", state.user.username);
    }

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      // reCAPTCHA tokens are single-use, so reset the challenge after any attempt.
      setCaptchaResetSignal((signal) => signal + 1);

      if (response.ok) {
        trackEvent("feedback_submitted", { category });
        setStatus("success");
        setMessage("");
        setCategory(categories[0].value);
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        errors?: { message: string }[];
      } | null;

      setErrorMessage(
        data?.errors?.map((error) => error.message).join(", ") ||
          t("feedback.errorGeneric"),
      );
      setStatus("error");
    } catch {
      setCaptchaResetSignal((signal) => signal + 1);
      setErrorMessage(t("feedback.errorNetwork"));
      setStatus("error");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <h1>{t("feedback.title")}</h1>
        <p>{t("feedback.intro")}</p>
      </section>

      <section className="page-card" aria-labelledby="feedback-form-heading">
        <h2 className="visually-hidden" id="feedback-form-heading">
          {t("feedback.formHeading")}
        </h2>

        {status === "success" ? (
          <div className="feedback-success" role="status">
            <span aria-hidden="true" className="feedback-success__icon">
              {"\u{1F950}"}
            </span>
            <strong>{t("feedback.successStrong")}</strong>
            <p>{t("feedback.successBody")}</p>
            <button
              className="button"
              onClick={() => setStatus("idle")}
              type="button"
            >
              {t("feedback.sendMore")}
            </button>
          </div>
        ) : (
          <form
            action={FORMSPREE_ENDPOINT}
            className="feedback-form"
            id="contact-form"
            method="POST"
            onSubmit={handleSubmit}
          >
            <div className="feedback-field">
              <label htmlFor="feedback-category">
                {t("feedback.categoryLabel")}
              </label>
              <select
                id="feedback-category"
                name="category"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="feedback-field">
              <label htmlFor="feedback-message">
                {t("feedback.messageLabel")}
              </label>
              <textarea
                id="feedback-message"
                name="message"
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("feedback.placeholder")}
                required
                rows={6}
                value={message}
              />
            </div>

            <Recaptcha
              className="recaptcha-field"
              onChange={setCaptchaToken}
              resetSignal={captchaResetSignal}
            />

            {status === "error" && (
              <p className="auth-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="button primary feedback-form__submit"
              disabled={
                status === "submitting" ||
                message.trim() === "" ||
                !captchaToken
              }
              type="submit"
            >
              {status === "submitting"
                ? t("feedback.submitting")
                : t("feedback.submit")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
