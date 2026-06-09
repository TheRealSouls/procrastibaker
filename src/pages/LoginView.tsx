import { FormEvent, useState } from "react";

type LoginViewProps = {
  onLogin: (username: string, email: string) => void;
};

export function LoginView({ onLogin }: LoginViewProps) {
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
        <span className="intro-icon" aria-hidden="true">🥐</span>
        <h1>Open your study bakery</h1>
        <p>
          Set up a local prototype profile. Your bakery progress is saved on
          this device.
        </p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          autoComplete="username"
          id="username"
          maxLength={32}
          pattern=".*\S.*"
          onChange={(event) => setUsername(event.target.value)}
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
          Continue to dashboard
        </button>
      </form>
    </section>
  );
}
