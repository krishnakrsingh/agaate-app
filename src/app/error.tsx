"use client";
import Link from "next/link";
import { Icons } from "@/components/icons";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell narrow" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-full)",
          background: "var(--danger-light)",
          color: "var(--danger-red)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icons.AlertTriangle size={28} />
      </div>

      <div className="eyebrow" style={{ color: "var(--danger-red)" }}>
        OPERATIONAL SYSTEM ERROR
      </div>
      <h1 style={{ marginTop: 8, marginBottom: 12 }}>Something unexpected occurred.</h1>
      <p className="muted" style={{ maxWidth: 480, marginBottom: 24 }}>
        No farm operation was altered or lost. Please verify your connection or retry the operation.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          <span>Try Again</span>
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </main>
  );
}
