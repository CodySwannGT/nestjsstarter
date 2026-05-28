# Task 15: Update package.json Scripts for Local Development and Deployment

## Objective
Update package.json with scripts for running and deploying the serverless application.

## Scripts to Add/Update

### package.json scripts section
```json
{
  "scripts": {
    "start:local": "IS_OFFLINE=true sls offline start --noTimeout",
    "start:dev": "IS_OFFLINE=true sls offline start --stage dev",
    "deploy:dev": "sls deploy --stage dev",
    "deploy:staging": "sls deploy --stage staging",
    "deploy:production": "sls deploy --stage production"
  }
}
```

## Notes
- `IS_OFFLINE=true` enables local schema file generation
- `--noTimeout` prevents Lambda timeout during local development
- Remove placeholder "TODO" from existing start scripts

## Acceptance Criteria
- [x] start:local script added
- [x] start:dev script updated (remove TODO)
- [x] deploy scripts added for dev/staging/production
- [x] No JSON syntax errors in package.json

## Verification
```bash
# Verify package.json is valid
node -e "require('./package.json')"

# Test script availability
bun run --list
```
