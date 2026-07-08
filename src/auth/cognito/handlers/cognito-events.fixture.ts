/**
 * @file cognito-events.fixture.ts
 * @description Test fixtures for Cognito custom-auth trigger events
 * @module auth/cognito/handlers
 * @remarks
 * Shared factories for building Cognito trigger events in unit tests. Not a
 * production module — imported only by the colocated `.test.ts` files.
 */

import type {
  Context,
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  PreSignUpTriggerEvent,
  PreTokenGenerationTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";

/** Callback context reused by every trigger fixture. */
const callerContext = {
  awsSdkVersion: "test-sdk-version",
  clientId: "test-client-id",
} as const;

/** Common scaffold values shared by every trigger fixture. */
const scaffold = {
  version: "1",
  region: "us-east-1",
  userPoolId: "test-pool-id",
  userName: "test-user",
} as const;

/** The only challenge type used in the passwordless flow fixtures. */
const CUSTOM_CHALLENGE = "CUSTOM_CHALLENGE" as const;

/** Default test phone number used across fixtures. */
const TEST_PHONE = "+18003334444";

/** Default test email used across fixtures. */
const TEST_EMAIL = "t@example.com";

/**
 * Minimal Lambda {@link Context} suitable for invoking trigger handlers in tests.
 */
export const mockLambdaContext: Context = {
  functionName: "test-function",
  functionVersion: "1",
  invokedFunctionArn: "arn:aws:lambda:region:account:function:test",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/test",
  logStreamName: "test-stream",
  callbackWaitsForEmptyEventLoop: false,
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

/** No-op Lambda callback used to satisfy the handler signature in tests. */
export const noopCallback = (): void => {};

/**
 * A single CUSTOM_CHALLENGE session entry.
 */
export interface CustomChallengeSessionEntry {
  readonly challengeName: "CUSTOM_CHALLENGE";
  readonly challengeResult: boolean;
  readonly challengeMetadata: string;
}

/**
 * Builds a session array of CUSTOM_CHALLENGE attempts.
 * @param entries - Total number of session entries to create
 * @param failed - Number of leading failed attempts to include
 * @returns Array of session entries (failures first, then successes)
 */
export function createMockSession(
  entries = 1,
  failed = 0
): CustomChallengeSessionEntry[] {
  const failures = Array.from({ length: failed }, (_unused, index) => ({
    challengeName: CUSTOM_CHALLENGE,
    challengeResult: false,
    challengeMetadata: `CODE-${100000 + index}`,
  }));
  const successes = Array.from(
    { length: Math.max(entries - failed, 0) },
    (_unused, index) => ({
      challengeName: CUSTOM_CHALLENGE,
      challengeResult: true,
      challengeMetadata: `CODE-${200000 + index}`,
    })
  );
  return [...failures, ...successes];
}

/**
 * Builds a CreateAuthChallenge trigger event.
 * @param overrides - Partial event properties to merge over the defaults
 * @returns A complete CreateAuthChallengeTriggerEvent
 */
export function createCreateAuthChallengeEvent(
  overrides: Partial<CreateAuthChallengeTriggerEvent> = {}
): CreateAuthChallengeTriggerEvent {
  return {
    ...scaffold,
    triggerSource: "CreateAuthChallenge_Authentication",
    callerContext,
    request: {
      userAttributes: { phone_number: TEST_PHONE, email: TEST_EMAIL },
      challengeName: CUSTOM_CHALLENGE,
      session: [],
      ...overrides.request,
    },
    response: {
      publicChallengeParameters: {},
      privateChallengeParameters: {},
      challengeMetadata: "",
      ...overrides.response,
    },
    ...overrides,
  } as CreateAuthChallengeTriggerEvent;
}

/**
 * Builds a DefineAuthChallenge trigger event.
 * @param overrides - Partial `request`/`response` (and top-level) overrides
 * @param overrides.request - Partial request override merged over the defaults
 * @param overrides.response - Partial response override merged over the defaults
 * @returns A complete DefineAuthChallengeTriggerEvent
 */
export function createDefineAuthChallengeEvent(
  overrides: {
    request?: Partial<DefineAuthChallengeTriggerEvent["request"]>;
    response?: Partial<DefineAuthChallengeTriggerEvent["response"]>;
    [key: string]: unknown;
  } = {}
): DefineAuthChallengeTriggerEvent {
  const { request, response, ...rest } = overrides;
  return {
    ...scaffold,
    triggerSource: "DefineAuthChallenge_Authentication",
    callerContext,
    request: {
      userAttributes: { phone_number: TEST_PHONE },
      session: [],
      ...request,
    },
    response: {
      challengeName: "",
      issueTokens: false,
      failAuthentication: false,
      ...response,
    },
    ...rest,
  } as DefineAuthChallengeTriggerEvent;
}

/**
 * Builds a VerifyAuthChallengeResponse trigger event.
 * @param overrides - Partial event properties to merge over the defaults
 * @returns A complete VerifyAuthChallengeResponseTriggerEvent
 */
export function createVerifyAuthChallengeResponseEvent(
  overrides: Partial<
    Omit<VerifyAuthChallengeResponseTriggerEvent, "request" | "response">
  > & {
    request?: Partial<VerifyAuthChallengeResponseTriggerEvent["request"]>;
    response?: Partial<VerifyAuthChallengeResponseTriggerEvent["response"]>;
  } = {}
): VerifyAuthChallengeResponseTriggerEvent {
  return {
    ...scaffold,
    triggerSource: "VerifyAuthChallengeResponse_Authentication",
    callerContext,
    request: {
      userAttributes: { phone_number: TEST_PHONE },
      privateChallengeParameters: { secretLoginCode: "123456" },
      challengeAnswer: "123456",
      userNotFound: false,
      ...overrides.request,
    },
    response: {
      answerCorrect: false,
      ...overrides.response,
    },
    ...overrides,
  } as VerifyAuthChallengeResponseTriggerEvent;
}

/**
 * Builds a PreSignUp trigger event.
 * @param overrides - Partial event properties to merge over the defaults
 * @returns A complete PreSignUpTriggerEvent
 */
export function createPreSignUpEvent(
  overrides: Partial<PreSignUpTriggerEvent> = {}
): PreSignUpTriggerEvent {
  return {
    ...scaffold,
    triggerSource: "PreSignUp_SignUp",
    callerContext,
    request: {
      userAttributes: { phone_number: TEST_PHONE, email: TEST_EMAIL },
      ...overrides.request,
    },
    response: {
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
      ...overrides.response,
    },
    ...overrides,
  } as PreSignUpTriggerEvent;
}

/**
 * Builds a PreTokenGeneration trigger event.
 * @param overrides - Partial event properties to merge over the defaults
 * @returns A complete PreTokenGenerationTriggerEvent
 */
export function createPreTokenGenerationEvent(
  overrides: Partial<PreTokenGenerationTriggerEvent> = {}
): PreTokenGenerationTriggerEvent {
  return {
    ...scaffold,
    triggerSource: "TokenGeneration_Authentication",
    callerContext,
    request: {
      userAttributes: { phone_number: TEST_PHONE, email: TEST_EMAIL },
      groupConfiguration: {
        groupsToOverride: [],
        iamRolesToOverride: [],
        preferredRole: undefined,
      },
      ...overrides.request,
    },
    response: {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {},
        claimsToSuppress: [],
        groupOverrideDetails: null,
      },
      ...overrides.response,
    },
    ...overrides,
  } as PreTokenGenerationTriggerEvent;
}
