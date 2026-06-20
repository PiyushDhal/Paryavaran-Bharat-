import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        surface: "#0F1723",
        "surface-elevated": "#182534",
        "card-bg": "#1B2B3D",
        "brand-blue": "#4DA8DA",
        "brand-titanium": "#C0C8D4",
        "brand-highlight": "#74C7EC"
      },
      borderRadius: {
        "2xl": "20px"
      },
      boxShadow: {
        glow: "0 0 40px rgba(52, 211, 153, 0.18)"
      },
      backgroundImage: {
        "radar-grid":
          "linear-gradient(rgba(52, 211, 153, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 211, 153, 0.08) 1px, transparent 1px)"
      },
      animation: {
        "spin-slow": "spin 8s linear infinite"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
