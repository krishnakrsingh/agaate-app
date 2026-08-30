import Link from "next/link";
import { Icons } from "@/components/icons";

export default function NotFoundPage() {
  return (
    <main className="shell narrow" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-full)",
          background: "var(--harvest-light)",
          color: "var(--harvest-amber)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icons.Compass size={28} />
      </div>

      <div className="eyebrow" style={{ color: "var(--harvest-amber)" }}>
        RESOURCE NOT FOUND &bull; 404
      </div>
      <h1 style={{ marginTop: 8, marginBottom: 12 }}>Record or page is unavailable.</h1>
      <p className="muted" style={{ maxWidth: 480, marginBottom: 24 }}>
        This farm property, plot, or activity does not exist or your account role does not have authorization to view it.
      </p>

      <Link href="/dashboard" className="btn btn-primary">
        <Icons.Farm size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </main>
  );
}
