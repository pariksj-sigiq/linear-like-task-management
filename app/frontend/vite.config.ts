import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: process.env.ELECTRON === "true" ? "./" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/health": "http://localhost:8030",
      "/tools": "http://localhost:8030",
      "/api": "http://localhost:8030",
      "/step": "http://localhost:8030",
      "/reset": "http://localhost:8030",
      "/snapshot": "http://localhost:8030",
    },
  },
});
