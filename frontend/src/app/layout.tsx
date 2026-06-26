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
  title: "Paryavaran Bharat — Insights. Action. Resilience.",
  description:
    "Paryavaran Bharat: AI-powered platform for India's environmental intelligence — prediction, simulation, and visualization of flood, drought, heat, water, air, and crop risks.",
  icons: {
    icon: "/paryavaran-logo.jpg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                  document.documentElement.classList.remove('dark')
                } else {
                  document.documentElement.classList.add('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable} font-sans bg-background text-foreground min-h-screen antialiased`}>
        <ClimateProvider>
          <AppShell>{children}</AppShell>
        </ClimateProvider>
      </body>
    </html>
  );
}
