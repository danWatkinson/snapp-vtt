import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      enabled: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100
    },
    include: ["apps/services/**/*.test.ts"]
  }
});


