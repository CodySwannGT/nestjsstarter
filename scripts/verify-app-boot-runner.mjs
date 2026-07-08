#!/usr/bin/env node
/**
 * Bundles scripts/verify-app-boot.ts with esbuild + @anatine/esbuild-decorators
 * (the same transformer the serverless bundling pipeline uses, so decorator
 * metadata is emitted correctly), then runs the bundle in a Node child process.
 *
 * Necessary because tsx and bun's TypeScript runtimes don't preserve the
 * `design:type` metadata that TypeORM column decorators need for type
 * inference — only the tsc-backed pipeline produces a runnable boot script.
 *
 * @module scripts/verify-app-boot-runner
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { esbuildDecorators } from "@anatine/esbuild-decorators";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, ".build-boot");
const outFile = resolve(outDir, "verify-app-boot.js");

mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(__dirname, "verify-app-boot.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: outFile,
  sourcemap: "inline",
  keepNames: true,
  logLevel: "warning",
  plugins: [
    esbuildDecorators({ tsconfig: resolve(repoRoot, "tsconfig.json") }),
  ],
  // Match serverless.yml externals so esbuild doesn't try to pull in
  // optional peer deps that production also leaves external at runtime.
  external: [
    "@aws-sdk/*",
    "aws-sdk",
    "fsevents",
    "@nestjs/websockets",
    "@nestjs/microservices",
    "@apollo/gateway",
    "@apollo/subgraph",
    "@as-integrations/fastify",
    "ts-morph",
    "@mikro-orm/core",
    "@mikro-orm/nestjs",
    "@nestjs/mongoose",
    "@nestjs/sequelize",
    "mongoose",
    "sequelize",
    "class-transformer/storage",
  ],
});

const child = spawn(process.execPath, [outFile], {
  cwd: repoRoot,
  stdio: "inherit",
});

child.on("exit", code => {
  process.exit(code ?? 1);
});
