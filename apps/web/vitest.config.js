import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
var vitest_config_default = defineConfig({ plugins: [react()], test: { environment: "jsdom", include: ["src/**/*.test.{js,jsx}"] } });
export {
  vitest_config_default as default
};
