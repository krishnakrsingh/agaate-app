"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export interface EditableClient {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsappNo: string | null;
  entityType: string | null;
  panNumber: string | null;
  gstin: string | null;
  secondaryContact: string | null;
  billingAddress: string | null;
  village: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
  financeConnect: string | null;
  purchaserConnect: string | null;
}

const ENTITY_TYPES = [
  { value: "", label: "Select type" },
  { value: "INDIVIDUAL", label: "Individual / Farmer" },
  { value: "PVT_LTD", label: "Private Limited" },
  { value: "PARTNERSHIP", label: "Partnership Firm" },
  { value: "HUF", label: "Hindu Undivided Family (HUF)" },
  { value: "TRUST", label: "Trust / Foundation" },
];

function F({
  label,
  span,
  children,
}: {
  label: string;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="form-group" style={{ margin: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function ClientEditForm({
  client,
  returnTo,
}: {
  client: EditableClient;
  returnTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const back = returnTo ?? `/hq/clients/${client.id}`;

  const [form, setForm] = useState({
    name: client.name ?? "",
    companyName: client.companyName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    whatsappNo: client.whatsappNo ?? "",
    entityType: client.entityType ?? "",
    panNumber: client.panNumber ?? "",
    gstin: client.gstin ?? "",
    secondaryContact: client.secondaryContact ?? "",
    billingAddress: client.billingAddress ?? "",
    village: client.village ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    district: client.district ?? "",
    pincode: client.pincode ?? "",
    financeConnect: client.financeConnect ?? "",
    purchaserConnect: client.purchaserConnect ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Client name is required.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          whatsappNo: form.whatsappNo.trim() || null,
          entityType: form.entityType || null,
          panNumber: form.panNumber.trim() || null,
          gstin: form.gstin.trim() || null,
          secondaryContact: form.secondaryContact.trim() || null,
          billingAddress: form.billingAddress.trim() || null,
          village: form.village.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          district: form.district.trim() || null,
          pincode: form.pincode.trim() || null,
          financeConnect: form.financeConnect.trim() || null,
          purchaserConnect: form.purchaserConnect.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Unable to save client changes.");

      toast.success("Client details updated.");
      router.push(back);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save client changes.");
      setPending(false);
    }
  }

  return (
    <article className="compact-card" style={{ padding: 24, gap: 18 }}>
      <div className="page-header" style={{ paddingBottom: 12 }}>
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>EDIT CLIENT</span>
          </div>
          <h2 className="section-title">Edit Client: {client.name}</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Update this client&apos;s profile. Existing values are pre-filled.
          </p>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <section className="section-block">
          <div className="form-section-title">1. Identity &amp; Contact</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Client Name">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
            </F>
            <F label="Business / Company Name">
              <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} maxLength={180} />
            </F>
            <F label="Mobile Number">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} inputMode="tel" />
            </F>
            <F label="WhatsApp Number">
              <input value={form.whatsappNo} onChange={(e) => set("whatsappNo", e.target.value)} maxLength={20} inputMode="tel" />
            </F>
            <F label="Email">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={254} />
            </F>
            <F label="Secondary Contact">
              <input value={form.secondaryContact} onChange={(e) => set("secondaryContact", e.target.value)} maxLength={100} />
            </F>
          </div>
        </section>

        <section className="section-block">
          <div className="form-section-title">2. Location &amp; Address</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Village">
              <input value={form.village} onChange={(e) => set("village", e.target.value)} maxLength={100} />
            </F>
            <F label="City">
              <input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
            </F>
            <F label="State">
              <input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={100} />
            </F>
            <F label="PIN Code">
              <input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={12} inputMode="numeric" />
            </F>
            <F label="Billing Location" span>
              <input
                value={form.billingAddress}
                onChange={(e) => set("billingAddress", e.target.value)}
                maxLength={300}
                placeholder="Door / survey no, street, layout"
              />
            </F>
          </div>
        </section>

        <section className="section-block">
          <div className="form-section-title">3. Business &amp; Compliance</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <F label="Entity Type">
              <select value={form.entityType} onChange={(e) => set("entityType", e.target.value)}>
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </F>
            <F label="GST (GSTIN)">
              <input value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={25} />
            </F>
            <F label="PAN">
              <input value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} maxLength={20} />
            </F>
            <F label="Finance Connect">
              <input
                value={form.financeConnect}
                onChange={(e) => set("financeConnect", e.target.value)}
                maxLength={200}
                placeholder="Name / contact for finance"
              />
            </F>
            <F label="Purchaser Connect" span>
              <input
                value={form.purchaserConnect}
                onChange={(e) => set("purchaserConnect", e.target.value)}
                maxLength={200}
                placeholder="Name / contact for procurement"
              />
            </F>
          </div>
        </section>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.push(back)} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Icons.Check size={14} />
            <span>{pending ? "Saving…" : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
