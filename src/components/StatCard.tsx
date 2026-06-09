type StatCardProps = {
  description?: string;
  label: string;
  value: number | string;
  variant?: "metric" | "stat";
};

export function StatCard({
  description,
  label,
  value,
  variant = "stat",
}: StatCardProps) {
  return (
    <article className={`page-card ${variant}-card`}>
      <span>{label}</span>
      <strong>
        {typeof value === "number" ? value.toLocaleString() : value}
      </strong>
      {description && <p>{description}</p>}
    </article>
  );
}
