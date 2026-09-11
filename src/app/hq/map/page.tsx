import type { Metadata } from "next";
import { PlatformMapConsole } from "@/components/hq/platform-map-console";

export const metadata: Metadata = {
  title: "Platform Map | HQ",
  description: "Viewport-bounded platform spatial console: farms, plots, tasks, incidents, and boundary QA.",
};

export default function HqMapPage() {
  return (
    <main style={{ padding: 16 }}>
      <PlatformMapConsole />
    </main>
  );
}
