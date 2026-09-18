"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { TasksQueue } from "@modules/operations/ui/tasks-queue";
import {
  OperationsCalendar,
  CalendarEventsData,
  FarmOption,
} from "@modules/operations/ui/operations-calendar";
import { TaskForm } from "@modules/operations/ui/task-form";

interface OwnerOperationsViewProps {
  initialFarm: FarmOption;
  farms: FarmOption[];
  initialEvents: CalendarEventsData;
  initialYear: number;
  initialMonth: number;
}

export function OwnerOperationsView({
  initialFarm,
  farms,
  initialEvents,
  initialYear,
  initialMonth,
}: OwnerOperationsViewProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "calendar">("queue");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
            Farm Operations &amp; Execution
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0 0" }}>
            Monitor daily field activities, crew dispatches, fertigation, and schedule operations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Segmented View Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--surface-canvas)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 3,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "queue" ? "var(--surface-card)" : "transparent",
                color: activeTab === "queue" ? "var(--ink)" : "var(--muted)",
                boxShadow: activeTab === "queue" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icons.ClipboardList size={15} />
              <span>Activity Queue</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "calendar" ? "var(--surface-card)" : "transparent",
                color: activeTab === "calendar" ? "var(--ink)" : "var(--muted)",
                boxShadow: activeTab === "calendar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icons.Calendar size={15} />
              <span>Ops Calendar</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsScheduleModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icons.Plus size={16} />
            <span>Schedule Activity</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "queue" ? (
        <TasksQueue />
      ) : (
        <OperationsCalendar
          initialFarm={initialFarm}
          farms={farms}
          initialEvents={initialEvents}
          initialYear={initialYear}
          initialMonth={initialMonth}
        />
      )}

      {/* Zero-Scroll Schedule Activity Modal */}
      {isScheduleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: "var(--surface-card)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-canvas)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.ClipboardList size={18} style={{ color: "var(--primary)" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Schedule Farm Activity
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ padding: 4 }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>
              <TaskForm
                initialFarmId={initialFarm.id}
                onSuccess={() => setIsScheduleModalOpen(false)}
                onCancel={() => setIsScheduleModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
