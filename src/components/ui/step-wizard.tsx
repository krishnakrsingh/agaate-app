"use client";

import React, { ReactNode } from "react";
import { Icons } from "@/components/icons";

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  isValid?: boolean;
}

interface StepWizardProps {
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  children: ReactNode;
  maxWidth?: string;
  nextDisabled?: boolean;
}

export function StepWizard({
  title,
  subtitle,
  steps,
  currentStep,
  onStepChange,
  onClose,
  onSubmit,
  submitLabel = "Save & Complete",
  isSubmitting = false,
  children,
  maxWidth = "720px",
  nextDisabled = false,
}: StepWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const currentStepInfo = steps[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          backgroundColor: "var(--surface-card, #ffffff)",
          border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 32px)",
          overflow: "hidden",
        }}
      >
        {/* Header with Step Progress */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--hairline, rgba(0,0,0,0.08))",
            backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    backgroundColor: "var(--green-tint)",
                    color: "var(--green-ink)",
                  }}
                >
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {currentStepInfo?.label}
                </span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "4px 0 0" }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                color: "var(--muted)",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="Close wizard"
            >
              <Icons.X size={20} />
            </button>
          </div>

          {/* Segmented Step Progress Bar */}
          <div style={{ display: "flex", gap: 6, width: "100%" }}>
            {steps.map((s, idx) => {
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDone
                      ? "var(--green-ink)"
                      : isCurrent
                      ? "var(--primary)"
                      : "var(--hairline)",
                    transition: "all 0.25s ease",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Wizard Content Body — Fixed Zero-Scroll Area */}
        <div
          style={{
            padding: "20px 24px",
            minHeight: 340,
            maxHeight: 460,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>

        {/* Footer with Prev / Next Navigation */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--hairline, rgba(0,0,0,0.08))",
            backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="btn btn-secondary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icons.ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || nextDisabled}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 90 }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-dots" style={{ width: 14, height: 14 }} />
                  <span>Processing…</span>
                </>
              ) : isLastStep ? (
                <>
                  <Icons.Check size={14} />
                  <span>{submitLabel}</span>
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <Icons.ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
