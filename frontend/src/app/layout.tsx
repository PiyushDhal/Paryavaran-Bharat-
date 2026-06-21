import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { ClimateProvider } from "@/store/useClimateStore";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700"], 
  variable: "--font-rajdhani" 
});

export const metadata: Metadata = {
  title: "Bharat Climate Twin — National Climate Digital Twin",
  description:
    "AI-powered digital twin of India's climate system for prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks.",
  icons: {
    icon: "/favicon.jpg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable} font-sans bg-background text-slate-100 min-h-screen antialiased`}>
        <ClimateProvider>
          <AppShell>{children}</AppShell>
        </ClimateProvider>
      </body>
    </html>
  );
}
