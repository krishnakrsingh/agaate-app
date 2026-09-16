"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import type { ContactsInput, ContactItem, ClientInput } from "./onboarding-schema";

export function OnboardingStepContacts({
  value,
  onChange,
  client,
  errors,
}: {
  value: ContactsInput;
  onChange: (v: ContactsInput) => void;
  client: ClientInput;
  errors: Record<string, string>;
}) {
  // Modes: "view", "edit", "add"
  const [addingRole, setAddingRole] = useState<"FINANCE" | "PURCHASER" | null>(null);
  const [editRole, setEditRole] = useState<"FINANCE" | "PURCHASER" | null>(null);

  // Temporary state for the new/editing contact form
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formError, setFormError] = useState("");

  const startAdd = (role: "FINANCE" | "PURCHASER") => {
    setAddingRole(role);
    setEditRole(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormError("");
  };

  const startEdit = (role: "FINANCE" | "PURCHASER", contact: ContactItem) => {
    setEditRole(role);
    setAddingRole(null);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormEmail(contact.email ?? "");
    setFormError("");
  };

  const cancelForm = () => {
    setAddingRole(null);
    setEditRole(null);
    setFormError("");
  };

  const saveContact = (role: "FINANCE" | "PURCHASER") => {
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError("Contact name must be at least 2 characters.");
      return;
    }
    const cleanPhone = formPhone.replace(/[^\d+]/g, "");
    if (cleanPhone.replace(/[^\d]/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const item: ContactItem = {
      id: `cnt_${Date.now().toString(36)}`,
      name: formName.trim(),
      phone: cleanPhone,
      email: formEmail.trim() || null,
      role,
    };

    if (role === "FINANCE") {
      onChange({ ...value, financeContact: item });
    } else {
      onChange({ ...value, purchaserContact: item });
    }
    cancelForm();
  };

  const setSameAsClient = (role: "FINANCE" | "PURCHASER") => {
    if (!client.name || !client.phone) return;
    const item: ContactItem = {
      id: `cnt_client_${role.toLowerCase()}`,
      name: client.name,
      phone: client.phone,
      email: client.email ?? null,
      role,
    };
    if (role === "FINANCE") {
      onChange({ ...value, financeContact: item });
    } else {
      onChange({ ...value, purchaserContact: item });
    }
  };

  const removeContact = (role: "FINANCE" | "PURCHASER") => {
    if (role === "FINANCE") {
      onChange({ ...value, financeContact: null });
    } else {
      onChange({ ...value, purchaserContact: null });
    }
  };

  // Pre-existing contact candidates (e.g. client itself, or other selected contact)
  const existingContacts: Array<{ label: string; contact: ContactItem }> = [];
  if (client.name && client.phone) {
    existingContacts.push({
      label: `Primary Client (${client.name})`,
      contact: {
        id: "client_self",
        name: client.name,
        phone: client.phone,
        email: client.email ?? null,
        role: "OTHER",
      },
    });
  }
  if (value.financeContact && value.financeContact.id !== "client_self") {
    existingContacts.push({
      label: `Finance Contact (${value.financeContact.name})`,
      contact: value.financeContact,
    });
  }
  if (value.purchaserContact && value.purchaserContact.id !== "client_self") {
    existingContacts.push({
      label: `Purchaser Contact (${value.purchaserContact.name})`,
      contact: value.purchaserContact,
    });
  }

  const renderContactSection = (
    role: "FINANCE" | "PURCHASER",
    title: string,
    description: string,
    contact: ContactItem | null | undefined
  ) => {
    const isAdding = addingRole === role;
    const isEditing = editRole === role;
    const roleError = errors[role === "FINANCE" ? "financeContact" : "purchaserContact"]
      ?? errors[`contacts.${role === "FINANCE" ? "financeContact" : "purchaserContact"}`];

    return (
      <div
        style={{
          background: "var(--surface-card)",
          border: roleError ? "1px solid var(--semantic-error, #dc2626)" : "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "22px 24px",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {role === "FINANCE" ? "₹" : "🛍️"}
              </span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {title} <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 2, fontWeight: 700 }}>*</span>
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>{description}</p>
            {roleError && !contact && (
              <div role="alert" style={{ fontSize: 11.5, color: "var(--semantic-error, #dc2626)", fontWeight: 600, marginTop: 6 }}>
                ⚠ {roleError}
              </div>
            )}
          </div>

          {!contact && !isAdding && (
            <div style={{ display: "flex", gap: 8 }}>
              {client.phone && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSameAsClient(role)}
                  style={{ fontSize: 11, height: 30, padding: "0 10px" }}
                >
                  <span>Same as Client</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => startAdd(role)}
                style={{ fontSize: 11, height: 30, padding: "0 12px", gap: 4 }}
              >
                <Icons.Plus size={13} />
                <span>Add Contact</span>
              </button>
            </div>
          )}
        </div>

        {/* Existing Active Contact Card */}
        {contact && !isEditing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "var(--surface-strong)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                }}
              >
                {contact.name.slice(0, 2)}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{contact.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "var(--green-light, #dcfce7)",
                      color: "var(--green, #15803d)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {role === "FINANCE" ? "FINANCE CONNECT" : "PURCHASER CONNECT"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3, fontSize: 12, color: "var(--muted)" }}>
                  <span>📞 {contact.phone}</span>
                  {contact.email && <span>✉️ {contact.email}</span>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => startEdit(role, contact)}
                style={{ height: 28, padding: "0 10px", fontSize: 11 }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeContact(role)}
                style={{ height: 28, padding: "0 8px", fontSize: 11, color: "var(--semantic-error)" }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Inline Add / Edit Form */}
        {(isAdding || isEditing) && (
          <div
            style={{
              padding: "18px 20px",
              background: "var(--surface-strong)",
              border: "1px solid var(--hairline-strong, var(--hairline))",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              {isEditing ? `Edit ${title}` : `New ${title}`}
            </div>

            {/* Quick Pick Existing Contact if available */}
            {!isEditing && existingContacts.length > 0 && (
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--hairline)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                  Or pick existing contact:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {existingContacts.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setFormName(c.contact.name);
                        setFormPhone(c.contact.phone);
                        setFormEmail(c.contact.email ?? "");
                      }}
                      style={{ fontSize: 11, height: 26 }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="ob-grid-3">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                  Full Name *
                </label>
                <input
                  className="input-field"
                  value={formName}
                  placeholder="e.g., Priya Sharma"
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                  Mobile Number *
                </label>
                <input
                  className="input-field"
                  value={formPhone}
                  inputMode="tel"
                  placeholder="e.g., 9876501234"
                  onChange={(e) => setFormPhone(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                  Email Address (Optional)
                </label>
                <input
                  className="input-field"
                  value={formEmail}
                  inputMode="email"
                  placeholder="e.g., finance@company.com"
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>
            </div>

            {formError && (
              <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 8 }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={cancelForm}
                style={{ height: 32, padding: "0 14px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => saveContact(role)}
                style={{ height: 32, padding: "0 16px" }}
              >
                {isEditing ? "Update Contact" : "Save Contact"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Context Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--surface-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          👤
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
            Contacts for {client.name || "Client"} {client.companyName ? `(${client.companyName})` : ""}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
            Establish first-class communication channels for commercial and procurement operations.
          </div>
        </div>
      </div>

      {/* Finance Connect */}
      {renderContactSection(
        "FINANCE",
        "Finance Connect",
        "Primary contact for invoices, billing escalations, and accounts verification.",
        value.financeContact
      )}

      {/* Purchaser Connect */}
      {renderContactSection(
        "PURCHASER",
        "Purchaser Connect",
        "Primary contact for produce dispatch, quality approvals, and purchase orders.",
        value.purchaserContact
      )}
    </div>
  );
}
