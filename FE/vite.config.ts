import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages ospita il progetto sotto /<repository>/; in sviluppo resta /.
  base: process.env.GITHUB_PAGES_BASE ?? "/",
});
