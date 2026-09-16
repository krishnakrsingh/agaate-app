/**
 * shared/format — date and time formatting utilities.
 */

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return "--:--";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "--:--";
  return timeFormatter.format(d);
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "--";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "--";
  return dateFormatter.format(d);
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "--";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "--";
  return `${formatDate(d)} • ${formatTime(d)}`;
}
