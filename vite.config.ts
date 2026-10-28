import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  base:
    process.env.MATCHWORK_PAGES === "true"
      ? "/matchwork/"
      : "/",

  // Keep the initial application bundle below Vite's 500 kB advisory size.
  // These packages are stable, independently cacheable, and have clear dependency
  // boundaries. Do not change the studio/landing source files to accomplish this.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "motion-vendor",
              test: /[\\/]node_modules[\\/](?:motion|motion-dom|motion-utils)[\\/]/,
              priority: 20,
            },
            {
              name: "icons-vendor",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true
      }
    }
  }
});
