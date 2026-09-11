"use client";

import { GrainGradient } from "@paper-design/shaders-react";

export function AgronomyShowcasePanel() {
  return (
    <div
      className="agaate-showcase-panel"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        borderRadius: 20,
        backgroundColor: "#000000",
        padding: "clamp(20px, 3.5vw, 48px)",
        boxSizing: "border-box",
        color: "#ffffff",
      }}
    >
      {/* The signature GrainGradient shader */}
      <GrainGradient
        speed={1}
        scale={1}
        rotation={0}
        offsetX={0}
        offsetY={0}
        softness={0.5}
        intensity={0.5}
        noise={0.25}
        shape="corners"
        frame={2854.5}
        colors={["#FFFFFF", "#FC7819", "#FC7819", "#FFFFFF"]}
        colorBack="#00000000"
        className="absolute inset-0 bg-black pointer-events-none"
      />

      {/* Subtle contrast gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Text Container */}
      <div
        className="agaate-showcase-top"
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "clamp(2px, 1vw, 24px)",
          marginBottom: "auto",
          maxWidth: 520,
        }}
      >
        <h2
          style={{
            fontFamily: "'Satoshi', 'Geist', sans-serif",
            fontSize: "clamp(18px, 2.4vw, 42px)",
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "-0.025em",
            color: "#ffffff",
            margin: "0 0 clamp(6px, 1vw, 14px) 0",
          }}
        >
          Controlled agronomy intelligence from soil to harvest.
        </h2>

        <p
          style={{
            fontFamily: "'Geist', 'Inter', sans-serif",
            fontSize: "clamp(12px, 1.05vw, 15px)",
            fontWeight: 400,
            lineHeight: 1.5,
            color: "rgba(255, 255, 255, 0.78)",
            margin: 0,
            maxWidth: 440,
          }}
        >
          Real-time GPS geofence radar, automated fertigation cycles, and verified field operations across every commercial plot.
        </p>
      </div>

      {/* Bottom: Clean horizontal line with rich brand promise aligned to the right (Desktop only) */}
      <div
        className="showcase-bottom-quote"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          borderTop: "1px solid rgba(255, 255, 255, 0.16)",
          paddingTop: "clamp(10px, 1.4vw, 18px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          textAlign: "right",
        }}
      >
        <div
          style={{
            fontFamily: "'Satoshi', 'Geist', sans-serif",
            fontSize: "clamp(12px, 1.05vw, 15px)",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.95)",
            letterSpacing: "-0.01em",
            marginBottom: 3,
          }}
        >
          Built for the field. Proven across every acre.
        </div>
        <p
          style={{
            fontFamily: "'Geist', 'Inter', sans-serif",
            fontSize: "clamp(10.5px, 0.9vw, 13px)",
            fontWeight: 400,
            lineHeight: 1.45,
            color: "rgba(255, 255, 255, 0.7)",
            letterSpacing: "0.005em",
            margin: 0,
            maxWidth: 460,
          }}
        >
          From soil moisture and fertigation cycles to verified field scout attendance — continuous ground-truth operations.
        </p>
      </div>
    </div>
  );
}




