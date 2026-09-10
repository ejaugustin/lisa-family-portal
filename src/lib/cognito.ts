import { createHmac } from 'node:crypto';
import { env, awsRegion } from './env';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Caregiver accounts. Cognito rather than a hand-rolled login because this
// account is a window into somebody's health and daily life — password
// hashing, reset tokens, lockout and breach response are not surface worth
// owning to save a day.
//
// Note what has NO account here: the senior. She never types a credential,
// ever. See the pairing-code design.
//
// DIAGNOSTIC (2026-09-10): config is read lazily inside a function instead of
// at module load time. A module-level `env()` throw fires the instant this
// file is imported — which happens before signInAction's own try/catch ever
// runs — so any misconfiguration crashed the whole page with no readable
// message. Reading it lazily means a bad value surfaces as a normal caught
// error instead of an opaque "Application error" page.
function config() {
  return {
    region: awsRegion(),
    clientId: env('COGNITO_CLIENT_ID'),
    clientSecret: env('COGNITO_CLIENT_SECRET'),
  };
}

let cachedClient: CognitoIdentityProviderClient | null = null;
function client(): CognitoIdentityProviderClient {
  if (!cachedClient) cachedClient = new CognitoIdentityProviderClient({ region: config().region });
  return cachedClient;
}

/** Confidential client: Cognito wants proof the caller holds the secret. */
function secretHash(username: string): string {
  const { clientId, clientSecret } = config();
  return createHmac('sha256', clientSecret).update(username + clientId).digest('base64');
}

export type Tokens = { idToken: string; accessToken: string; refreshToken?: string; expiresIn: number };

export async function signIn(email: string, password: string): Promise<Tokens> {
  const { clientId } = config();
  const res = await client().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
      },
    }),
  );
  const r = res.AuthenticationResult;
  if (!r?.IdToken || !r.AccessToken) throw new Error('sign_in_failed');
  return {
    idToken: r.IdToken,
    accessToken: r.AccessToken,
    refreshToken: r.RefreshToken,
    expiresIn: r.ExpiresIn ?? 3600,
  };
}

/**
 * Refresh needs the SECRET_HASH keyed on the user's SUBJECT, not their email —
 * an undocumented sharp edge that produces a baffling NotAuthorizedException
 * if you use the email here.
 */
export async function refresh(refreshToken: string, sub: string): Promise<Tokens> {
  const { clientId } = config();
  const res = await client().send(
    new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken, SECRET_HASH: secretHash(sub) },
    }),
  );
  const r = res.AuthenticationResult;
  if (!r?.IdToken || !r.AccessToken) throw new Error('refresh_failed');
  return { idToken: r.IdToken, accessToken: r.AccessToken, expiresIn: r.ExpiresIn ?? 3600 };
}

export async function signUp(email: string, password: string, fullName: string): Promise<void> {
  const { clientId } = config();
  await client().send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      SecretHash: secretHash(email),
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: fullName },
      ],
    }),
  );
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  const { clientId } = config();
  await client().send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      SecretHash: secretHash(email),
    }),
  );
}

export async function resendCode(email: string): Promise<void> {
  const { clientId } = config();
  await client().send(
    new ResendConfirmationCodeCommand({ ClientId: clientId, Username: email, SecretHash: secretHash(email) }),
  );
}

export async function startPasswordReset(email: string): Promise<void> {
  const { clientId } = config();
  await client().send(
    new ForgotPasswordCommand({ ClientId: clientId, Username: email, SecretHash: secretHash(email) }),
  );
}

export async function finishPasswordReset(email: string, code: string, password: string): Promise<void> {
  const { clientId } = config();
  await client().send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: password,
      SecretHash: secretHash(email),
    }),
  );
}

/**
 * Cognito's errors are named for developers, not for a worried family member
 * at eleven at night. Say what happened and what to do about it.
 */
export function readableAuthError(err: unknown): string {
  const name = (err as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAuthorizedException':
      return "That email and password don't match. Have another go, or reset your password.";
    case 'UserNotConfirmedException':
      return 'Your email address still needs confirming. We can send the code again.';
    case 'UsernameExistsException':
      return 'There is already an account with that email. Try signing in instead.';
    case 'CodeMismatchException':
      return "That code doesn't match the one we sent. Check it and try again.";
    case 'ExpiredCodeException':
      return 'That code has expired. Ask for a new one and we will send it straight away.';
    case 'InvalidPasswordException':
      return 'That password is too easy to guess. Use at least 12 characters with a number in it.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts just now. Give it a few minutes and try again.';
    default:
      return 'Something went wrong at our end. Try again in a moment.';
  }
}
