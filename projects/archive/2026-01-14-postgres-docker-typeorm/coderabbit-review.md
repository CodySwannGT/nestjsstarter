# CodeRabbit Review

## File: src/database/database.module.ts
**Lines:** 34 to 37
**Type:** potential_issue

### Comment
Security concern: rejectUnauthorized: false disables SSL certificate validation.

Setting rejectUnauthorized: false bypasses certificate verification, making the connection vulnerable to man-in-the-middle attacks in production. For Aurora Serverless with SSL enabled, the RDS CA certificate should be validated.

Consider using rejectUnauthorized: true for production or making it configurable:

### Suggested fix for SSL configuration

```typescript
ssl:
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : DEFAULT_DATABASE_SSL,
```

Or for Aurora with AWS RDS CA bundle:
```typescript
ssl:
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: true }
    : DEFAULT_DATABASE_SSL,
```

### AI Agent Prompt
In @src/database/database.module.ts around lines 34 - 37, The current SSL config sets rejectUnauthorized: false which disables certificate validation; update the SSL handling in the database module so that when process.env.DATABASE_SSL === "true" you set rejectUnauthorized: true (or read a new env var like DATABASE_REJECT_UNAUTHORIZED) instead of false, or make this behavior configurable (e.g., honor DATABASE_REJECT_UNAUTHORIZED) while keeping DEFAULT_DATABASE_SSL fallback; adjust the ssl assignment around the existing DATABASE_SSL/DEFAULT_DATABASE_SSL logic and ensure any new env var is validated and documented.
