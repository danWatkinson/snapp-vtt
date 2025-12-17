import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    coverage: {
      enabled: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      exclude: [
        "apps/web/tests/**",   // exclude E2E helpers/steps
        "**/*.steps.ts",      // exclude step definition files
        ".next/**",           // exclude compiled Next.js output
        "**/.next/**",        // exclude any nested .next directories
        "**/*.config.*"       // exclude config files (vitest, jest, webpack, vite, etc.)
      ]
    },
    include: [
      "apps/services/**/*.test.ts",
      "apps/web/lib/**/*.test.{ts,tsx}",
      "packages/**/*.test.ts"
    ],
    exclude: [
      "**/tests/**"           // don’t run anything under /tests/ as unit tests
    ],
    globals: true
  }
});
