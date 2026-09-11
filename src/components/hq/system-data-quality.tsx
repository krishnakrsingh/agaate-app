export type DataQualityCounts = {
  farmsMissingBoundary: number;
  usersWithoutPhone: number;
  plotsWithoutCycles: number;
  duplicatePhones: number;
  duplicateEmails: number;
};

const METRICS: {
  key: keyof DataQualityCounts;
  label: string;
  hint: string;
}[] = [
  { key: "farmsMissingBoundary", label: "Farms missing boundary", hint: "No boundary polygon stored" },
  { key: "usersWithoutPhone", label: "Users without phone", hint: "Null or blank phone" },
  { key: "plotsWithoutCycles", label: "Plots without cycles", hint: "Active plots with no crop cycle" },
  { key: "duplicatePhones", label: "Duplicate phones", hint: "Phone values shared by 2+ users" },
  { key: "duplicateEmails", label: "Duplicate emails", hint: "Email values shared by 2+ users" },
];

// Presentational only; counts are loaded server-side by the page so no new
// API route was needed. A null prop means the DB check failed (see gap note).
export function SystemDataQuality({ data }: { data: DataQualityCounts | null }) {
  return (
    <section aria-label="Data quality">
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Data quality</h2>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>
        Bounded count queries over indexed columns. Duplicate checks scan at most 50 repeated values each.
      </p>
      {data == null ? (
        <div className="alert alert-danger" role="status">
          Data-quality counts are unavailable right now (database check failed). Policies and the audit explorer above are
          unaffected. Gap: counts are computed live on page load with no cached fallback.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className="compact-card"
              style={{ padding: 16 }}
              role="status"
              aria-label={`${metric.label}: ${data[metric.key]}`}
            >
              <div className="label" style={{ fontSize: 11 }}>
                {metric.label}
              </div>
              <div style={{ fontWeight: 700, fontSize: 24 }}>{data[metric.key].toLocaleString()}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {metric.hint}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
