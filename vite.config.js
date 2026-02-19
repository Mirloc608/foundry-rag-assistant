import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: "src/module.ts",
      output: {
        entryFileNames: "module.js",
        format: "es"
      }
    }
  }
});
