# Findings

Document discoveries, learnings, and issues encountered during implementation.

## Research Findings

<!-- Add findings from research phase here -->

## Implementation Notes

### Task 0001: IAuthService Interface

- Created placeholder input and type files to allow the interface to compile before subsequent tasks (0002-0006) implement the full GraphQL types
- The interface mirrors the reference implementation from sample-project/backend-v2 with full JSDoc documentation
- Express `Request` type is used as an optional parameter for methods that need device/location tracking

### Task 0009: LocalAuthService with signIn Method

- Used Node's `crypto.randomBytes` instead of `Math.random()` to satisfy the `sonarjs/pseudo-random` lint rule
- The session ID format changed from base36 random to hex random but still matches the specification pattern `local-session-{timestamp}-{random}`
- Test file was already created in a previous task; implementation followed TDD pattern
- The `LocalAuthService` implements `Partial<IAuthService>` since only `signIn` is implemented in this task

### Task 0014: CognitoService for Production Authentication

- Required installing two new dependencies: `@aws-sdk/client-cognito-identity-provider` and `@nestjs/config`
- Used NestJS ConfigService for Cognito configuration (AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID)
- Created local interfaces (CognitoAuthResponse, CognitoAuthResultResponse) to properly type Cognito SDK responses
- Helper methods (createSignInResult, createConfirmSignInResult, handleErrorConfirmSignin) transform Cognito responses to GraphQL types
- Tests mock the entire `@aws-sdk/client-cognito-identity-provider` module to isolate unit tests from AWS infrastructure
- Achieved 100% test coverage with 12 unit tests

## Issues Encountered

<!-- Document any problems and their solutions -->
