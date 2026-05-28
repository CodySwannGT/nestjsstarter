---
id: task-01
title: Add Local Valkey Docker Configuration
status: pending
priority: high
phase: 1
---

# Add Local Valkey Docker Configuration

## Objective

Create docker-compose.yml with Valkey container for local development environment.

## Requirements

1. Add `docker-compose.yml` to project root with Valkey 8 Alpine image
2. Configure persistent volume for data
3. Expose standard Redis port (6379)
4. Add health check for container readiness

## Implementation Details

- Use `valkey/valkey:8-alpine` image (official Valkey image)
- Mount volume at `/data` for persistence
- Configure `appendonly yes` for AOF persistence
- Add network for service isolation

## Files to Create/Modify

- `/Users/cody/workspace/thumbwar/backend/docker-compose.yml` (create)

## Acceptance Criteria

- [ ] docker-compose.yml exists with Valkey service
- [ ] `docker-compose up -d` successfully starts Valkey
- [ ] Can connect to Valkey on localhost:6379
- [ ] Container has health check configured

## Dependencies

None - this is the first task.
