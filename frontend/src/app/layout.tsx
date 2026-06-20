import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { ClimateProvider } from "@/store/useClimateStore";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Bharat Climate Twin — National Climate Digital Twin",
  description:
    "AI-powered digital twin of India's climate system for prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-slate-100 min-h-screen antialiased`}>
        <ClimateProvider>
          <AppShell>{children}</AppShell>
        </ClimateProvider>
      </body>
    </html>
  );
}
