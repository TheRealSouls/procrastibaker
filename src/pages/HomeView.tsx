import { ScrollReveal } from "../components/ScrollReveal";
import { PastryVisual } from "../components/PastryVisual";
import { pastries } from "../data/pastries";
import bakeryImage from "../media/bakery.jpg";
import croissantIcon from "../media/sprites/icon.png";

type HomeViewProps = {
  onStart: () => void;
};

const appName = "Procrastibaker";
const githubUrl = "https://github.com/TheRealSouls/procrastibaker";
const linkedinUrl = "https://www.linkedin.com/in/matas-roda-981421357/";

const steps = [
  {
    title: "Choose your pastry",
    copy: "Pick a cookie, brownie, muffin, or cake before your focus block begins.",
    pastryId: "cookie",
  },
  {
    title: "Set your focus timer",
    copy: "Choose a study length and tag it by subject, task, or study mode.",
    pastryId: "brownie",
  },
  {
    title: "Bake your progress",
    copy: "Stay focused to finish the bake, earn coins, and grow your bakery.",
    pastryId: "muffin",
  },
];

const features = [
  {
    icon: "01",
    title: "Gamified study timer",
    copy: "Turn a plain countdown into a small baking ritual with clear stakes.",
  },
  {
    icon: "02",
    title: "Animated oven baking",
    copy: "Watch your selected pastry warm up without noisy, distracting motion.",
  },
  {
    icon: "03",
    title: "Pastry collection",
    copy: "Completed sessions become bakery shelf wins you can revisit later.",
  },
  {
    icon: "04",
    title: "Coloured study tags",
    copy: "Separate work, revision, reading, breaks, and projects at a glance.",
  },
  {
    icon: "05",
    title: "Detailed statistics",
    copy: "See completed minutes, completion rate, favourite tags, and top bakes.",
  },
  {
    icon: "06",
    title: "Unlockable pastries",
    copy: "Spend earned coins on sweeter rewards as your focus history grows.",
  },
  {
    icon: "07",
    title: "Optional oven sounds",
    copy: "Use a small ambient loop when you want the kitchen to feel alive.",
  },
  {
    icon: "08",
    title: "Expired pastry bin",
    copy: "Cancelled sessions are recorded clearly, without shaming the student.",
  },
];

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

function getPastry(pastryId: string) {
  return pastries.find((pastry) => pastry.id === pastryId) ?? pastries[0];
}

export function HomeView({ onStart }: HomeViewProps) {
  const heroPastry = getPastry("cookie");
  const previewPastries = ["cookie", "brownie", "muffin", "birthday-cake"].map(
    getPastry,
  );
  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-orb landing-orb--top" aria-hidden="true" />
        <div className="landing-orb landing-orb--bottom" aria-hidden="true" />

        <nav className="landing-nav" aria-label="Landing page navigation">
          <a className="landing-brand" href="#top" aria-label="Procrastibaker home">
            <img
              alt=""
              aria-hidden="true"
              className="landing-brand__icon"
              draggable={false}
              src={croissantIcon}
            />
            <strong>{appName}</strong>
          </a>
          <div className="landing-nav__links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#preview">Preview</a>
          </div>
          <button className="button primary landing-nav__cta" onClick={onStart} type="button">
            Start Baking
          </button>
        </nav>

        <div className="landing-hero__grid" id="top">
          <div className="landing-hero__copy">
            <p className="landing-kicker">Study timer meets tiny bakery</p>
            <h1 id="landing-title">Satisfy your sweet tooth.</h1>
            <p className="landing-hero__subtitle">
              Turn focused study sessions into freshly baked rewards. Pick a
              pastry, set your timer, and watch your focus rise in the oven.
              Complete the session to grow your bakery. Quit early, and your
              bake goes stale.
            </p>
            <div className="landing-hero__actions">
              <button className="button primary landing-button" onClick={onStart} type="button">
                Start Baking
              </button>
              <a className="button landing-button landing-button--secondary" href="#how-it-works">
                How It Works
              </a>
            </div>
          </div>

          <div className="landing-hero__visual" aria-label="Preview of a bakery study timer">
            <div className="landing-photo-card">
              <img alt="A warm bakery counter with pastries" src={bakeryImage} />
            </div>
            <div className="landing-preview-card landing-preview-card--timer">
              <div>
                <span className="landing-preview-card__label">Baking now</span>
                <strong>24:15</strong>
              </div>
              <div className="landing-mini-oven">
                <PastryVisual
                  className="landing-mini-oven__pastry"
                  emoji={heroPastry.emoji}
                  pastryId={heroPastry.id}
                  pastryName={heroPastry.name}
                />
              </div>
              <div className="landing-progress" aria-hidden="true">
                <span />
              </div>
            </div>
            <div className="landing-preview-card landing-preview-card--shelf">
              <span className="landing-preview-card__label">Bakery shelf</span>
              <div className="landing-sprite-row">
                {previewPastries.map((pastry) => (
                  <PastryVisual
                    emoji={pastry.emoji}
                    key={pastry.id}
                    pastryId={pastry.id}
                    pastryName={pastry.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollReveal className="landing-section landing-section--steps" id="how-it-works">
        <div className="landing-section__heading">
          <p className="landing-kicker">How it works</p>
          <h2>Three steps from procrastination to pastry.</h2>
          <p>
            The loop is simple: choose the bake, protect the timer, and turn
            completed study time into a shelf full of small wins.
          </p>
        </div>
        <div className="landing-step-grid">
          {steps.map((step, index) => {
            const pastry = getPastry(step.pastryId);

            return (
              <article className="landing-step-card" key={step.title}>
                <span className="landing-card-number">0{index + 1}</span>
                <PastryVisual
                  className="landing-card-pastry"
                  emoji={pastry.emoji}
                  pastryId={pastry.id}
                  pastryName={pastry.name}
                />
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            );
          })}
        </div>
      </ScrollReveal>

      <ScrollReveal className="landing-section" id="features">
        <div className="landing-section__heading">
          <p className="landing-kicker">Features</p>
          <h2>Designed for students who need focus to feel less sterile.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <span aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </ScrollReveal>

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

      <ScrollReveal className="landing-section landing-section--preview" id="preview">
        <div className="landing-section__heading">
          <p className="landing-kicker">App preview</p>
          <h2>A focused kitchen for your next study block.</h2>
          <p>
            The landing page points into the same localStorage-backed prototype:
            timer, bakery, shop, statistics, audio controls, and auth stay where
            they already are.
          </p>
        </div>
        <div className="landing-app-preview">
          <article className="landing-preview-panel landing-preview-panel--oven">
            <span className="landing-preview-card__label">Timer</span>
            <div className="landing-mini-oven landing-mini-oven--large">
              <PastryVisual
                className="landing-mini-oven__pastry"
                emoji={getPastry("brownie").emoji}
                pastryId="brownie"
                pastryName="Brownie"
              />
            </div>
            <div className="landing-progress landing-progress--wide" aria-hidden="true">
              <span />
            </div>
            <strong>Brownie - 45 min - Revision</strong>
          </article>
          <article className="landing-preview-panel">
            <span className="landing-preview-card__label">Collection</span>
            <div className="landing-collection-preview">
              {previewPastries.map((pastry) => (
                <div className="landing-shelf-slot" key={pastry.id}>
                  <PastryVisual
                    emoji={pastry.emoji}
                    pastryId={pastry.id}
                    pastryName={pastry.name}
                  />
                  <span>{pastry.name}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="landing-preview-panel">
            <span className="landing-preview-card__label">Stats</span>
            <div className="landing-stat-preview-header">
              <strong>Study mix</strong>
              <span>This week</span>
            </div>
            <div className="landing-stat-bars" aria-label="Example study time breakdown">
              <div className="landing-stat-bar-row">
                <span>Revision</span>
                <div className="landing-stat-track" aria-hidden="true">
                  <span className="landing-stat-fill" style={{ width: "86%" }} />
                </div>
                <strong>86%</strong>
              </div>
              <div className="landing-stat-bar-row">
                <span>Reading</span>
                <div className="landing-stat-track" aria-hidden="true">
                  <span className="landing-stat-fill" style={{ width: "64%" }} />
                </div>
                <strong>64%</strong>
              </div>
              <div className="landing-stat-bar-row">
                <span>Projects</span>
                <div className="landing-stat-track" aria-hidden="true">
                  <span className="landing-stat-fill" style={{ width: "42%" }} />
                </div>
                <strong>42%</strong>
              </div>
            </div>
            <p className="landing-stat-note">
              Track study, work, reading, revision, and project time without
              adding chart libraries.
            </p>
          </article>
        </div>
      </ScrollReveal>

      <ScrollReveal className="landing-final-cta">
        <div>
          <p className="landing-kicker">Ready?</p>
          <h2>Ready to bake your next study session?</h2>
          <p>
            Start a timer, stay focused, and fill your bakery one pastry at a
            time.
          </p>
        </div>
        <button className="button primary landing-button" onClick={onStart} type="button">
          Start Baking
        </button>
      </ScrollReveal>

      <footer className="landing-footer">
        <div>
          <strong>{appName}</strong>
          <p>
            A cozy study timer where every focused block comes out of the oven.
            All you knead is love.
          </p>
        </div>
        <nav aria-label="Project links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href={githubUrl} rel="noreferrer" target="_blank">
            <i className="fa-brands fa-github fa-2x" aria-hidden="true" />
            <span>GitHub</span>
          </a>
          <a href={linkedinUrl} rel="noreferrer" target="_blank">
            <i className="fa-brands fa-linkedin fa-2x" aria-hidden="true" />
            <span>LinkedIn</span>
          </a>
        </nav>
      </footer>
    </main>
  );
}
