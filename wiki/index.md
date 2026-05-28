# Thumbwar Backend Wiki — Index

> The navigation map of this wiki. Maintained on every ingestion. One table per category;
> rows are `| Page | Summary | Updated |`. Read this first when looking for anything.

## Orientation
| Page | Summary | Updated |
|---|---|---|
| [start-here](start-here.md) | Orientation and the wiki's purpose | 2026-05-28 |
| [LLM Wiki Contract](schema/llm-wiki-contract.md) | The rules this wiki follows | 2026-05-28 |

## Architecture
| Page | Summary | Updated |
|---|---|---|
| [Backend Architecture](architecture/backend-overview.md) | NestJS + Apollo GraphQL on AWS Lambda; modules, data flow, components | 2026-05-28 |

## Concepts
| Page | Summary | Updated |
|---|---|---|
| [Serverless Deployment](concepts/serverless-deployment.md) | Lambda handler, warm-start cache, X-Ray, RDS IAM signer | 2026-05-28 |

## Entities
| Page | Summary | Updated |
|---|---|---|
| [GraphQL API](entities/graphql-api.md) | Apollo driver, code-first schema, auth transform, complexity/logging plugins | 2026-05-28 |
| [Authentication](entities/authentication.md) | Cognito + local-auth, JWT guard, schema auth transformer | 2026-05-28 |

## Decisions
| Page | Summary | Updated |
|---|---|---|
| [Lisa-governed quality regime](decisions/lisa-governance.md) | Lisa templates govern lint/coverage/security thresholds | 2026-05-28 |

## Open questions
| Page | Summary | Updated |
|---|---|---|
| [Deployment mechanism](open-questions/deployment-mechanism.md) | Which IaC tool provisions Lambda/RDS/Valkey? | 2026-05-28 |

## Staff
| Page | Summary | Updated |
|---|---|---|
| [Chief of Staff](staff/chief.md) | Coordinates the digital staff; owns projects/decisions/playbooks/open-questions | 2026-05-28 |
| [Sales](staff/sally.md) | Sales domain | 2026-05-28 |
| [Marketing](staff/mark.md) | Marketing domain | 2026-05-28 |
| [Finance](staff/felix.md) | Finance domain | 2026-05-28 |
| [Customer Success](staff/casey.md) | Customer success domain | 2026-05-28 |
| [People](staff/parker.md) | People operations domain | 2026-05-28 |
| [Legal & Compliance](staff/lex.md) | Legal & compliance domain | 2026-05-28 |

## Sources
| Source notes | Latest |
|---|---|
| `sources/git/` | [2026-05-28 git history](sources/git/2026-05-28-thumbwar-backend-git.md) |
| `sources/roles/` | [2026-05-28 roles roster](sources/roles/2026-05-28-roles.md) |
