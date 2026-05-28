# Start here — Thumbwar Backend Wiki

## Purpose
The durable knowledge base for the Thumbwar backend — a NestJS GraphQL platform built on a Lisa-governed agent workflow. It captures how the service is architected (Apollo GraphQL API, authentication, the database and DataLoader layers, GraphQL subscriptions and websockets, Valkey/Redis caching, health checks, and OpenTelemetry tracing), the decisions and conventions behind it, and the operational playbooks the team and its agents rely on, so contributors and AI agents can answer questions and onboard from a single cited source of truth.

## What this is
A git-native LLM Wiki owned by **Thumbwar** and maintained by the `lisa-wiki` kernel. It is the
durable home for this project's knowledge (and documentation). Raw sources are preserved under
`wiki/sources/`; distilled knowledge lives in the category pages; the rules are in
`wiki/schema/llm-wiki-contract.md`.

## How to use it
- **New here?** Run `/onboard-me` (Codex: `$lisa-wiki-onboard-me`) for a guided tour + sample questions.
- **Find/answer something:** `/query "<question>"` — cited answers from the wiki.
- **Add knowledge:** `/ingest <url|file|prompt>` (Codex: `$lisa-wiki-ingest`), or `/ingest` with no
  argument for a full ingest across all enabled non-external-write sources (external-write sources
  require explicit intent).
- **Browse:** [index.md](index.md).
- **Check health:** `/lint`.

## Map
Synthesis categories: concepts, entities, decisions, architecture, requirements, playbooks, open-questions, projects, sales, marketing, finance, customers, people, legal.
Sources: `wiki/sources/` · State: `wiki/state/` · Contract:
`wiki/schema/llm-wiki-contract.md` · Log: `wiki/log.md`.
