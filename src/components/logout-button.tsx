"use client";
export function LogoutButton() {
  return (
    <button
      type="button"
      className="quiet-button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
