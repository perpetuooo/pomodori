import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "index.html",
        options: "options.html",
        content: "src/lib/content.ts"
      },
      output: {
        entryFileNames: chunk => chunk.name === 'content' ? '[name].js' : 'assets/[name]-[hash].js'
      }
    }
  }
});
