/**
 * ESLint 9 Flat Config - Project-Local Customizations
 *
 * Add project-specific ESLint rules here. This file is create-only,
 * meaning Lisa will create it but never overwrite your customizations.
 *
 * Example:
 * ```ts
 * export default [
 *   {
 *     files: ["src/legacy/**"],
 *     rules: {
 *       "@typescript-eslint/no-explicit-any": "off",
 *     },
 *   },
 * ];
 * ```
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 * @module eslint.config.local
 */
export default [
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      /**
       * Disabled for test files: sonarjs v3 only recognizes vitest.expect()
       * (namespace import) not expect() (named import from vitest globals).
       * All test files use vitest globals with named expect import.
       */
      "sonarjs/assertions-in-tests": "off",
    },
  },
  {
    rules: {
      // Pre-existing awaited and nested-function side effects predate Lisa
      // 2.189.18's tightened statement-order checks. Keep the published rule
      // stricter by default while this repo carries that cleanup as separate
      // follow-up work (mirrors the Lisa repo's own opt-out).
      "code-organization/enforce-statement-order": [
        "error",
        { checkAllFunctionBodies: false, checkAwaitedCalls: false },
      ],
    },
  },
];
