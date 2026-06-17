import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { ClimateProvider } from "@/store/useClimateStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bharat Climate Twin",
  description: "AI-powered digital twin for India's climate risk system."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <ClimateProvider>
          <AppShell>{children}</AppShell>
        </ClimateProvider>
      </body>
    </html>
  );
}
