import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { validatePassword } from "../utils/validation";

type AuthMode = "signin" | "signup";

type LoginViewProps = {
  authError?: string;
  authNotice?: string;
  isAuthLoading: boolean;
  onEmailSignIn: (email: string, password: string) => void;
  onEmailSignUp: (email: string, password: string) => void;
  onGoogleLogin: () => void;
  onPasswordReset: (email: string) => void;
};

export function LoginView({
  authError,
  authNotice,
  isAuthLoading,
  onEmailSignIn,
  onEmailSignUp,
  onGoogleLogin,
  onPasswordReset,
}: LoginViewProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFormError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password || isAuthLoading) {
      return;
    }

    if (mode === "signup") {
      const passwordError = validatePassword(password);

      if (passwordError) {
        setFormError(passwordError);
        return;
      }

      setFormError("");
      onEmailSignUp(cleanEmail, password);
    } else {
      setFormError("");
      onEmailSignIn(cleanEmail, password);
    }
  }

  return (
    <section className="page-card login-card">
      <div className="page-intro">
        <span className="intro-icon" aria-hidden="true">
          &#129360;
        </span>
        <h1>{t("login.title")}</h1>
        <p>{t("login.intro")}</p>
      </div>

      <button
        className="button primary google-login-button"
        disabled={isAuthLoading}
        onClick={onGoogleLogin}
        type="button"
      >
        <i className="fa-brands fa-google" aria-hidden="true" />
        {t("login.continueGoogle")}
      </button>

      <div className="login-divider">
        <span>{t("login.orEmail")}</span>
      </div>

      <div
        className="auth-mode-toggle"
        role="tablist"
        aria-label={t("login.emailAccount")}
      >
        <button
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "is-active" : ""}
          onClick={() => switchMode("signup")}
          role="tab"
          type="button"
        >
          {t("login.createAccount")}
        </button>
        <button
          aria-selected={mode === "signin"}
          className={mode === "signin" ? "is-active" : ""}
          onClick={() => switchMode("signin")}
          role="tab"
          type="button"
        >
          {t("login.signIn")}
        </button>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="auth-email">{t("login.email")}</label>
        <input
          autoComplete="email"
          id="auth-email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />

        <label htmlFor="auth-password">{t("login.password")}</label>
        <input
          aria-describedby={mode === "signup" ? "password-hint" : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          id="auth-password"
          minLength={mode === "signup" ? 8 : undefined}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        {mode === "signup" && (
          <p className="field-hint" id="password-hint">
            {t("validation.passwordRequirements")}
          </p>
        )}

        <button className="button primary" disabled={isAuthLoading} type="submit">
          {mode === "signup" ? t("login.createAccount") : t("login.signIn")}
        </button>
      </form>

      {mode === "signin" && (
        <button
          className="link-button"
          disabled={isAuthLoading}
          onClick={() => onPasswordReset(email)}
          type="button"
        >
          {t("login.forgotPassword")}
        </button>
      )}

      {authNotice && (
        <p className="auth-notice" role="status">
          {authNotice}
        </p>
      )}

      {(formError || authError) && (
        <p className="auth-error" role="alert">
          {formError || authError}
        </p>
      )}

      <p className="login-legal">
        {t("login.legalPrefix")} <Link to="/terms">{t("login.terms")}</Link>{" "}
        {t("login.and")} <Link to="/privacy">{t("login.privacy")}</Link>.
      </p>
    </section>
  );
}
