"use client";
import { Icons } from "./icons";

export function LogoutButton({ variant = "default" }: { variant?: "default" | "menu" }) {
  if (variant === "menu") {
    return (
      <button
        type="button"
        className="btn btn-sm"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
        style={{
          width: "100%",
          justifyContent: "center",
          color: "var(--error)",
          borderColor: "rgba(179, 0, 0, 0.2)",
          background: "#fff5f5",
          minHeight: 36,
          fontWeight: 500,
        }}
      >
        <Icons.LogOut size={14} />
        <span>Sign out</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
      title="Sign out of console"
      style={{
        padding: "6px 14px",
        fontSize: "13px",
        minHeight: "32px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      <Icons.LogOut size={13} />
      <span>Sign out</span>
    </button>
  );
}
