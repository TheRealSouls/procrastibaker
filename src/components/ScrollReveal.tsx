import { useEffect, useRef, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function ScrollReveal({
  children,
  className = "",
  id,
}: ScrollRevealProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("is-visible");
          observer.unobserve(section);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.16 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={["landing-reveal", className].filter(Boolean).join(" ")}
      id={id}
      ref={sectionRef}
    >
      {children}
    </section>
  );
}
