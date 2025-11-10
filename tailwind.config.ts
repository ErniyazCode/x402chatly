import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

const addVariablesForColors = plugin(({ addBase, theme }) => {
  const allColors = flattenColorPalette(theme("colors") as Record<string, string>);
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
});

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
        "aurora-drift": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
            opacity: "1",
          },
          "33%": {
            transform: "translate(120px, -80px) scale(1.1)",
            opacity: "0.9",
          },
          "66%": {
            transform: "translate(-60px, 100px) scale(0.95)",
            opacity: "0.85",
          },
        },
        "aurora-drift-slow": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1) rotate(0deg)",
            opacity: "1",
          },
          "33%": {
            transform: "translate(-100px, 80px) scale(1.15) rotate(5deg)",
            opacity: "0.85",
          },
          "66%": {
            transform: "translate(80px, -60px) scale(1.05) rotate(-5deg)",
            opacity: "0.9",
          },
        },
        "aurora-pulse": {
          "0%, 100%": {
            transform: "scale(1) rotate(0deg)",
            opacity: "1",
          },
          "50%": {
            transform: "scale(1.08) rotate(2deg)",
            opacity: "0.8",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        aurora: "aurora 60s linear infinite",
        "aurora-slow": "aurora 90s linear infinite",
        "aurora-drift": "aurora-drift 25s ease-in-out infinite",
        "aurora-drift-slow": "aurora-drift-slow 35s ease-in-out infinite",
        "aurora-pulse": "aurora-pulse 18s ease-in-out infinite",
      },
    },
  },
  plugins: [addVariablesForColors],
};

export default config;