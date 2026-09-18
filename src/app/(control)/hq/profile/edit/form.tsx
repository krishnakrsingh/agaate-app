"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

interface EditProfileFormProps {
  initialName: string;
  initialPhone: string;
  initialEmail: string;
  roleLabel: string;
}

export function EditProfileForm({
  initialName,
  initialPhone,
  initialEmail,
  roleLabel,
}: EditProfileFormProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() || null }),
      });
      if (res.ok) {
        success("Profile updated successfully.");
        router.push("/hq/profile");
      } else {
        const err = await res.json().catch(() => ({}));
        error(err.error ?? "Failed to update profile.");
      }
    } catch {
      error("Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 6 }}>
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            style={{ width: "100%", boxSizing: "border-box" }}
            required
            maxLength={100}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 6 }}>
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            style={{ width: "100%", boxSizing: "border-box" }}
            maxLength={20}
          />
        </div>
      </div>
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
          Account Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>{initialEmail}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 4 }}>Role</div>
            <div style={{ fontSize: 14, color: "var(--ink)" }}>{roleLabel}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--hairline)" }}>
        <Link href="/hq/profile" className="btn btn-secondary">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
