import type { ReactNode } from "react";

type StatCardProps = {
  accessory?: ReactNode;
  description?: string;
  label: string;
  value: number | string;
  variant?: "metric" | "stat";
};

export function StatCard({
  accessory,
  description,
  label,
  value,
  variant = "stat",
}: StatCardProps) {
  return (
    <article className={`page-card ${variant}-card`}>
      <span>{label}</span>
      <div className="stat-card__value-row">
        {accessory}
        <strong>
          {typeof value === "number" ? value.toLocaleString() : value}
        </strong>
      </div>
      {description && <p>{description}</p>}
    </article>
  );
}
