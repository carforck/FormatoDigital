import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sotec: {
          DEFAULT: "#1F1F1F", // grafito del logo
          ink: "#111111",
          green: "#92D050", // verde de los encabezados del formato (decoración)
          greenDeep: "#3F7A12", // verde para texto sobre blanco (AA)
          leaf: "#6CC24A", // verde del logo
          soft: "#F1F8E9", // fondo suave
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: { sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"] },
      keyframes: {
        "float-y": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "grow-y": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        "grow-x": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
      animation: {
        "float-y": "float-y 6s ease-in-out infinite",
        "float-y-slow": "float-y 8s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "grow-y": "grow-y 0.9s cubic-bezier(.2,.8,.2,1) both",
        "grow-x": "grow-x 0.9s cubic-bezier(.2,.8,.2,1) both",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
