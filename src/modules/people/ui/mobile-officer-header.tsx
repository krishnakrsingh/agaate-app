"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface MobileOfficerHeaderProps {
  title: string;
  subtitle?: string;
  officerName?: string;
  estateName?: string;
  badge?: string;
  action?: React.ReactNode;
}

export function MobileOfficerHeader({
  title,
  subtitle,
  officerName,
  estateName,
  badge,
  action,
}: MobileOfficerHeaderProps) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="officer-field-header">
      <div className="officer-field-header-top">
        <div className="officer-meta-pill">
          <span className="officer-pulse-dot" />
          <span className="officer-role-tag">FIELD OPS</span>
          {officerName && <span className="officer-name">• {officerName}</span>}
          {estateName && <span className="officer-estate">[{estateName}]</span>}
        </div>

        <div className="officer-telemetry">
          {timeStr && <span className="officer-time" suppressHydrationWarning>{timeStr}</span>}
          {badge && <span className="officer-custom-badge">{badge}</span>}
        </div>
      </div>

      <div className="officer-field-header-main">
        <div>
          <h1 className="officer-field-title">{title}</h1>
          {subtitle && <p className="officer-field-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="officer-header-action">{action}</div>}
      </div>
    </header>
  );
}
