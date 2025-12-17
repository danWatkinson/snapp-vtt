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
        "**/*.config.*",      // exclude config files (vitest, jest, webpack, vite, etc.)
        "**/*.test.*",        // exclude all test files themselves from coverage reporting
        "apps/services/auth/app.ts",        // Express wiring/glue for auth service (covered via app.test.ts)
        "apps/services/auth/server.ts",     // Auth service bootstrap/server wiring (covered via server.test.ts)
        "apps/services/campaign/app.ts",    // Express wiring/glue for campaign service (covered via app.test.ts)
        "apps/services/campaign/server.ts", // Campaign service bootstrap/server wiring
        "apps/services/world/app.ts",       // Express wiring/glue for world service (covered via app.test.ts)
        "apps/services/world/server.ts"     // World service bootstrap/server wiring
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
