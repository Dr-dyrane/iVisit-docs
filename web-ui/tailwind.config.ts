import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-light": "rgb(var(--primary-light) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
      },
      borderRadius: {
        "glass": "var(--radius-md)",
        "glass-lg": "var(--radius-lg)",
        "glass-xl": "var(--radius-xl)",
      },
      transitionTimingFunction: {
        "glide": "var(--ease-glide)",
        "spring": "var(--ease-spring)",
      },
      transitionDuration: {
        "fast": "var(--duration-fast)",
        "base": "var(--duration-base)",
        "slow": "var(--duration-slow)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 400ms cubic-bezier(0.23,1,0.32,1) forwards",
        "slide-up": "slide-up 600ms cubic-bezier(0.23,1,0.32,1) forwards",
        "slide-down": "slide-down 400ms cubic-bezier(0.23,1,0.32,1) forwards",
        "scale-in": "scale-in 400ms cubic-bezier(0.23,1,0.32,1) forwards",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
export default config;
