import { defineConfig } from "vitest/config";

// Minimal standalone config used to run the audit logger spec without loading
// the full project vite/vitest config (which requires assistant-ui deps that
// are only resolvable inside the pnpm workspace).
export default defineConfig({
  test: {
    environment: "node",
    include: ["actions/lib/audit.spec.ts"],
  },
});
