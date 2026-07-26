import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Category accent colors
        cat: {
          organize:     "#2563EB",
          optimize:     "#0D9488",
          "convert-to": "#16A34A",
          "convert-from":"#EA580C",
          edit:         "#7C3AED",
          forms:        "#4F46E5",
        },
        // BloomPDF brand palette
        bloom: {
          50:  "#FFF0F3",
          100: "#FFE0E8",
          200: "#FFC5D3",
          300: "#FF9BB3",
          400: "#FF6B8E",
          500: "#E8607A",
          600: "#D94D6A",
          700: "#B83A57",
          800: "#8F2D43",
          900: "#6B1F32",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        xs:            "0 1px 2px 0 rgba(0,0,0,0.04)",
        card:          "0 2px 8px -2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover":  "0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
        "card-active": "0 2px 8px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
        subtle:        "0 0 0 1px rgba(0,0,0,0.05)",
        section:       "0 1px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
        md:            "0 4px 16px -4px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.05)",
        lg:            "0 12px 32px -8px rgba(0,0,0,0.14), 0 4px 8px -4px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in":     "fadeIn 0.18s ease-out",
        "fade-up":     "fadeUp 0.22s ease-out",
        "scale-in":    "scaleIn 0.18s ease-out",
        "slide-up":    "slideUp 0.22s ease-out",
        "shimmer":     "shimmer 1.6s infinite linear",
        "float":       "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "float-slow":  "float 8s ease-in-out 1s infinite",
        "float-fast":  "float 4s ease-in-out 0.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [animate],
};

export default config;
