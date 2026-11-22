import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Le bot Discord (bot/) a ses propres tests, lancés avec le lanceur natif de Node.
    exclude: [...configDefaults.exclude, "bot/**"],
  },
});
