import { defineConfig } from "@playwright/test";

// Fast tests of pure logic (no browser, no server): npm run test:unit
export default defineConfig({
  testDir: "tests/unit",
  reporter: [["list"]],
});
