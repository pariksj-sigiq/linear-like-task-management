/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "var(--sidebar-bg)",
        topbar: "var(--topbar-bg)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        border: "var(--border)",
        "content-bg": "var(--content-bg)",
      },
    },
  },
  plugins: [],
};
