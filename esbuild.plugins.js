/**
 * @file esbuild.plugins.js
 * @description Custom esbuild plugins for serverless-esbuild
 * @module build
 *
 * @remarks
 * Uses @anatine/esbuild-decorators for TypeScript decorator metadata emission.
 * This package was last updated March 2022 but remains functional for NestJS.
 * Alternative: esbuild-plugin-tsc (actively maintained but slower, uses tsc).
 * Accepted risk: Package is stable for our use case; decorators API is frozen.
 */

const { esbuildDecorators } = require("@anatine/esbuild-decorators");
const path = require("path");

module.exports = [
  esbuildDecorators({
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    cwd: __dirname,
  }),
];
