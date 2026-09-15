"use client";

import { useState } from "react";
import { PeopleDirectory } from "./people-directory";
import { RolesAdmin } from "./roles-admin";

type Tab = "people" | "roles";

export function InternalTeamConsole({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("people");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === "people" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("people")}
          style={{ borderRadius: "var(--radius-xs) var(--radius-xs) 0 0" }}
        >
          People
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "roles" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("roles")}
          style={{ borderRadius: "var(--radius-xs) var(--radius-xs) 0 0" }}
        >
          Roles &amp; Access
        </button>
      </div>

      {tab === "people" ? <PeopleDirectory currentUserId={currentUserId} /> : <RolesAdmin />}
    </div>
  );
}
