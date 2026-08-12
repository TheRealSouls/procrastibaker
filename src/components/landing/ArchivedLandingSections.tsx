/**
 * Archived landing-page sections.
 *
 * These were removed from the live landing page (`src/pages/HomeView.tsx`) on
 * 2026-06-15 because they were not needed for now. They are preserved here so
 * they can be dropped back in later without rewriting them, import the section
 * component into HomeView and render it where the others live. The supporting
 * CSS (`.landing-section--metrics`, `.landing-metric-*`, `.landing-disclaimer`,
 * `.landing-section--testimonials`, `.landing-marquee*`, `.landing-stars`,
 * `.landing-testimonial-card`) is still present in `src/styles.css`.
 */
import { ScrollReveal } from "../ScrollReveal";

const metrics = [
  {
    value: "50%",
    label: "more completed focus sessions*",
  },
  {
    value: "3x",
    label: "more satisfying than staring at a plain timer*",
  },
  {
    value: "120",
    label: "minute maximum focus sessions",
  },
  {
    value: "5",
    label: "minute adjustable intervals",
  },
];

const testimonials = [
  {
    quote:
      "I opened the app to study chemistry and somehow became emotionally attached to a pixel cookie. Terrifyingly effective.",
    role: "Leaving Cert student",
  },
  {
    quote:
      "The expired pastry bin personally attacked me, so I finished my revision session out of spite.",
    role: "Professional Procrastinator",
  },
  {
    quote:
      "It made studying feel less like punishment and more like running a tiny bakery with academic consequences.",
    role: "College student",
  },
];

export function ProofOfBakeSection() {
  return (
    <ScrollReveal className="landing-section landing-section--metrics">
      <div className="landing-section__heading">
        <p className="landing-kicker">Proof of bake</p>
        <h2>Built around practical study sessions, not miracle claims.</h2>
      </div>
      <div className="landing-metric-grid">
        {metrics.map((metric) => (
          <article className="landing-metric-card" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
      <p className="landing-disclaimer">
        *Prototype/demo metrics for presentation purposes. Replace with real
        user data after testing.
      </p>
    </ScrollReveal>
  );
}

export function CouncilOfMatasSection() {
  return (
    <ScrollReveal className="landing-section landing-section--testimonials">
      <div className="landing-section__heading">
        <p className="landing-kicker">Council of Matas</p>
        <h2>Three placeholder reviewers. One shared name.</h2>
      </div>
      <div className="landing-marquee" aria-label="Student testimonials">
        <div className="landing-marquee__track">
          {[false, true].map((isDuplicate) => (
            <div
              aria-hidden={isDuplicate ? true : undefined}
              className="landing-marquee__group"
              key={isDuplicate ? "duplicate" : "primary"}
            >
              {testimonials.map((testimonial) => (
                <article
                  className="landing-testimonial-card"
                  key={`${isDuplicate ? "copy" : "original"}-${testimonial.role}`}
                >
                  <span className="landing-stars" aria-label="5 stars">
                    ★★★★★
                  </span>
                  <p>&ldquo;{testimonial.quote}&rdquo;</p>
                  <strong>Matas</strong>
                  <small>{testimonial.role}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
