import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This config is only used for the GitHub Pages build (npm run deploy),
// since GitHub Pages serves the site from /customised-gifts/ instead of
// the domain root. Vercel and local dev use the plain vite.config.js.
export default defineConfig({
  plugins: [react()],
  base: "/customised-gifts/",
});
