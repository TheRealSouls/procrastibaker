// Shared client-side validation for auth + profile fields.
import i18n from "../i18n";

/** Returns an error message for a weak password, or null if it is strong enough. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return i18n.t("validation.passwordTooShort");
  }

  if (!/[a-z]/.test(password)) {
    return i18n.t("validation.passwordLowercase");
  }

  if (!/[A-Z]/.test(password)) {
    return i18n.t("validation.passwordUppercase");
  }

  if (!/[0-9]/.test(password)) {
    return i18n.t("validation.passwordNumber");
  }

  return null;
}

/** Returns an error message for an invalid username, or null if it is valid. */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();

  if (trimmed.length < 2) {
    return i18n.t("validation.usernameTooShort");
  }

  if (trimmed.length > 32) {
    return i18n.t("validation.usernameTooLong");
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return i18n.t("validation.usernameInvalid");
  }

  return null;
}
