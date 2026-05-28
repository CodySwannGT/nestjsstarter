/**
 * Vitest Configuration - Project-Local Customizations
 *
 * Includes path alias resolution, graphql deduplication for ESM,
 * and setup files.
 * @see https://vitest.dev/config/
 * @module vitest.config.local
 */
import path from "path";
import { fileURLToPath } from "url";

import type { ViteUserConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: ViteUserConfig = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  plugins: [
    {
      name: "graphql-instance-of-fix",
      enforce: "pre" as const,
      transform(code: string, id: string) {
        if (id.includes("graphql") && id.includes("instanceOf")) {
          return code.replace(
            "const isProduction =",
            "const isProduction = true; const _originalIsProduction ="
          );
        }
        return code;
      },
    },
  ],
  test: {
    include: ["**/*.spec.ts", "**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      // xray.config.test.ts causes OOM in fork workers because dynamic
      // import("./xray.config") triggers full dependency graph resolution
      // (aws-xray-sdk-core + graphql inlining) per import, exceeding
      // the 4GB heap limit of fork workers. The module's exported functions
      // are covered by with-subsegment.test.ts and handler-level tests.
      "**/tracing/xray.config.test.ts",
    ],
    setupFiles: ["./vitest.setup.ts"],
    teardownTimeout: 5000,
    execArgv: ["--max-old-space-size=8192"],
    server: {
      deps: {
        inline: [/graphql/],
      },
    },
  },
};

export default config;
