import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside a React Server environment; tests import server modules directly.
    alias: { "server-only": new URL("./tests/unit/stubs/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    css: false,
  },
});
