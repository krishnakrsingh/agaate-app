"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";

export function ActivateFarmButton({ farmId }: { farmId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function activate() {
    setPending(true);
    setMessage("");

    try {
      const r = await fetch(`/api/farms/${farmId}/activate`, { method: "POST" });
      setPending(false);

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err = body.error ?? "Failed to activate farm. Ensure at least one plot and crop cycle with all 4 milestones is planned.";
        setMessage(err);
        toast.error(err);
        return;
      }

      toast.success("Farm activated successfully! You can now assign officers and dispatch daily tasks.");
      router.refresh();
    } catch {
      setPending(false);
      setMessage("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={activate}
        disabled={pending}
        title="Activate this farm to begin assigning officers and daily agronomy planning"
      >
        <Icons.CheckCircle size={16} />
        <span>{pending ? "Activating…" : "Activate Farm"}</span>
      </button>
      {message && (
        <div className="error" style={{ marginTop: 8 }} role="alert">
          <Icons.AlertCircle size={16} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
