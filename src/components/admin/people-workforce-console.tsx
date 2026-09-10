"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { AdminConsole } from "@/components/admin-console";
import { WorkforceAttendanceConsole } from "@/components/workforce-attendance-console";

export function PeopleWorkforceConsole() {
  const [activeTab, setActiveTab] = useState<"users" | "attendance">("users");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Segmented Mode Switcher */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Icons.Users size={14} />
          <span>User Directory &amp; Farm Access</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          <Icons.Navigation size={14} />
          <span>Live Field Attendance &amp; Muster</span>
        </button>
      </div>

      {activeTab === "users" ? (
        <AdminConsole />
      ) : (
        <WorkforceAttendanceConsole initialRole="SUPER_ADMIN" />
      )}
    </div>
  );
}
