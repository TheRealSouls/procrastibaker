import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL } from "../../config/legal";

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

/** Standalone (public, no sign-in) wrapper for the legal pages. */
export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <header className="legal-page__header">
          <Link className="app-wordmark legal-page__brand" to="/">
            {LEGAL.appName}
          </Link>
          <Link className="link-button" to="/">
            &larr; Back
          </Link>
        </header>

        <article className="page-card legal-content">
          <h1>{title}</h1>
          <p className="legal-meta">
            {LEGAL.appName} &middot; Effective {LEGAL.effectiveDate}
          </p>
          {children}
        </article>

        <nav className="legal-page__footer" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/cookies">Cookie Policy</Link>
        </nav>
      </div>
    </main>
  );
}
