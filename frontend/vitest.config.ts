
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Include both teammate's tests and your new tests
    include: [
        "src/**/*.{test,spec}.{ts,tsx}", 
        "server/**/*.{test,spec}.{js,ts}"
    ],
  },
  resolve: {
    alias: { 
      "@": path.resolve(__dirname, "./src"),
      // Add aliases for backend modules to resolve correctly during testing
      "@server": path.resolve(__dirname, "./server")
    },
  },
});
