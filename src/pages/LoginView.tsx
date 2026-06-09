import { FormEvent, useState } from "react";

type LoginViewProps = {
  authError?: string;
  isAuthLoading: boolean;
  onGoogleLogin: () => void;
  onLogin: (username: string, email: string) => void;
};

export function LoginView({
  authError,
  isAuthLoading,
  onGoogleLogin,
  onLogin,
}: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanUsername = username.trim().slice(0, 32);
    const cleanEmail = email.trim().slice(0, 80);

    if (!cleanUsername || !cleanEmail) {
      return;
    }

    onLogin(cleanUsername, cleanEmail);
  }

  return (
    <section className="page-card login-card">
      <div className="page-intro">
        <span className="intro-icon" aria-hidden="true">
          &#129360;
        </span>
        <h1>Open your study bakery</h1>
        <p>
          Continue with Google to open your bakery. Your study progress still
          stays saved on this device for now.
        </p>
      </div>

      <button
        className="button primary google-login-button"
        disabled={isAuthLoading}
        onClick={onGoogleLogin}
        type="button"
      >
        <i className="fa-brands fa-google" aria-hidden="true" />
        Continue with Google
      </button>

      {authError && (
        <p className="auth-error" role="alert">
          {authError}
        </p>
      )}

      <div className="login-divider">
        <span>or use a local prototype profile</span>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          autoComplete="username"
          id="username"
          maxLength={32}
          onChange={(event) => setUsername(event.target.value)}
          pattern=".*\S.*"
          required
          title="Enter at least one non-space character."
          value={username}
        />

        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          maxLength={80}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />

        <button className="button primary" type="submit">
          Continue locally
        </button>
      </form>
    </section>
  );
}
