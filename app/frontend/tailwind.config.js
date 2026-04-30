import plugin from "tailwindcss/plugin";

const color = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", ".linear-dark"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: color("border"),
        input: color("input"),
        ring: color("ring"),
        background: color("background"),
        foreground: color("foreground"),
        primary: {
          DEFAULT: color("primary"),
          foreground: color("primary-foreground"),
        },
        secondary: {
          DEFAULT: color("secondary"),
          foreground: color("secondary-foreground"),
        },
        destructive: {
          DEFAULT: color("destructive"),
          foreground: color("destructive-foreground"),
        },
        muted: {
          DEFAULT: color("muted"),
          foreground: color("muted-foreground"),
        },
        accent: {
          DEFAULT: color("accent"),
          foreground: color("accent-foreground"),
        },
        popover: {
          DEFAULT: color("popover"),
          foreground: color("popover-foreground"),
        },
        card: {
          DEFAULT: color("card"),
          foreground: color("card-foreground"),
        },
        sidebar: {
          DEFAULT: color("sidebar"),
          foreground: color("sidebar-foreground"),
          primary: color("sidebar-primary"),
          "primary-foreground": color("sidebar-primary-foreground"),
          accent: color("sidebar-accent"),
          "accent-foreground": color("sidebar-accent-foreground"),
          border: color("sidebar-border"),
          ring: color("sidebar-ring"),
        },
        chart: {
          1: color("chart-1"),
          2: color("chart-2"),
          3: color("chart-3"),
          4: color("chart-4"),
          5: color("chart-5"),
        },
        topbar: color("topbar"),
        "primary-hover": color("primary-hover"),
        "text-primary": color("text-primary"),
        "text-secondary": color("text-secondary"),
        "content-bg": color("background"),
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      keyframes: {
        enter: {
          from: {
            opacity: "var(--tw-enter-opacity, 1)",
            transform:
              "translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))",
          },
        },
        exit: {
          to: {
            opacity: "var(--tw-exit-opacity, 1)",
            transform:
              "translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1))",
          },
        },
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".animate-in": { animation: "enter 150ms ease-out" },
        ".animate-out": { animation: "exit 150ms ease-in" },
        ".fade-in-0": { "--tw-enter-opacity": "0" },
        ".fade-out-0": { "--tw-exit-opacity": "0" },
        ".zoom-in-95": { "--tw-enter-scale": ".95" },
        ".zoom-out-95": { "--tw-exit-scale": ".95" },
        ".slide-in-from-top-2": { "--tw-enter-translate-y": "-0.5rem" },
        ".slide-in-from-bottom-2": { "--tw-enter-translate-y": "0.5rem" },
        ".slide-in-from-left-2": { "--tw-enter-translate-x": "-0.5rem" },
        ".slide-in-from-right-2": { "--tw-enter-translate-x": "0.5rem" },
        ".slide-in-from-top-10": { "--tw-enter-translate-y": "-2.5rem" },
        ".slide-in-from-bottom-10": { "--tw-enter-translate-y": "2.5rem" },
        ".slide-in-from-left-10": { "--tw-enter-translate-x": "-2.5rem" },
        ".slide-in-from-right-10": { "--tw-enter-translate-x": "2.5rem" },
        ".slide-out-to-top-10": { "--tw-exit-translate-y": "-2.5rem" },
        ".slide-out-to-bottom-10": { "--tw-exit-translate-y": "2.5rem" },
        ".slide-out-to-left-10": { "--tw-exit-translate-x": "-2.5rem" },
        ".slide-out-to-right-10": { "--tw-exit-translate-x": "2.5rem" },
      });
    }),
  ],
};
