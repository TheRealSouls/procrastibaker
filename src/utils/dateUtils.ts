const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : dateFormatter.format(date);
}
