
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages project sites are hosted under /<repository>/.
// Explicitly select the subpath only for release builds; local development
// and ordinary CI builds keep Vite's default root path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.MATCHWORK_PAGES === 'true' ? '/matchwork/' : '/',
})
