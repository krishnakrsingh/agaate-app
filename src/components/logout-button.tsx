"use client";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

export function LogoutButton({ variant = "default" }: { variant?: "default" | "menu" }) {
  const router = useRouter();
  if (variant === "menu") {
    return (
      <button
        type="button"
        className="btn btn-sm"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }}
        style={{
          width: "100%",
          justifyContent: "center",
          color: "var(--negative-red)",
          borderColor: "rgba(243, 114, 127, 0.3)",
          background: "var(--negative-red-tint)",
          minHeight: 36,
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
      className="btn btn-outline btn-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
      }}
      title="Sign out of console"
    >
      <Icons.LogOut size={13} />
      <span>Sign out</span>
    </button>
  );
}
