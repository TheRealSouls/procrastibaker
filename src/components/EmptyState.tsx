import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  compact?: boolean;
  icon: string;
  title?: string;
};

export function EmptyState({
  children,
  compact = false,
  icon,
  title,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="empty-note-card">
        <span aria-hidden="true">{icon}</span>
        <p>{children}</p>
      </div>
    );
  }

  return (
    <section className="page-card empty-state">
      <span aria-hidden="true">{icon}</span>
      {title && <h2>{title}</h2>}
      <p>{children}</p>
    </section>
  );
}
