import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Agaate Farm Operations",
  description: "Farm operations and agronomy management platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Agaate" },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('agaate_theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ServiceWorker />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
