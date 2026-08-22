import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  compact?: boolean;
  icon: string;
  // When set, an image sprite is shown instead of the emoji glyph in `icon`.
  iconSrc?: string;
  title?: string;
};

function EmptyStateIcon({ icon, iconSrc }: Pick<EmptyStateProps, "icon" | "iconSrc">) {
  if (iconSrc) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className="empty-state__icon-img"
        src={iconSrc}
      />
    );
  }

  return <span aria-hidden="true">{icon}</span>;
}

export function EmptyState({
  children,
  compact = false,
  icon,
  iconSrc,
  title,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="empty-note-card">
        <EmptyStateIcon icon={icon} iconSrc={iconSrc} />
        <p>{children}</p>
      </div>
    );
  }

  return (
    <section className="page-card empty-state">
      <EmptyStateIcon icon={icon} iconSrc={iconSrc} />
      {title && <h2>{title}</h2>}
      <p>{children}</p>
    </section>
  );
}
