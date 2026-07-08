# nestjsstarter — Upstreaming Backlog

Deferred infrastructure worth pulling from the production downstream backend
(`geminisportsai/projects/backend-v2`, ~4,700 commits of hardening since it was
cut from this template) into the starter. This is the remainder after the first
three upstreaming batches shipped.

**Hard rule for everything below:** every candidate file in backend-v2 carries
business couplings — entity imports, `x-pov-team-id`, `TeamSelectionMode`,
`PlayerIdApp`, `gemini-<stage>-v2` AWS profiles, `infrastructure-v2`
CloudFormation exports. Upstreaming means **extracting the generic pattern and
stripping every coupling to neutral placeholders** (`member@example.com`,
`acme`). Nothing business-specific ships into the template.

**Non-negotiable invariant:** the starter must always boot and serve locally
with zero AWS and zero network (mocks/facades where needed). Anything gated on
env/credentials must be inert by default. Verify with `bun run verify:boot` and
a credential-free `sls offline start`.

---

## Already shipped (context)

| Batch | PR | Contents |
|---|---|---|
| — | #16 | TypeScript 7, latest deps, offline Docker boot |
| 1 | #17 | serverless maturity (CORS/Sentry headers, prune, per-fn packaging, common-excludes, dotenv), `rds-db:connect`+`secretsmanager` IAM, `verify:boot` gate, deploy.yml fixes, operator scripts, `migrationsTransactionMode: "each"` |
| 2 | #18 | `src/test-utils/` harness; GraphQL hardening (depth-limit rule, batch cap, coded error hierarchy) |
| 3 | (in progress) | Sentry (`@sentry/nestjs`), Cognito custom-auth triggers |

**Dropped deliberately:** feature-flags (AWS AppConfig), `serverless-plugin-warmup`
(both per owner decision); the internal-trust GraphQL bypass (unsound —
poisons Apollo's cross-request validation cache; see PR #18).

---

## Remaining candidates (ranked)

### 1. MCP-server-as-Lambda  ★ flagship
**Source:** `backend-v2/src/mcp-server/` (`schema/`, `execution/`,
`lambda-transport.ts`, `tool-allowlist.ts`, `__mocks__/`) +
`scripts/validate-mcp-*.ts` + the `mcp-server-patterns` skill.
**What it is:** a Lambda that auto-builds MCP tools from the GraphQL schema, with
an allowlist, Lambda transport, and E2E validators.
**Why:** highest-value generic capability the starter entirely lacks; directly
relevant to Tunnl's "Ask-TunnlAi" ambitions.
**Deps:** `@modelcontextprotocol/sdk`, `zod`, `zod-to-json-schema`.
**Notes:** large. Best done *after* tunnl-backend exists so it can be validated
against a real schema. Pairs with the `mcp-server-patterns` project skill
(generic minus a couple of `geminisports.ai` endpoint examples).

### 2. Relay pagination
**Source:** `backend-v2/src/common/relay/` (connection/edge/node interfaces,
`PaginatedConnectionArgs` with a Lambda-6MB-aware default page size).
**Why:** the test-utils harness already inlines a minimal generic `Connection<T>`
(see `src/test-utils/relay.types.ts`) as a placeholder — this replaces it with
the real module.
**Deps:** `graphql-relay`, `nestjs-graphql-relay`.
**Notes:** when landed, repoint `src/test-utils/` off the inlined types.

### 3. SES email module
**Source:** `backend-v2/src/ses/`.
**Why:** thin, generic AWS SES wrapper; common backend need.
**Deps:** `@aws-sdk/client-ses`.
**Notes:** must be inert/faked offline (no SES calls without credentials).

### 4. Caching layer
**Source:** `backend-v2/src/redis/` (generic parts: `redis.service.ts`,
`team-scoped-key.ts` — NOT `org-cache.util.ts`, which is business-coupled) +
`src/config/redis.config.ts` (has a memory-store fallback for tests).
**Why:** the starter has only raw ioredis for pub/sub; this adds a real
`@nestjs/cache-manager` caching abstraction with an offline memory fallback.
**Deps:** `@nestjs/cache-manager`, `cache-manager-redis-yet`, `redis`.
**Notes:** memory-store fallback keeps it working with no Valkey/Redis locally.

### 5. Custom scalars + directives
**Source:** `backend-v2/src/common/scalars/` (`datetime.scalar.ts`,
`id.scalar.ts`) and generic directive plumbing in `src/common/directives/`.
**Skip:** `format-phone.directive.ts` (semi-specific).
**Why:** common GraphQL building blocks.

### 6. Operator skills + helper scripts
**Source:** `backend-v2/.claude/skills/` — `db-connect`, `dev-start`,
`serverless-lambda-patterns`; scripts `connect-db.sh`, `psql-iam.sh`,
`psql-secret.sh`.
**Why:** reusable operator workflows (read-only Aurora-via-RDS-Proxy psql,
`sls offline` bootstrap, Lambda patterns).
**Notes:** parameterize the hardcoded `gemini-<stage>-v2` AWS profiles and
libpq paths. The DML-block / migration-edit-block guard-hook *idea* is also
worth generalizing (backend-v2 has local `hookify.block-*` guards).

### 7. Config validation (shared gap — neither repo has it)
Neither the starter nor backend-v2 does schema-based env validation. Worth
adding to the starter regardless: a zod (or similar) schema over
`src/config/configuration.ts` that fails fast on malformed env while keeping
offline-safe defaults. Not an "upstream" — a net-new improvement.

---

## Lisa upstream follow-ups (separate track)

These are about the Lisa template that manages the starter, not the starter
itself. Until addressed, an interactive `lisa apply` will revert parts of the
starter's hardening.

- **TypeScript 7 arrangement is fragile.** Lisa force-manages `tsconfig.json`
  (restores `baseUrl`, drops the inline `experimentalDecorators`/
  `emitDecoratorMetadata`) and `package.lisa.json` force-pins `typescript ^6`
  and `build: tsc` / `typecheck: tsc --noEmit`. Mirror the expostarter/Lisa
  2.194.0 pairing: update Lisa's nestjs templates for the TS6-API-alias + TS7
  split so `lisa apply` stops reverting it.
- **Generated-mirror prettierignore entries** (`.cursor`, `.github/agents`,
  `.github/prompts`, codex skill sidecars, `.build-boot`) belong in Lisa's
  template, not hand-added per project.
- **deploy.yml `bun run install` bug** — fixed in the starter (PR #17); if
  deploy.yml is Lisa-sourced, the fix belongs upstream too.

---

## How to pick up this work

1. Branch off `main` (never work in a repo while a background agent builds there).
2. One module per PR — keep them reviewable; each PR proves the offline invariant.
3. Sanitize couplings; neutral placeholders only.
4. Gate battery must be green: `bun run typecheck && lint && test && test:cov
   && knip && format:check && verify:boot`, plus credential-free `sls offline start`.
5. Write tests to the 90% coverage bar.
