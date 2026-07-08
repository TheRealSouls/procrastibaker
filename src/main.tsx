import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { router } from "./router";
import { initAnalytics } from "./services/analytics";
import { initSentry } from "./utils/sentry";
import "./i18n";
import "./styles.css";

initSentry();
initAnalytics();

function ErrorFallback() {
  return (
    <main className="login-screen">
      <section className="page-card login-card">
        <div className="page-intro">
          <span className="intro-icon" aria-hidden="true">
            {"\u{1F525}"}
          </span>
          <h1>Something burnt in the oven</h1>
          <p>
            An unexpected error stopped the bakery. Reloading usually sorts it
            out.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
