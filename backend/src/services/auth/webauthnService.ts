import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { env } from '@config/env';
import { getDatabase } from '@config/database';
import { loggers } from '@utils/logger';
import { UnauthorizedError, ConflictError } from '@middleware/errorHandler';
import { userRepository } from '@repositories/userRepository';
import { passkeyRepository } from '@repositories/passkeyRepository';
import type { Passkey } from '@typings/auth.types';

const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

interface ChallengeRow {
  id: string;
  challenge: string;
  type: string;
  user_id: string | null;
  expires_at: Date;
}

/**
 * Store a challenge in the DB and return its id (UUID generated in app code).
 */
async function storeChallenge(challenge: string, type: 'reg' | 'auth', userId?: string): Promise<string> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);
  await db('webauthn_challenges').insert({
    id,
    challenge,
    type,
    user_id: userId ?? null,
    expires_at: expiresAt,
  });

  // Fire-and-forget cleanup of expired challenges
  void db('webauthn_challenges').where('expires_at', '<', new Date()).delete().catch(() => undefined);

  return id;
}

/**
 * Consume a challenge by id. Returns the challenge string, or null if not found/expired.
 * The row is deleted immediately regardless of outcome.
 */
async function consumeChallenge(id: string): Promise<string | null> {
  const db = getDatabase();
  const row = await db('webauthn_challenges')
    .where({ id })
    .where('expires_at', '>', new Date())
    .first<ChallengeRow>();
  await db('webauthn_challenges').where({ id }).delete();
  return row?.challenge ?? null;
}

class WebAuthnService {
  private get rpId(): string {
    return env.webauthn.rpId;
  }

  private get rpName(): string {
    return env.webauthn.rpName;
  }

  private get origin(): string {
    return env.webauthn.origin;
  }

  /**
   * Generate WebAuthn registration options.
   * The challenge is stored in the DB with a 5-min TTL.
   * Returns options plus the challengeToken (DB row id) to pass back to the client.
   */
  async generateRegistrationOptions(
    userId: string,
    userEmail: string
  ): Promise<ReturnType<typeof generateRegistrationOptions> extends Promise<infer T> ? T : never> {
    const existingPasskeys = await passkeyRepository.findAllForUser(userId);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: Buffer.from(userId),
      userName: userEmail,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: pk.credentialId,
        transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await storeChallenge(options.challenge, 'reg', userId);

    return options;
  }

  /**
   * Verify a registration response and persist the new passkey.
   * The DB challenge is deleted immediately after verification.
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string
  ): Promise<Passkey> {
    const db = getDatabase();
    // Find the pending reg challenge for this user
    const row = await db('webauthn_challenges')
      .where({ type: 'reg', user_id: userId })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first<ChallengeRow>();

    if (row) {
      await db('webauthn_challenges').where({ id: row.id }).delete();
    }

    if (!row) {
      throw new UnauthorizedError('Registration session expired. Please try again.');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: row.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedError('Passkey registration verification failed');
    }

    const { credentialID, credentialPublicKey, counter, aaguid } = verification.registrationInfo;

    // Check if this credential is already registered (to another account)
    if (await passkeyRepository.existsByCredentialId(credentialID)) {
      throw new ConflictError('This passkey is already registered');
    }

    const passkey = await passkeyRepository.create({
      userId,
      credentialId: credentialID,
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      aaguid: aaguid ?? null,
      deviceName: deviceName ?? null,
      transports: (response.response.transports ?? []) as string[],
    });

    // Enable webauthn flag on user if not already set
    const user = await userRepository.findById(userId);
    if (user && !user.webauthnEnabled) {
      await userRepository.enableWebAuthn(userId);
    }

    loggers.auth('passkey_registered', userId, { deviceName });
    return passkey;
  }

  /**
   * Generate WebAuthn authentication options.
   * If userId is provided, only include credentials for that user (targeted auth).
   * The challenge is stored in the DB keyed by a random token returned to the caller.
   */
  async generateAuthenticationOptions(userId?: string): Promise<{
    options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
    challengeToken: string;
  }> {
    const allowCredentials = userId
      ? (await passkeyRepository.findAllForUser(userId)).map((pk) => ({
          id: pk.credentialId,
          transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
        }))
      : [];

    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
      allowCredentials,
    });

    const challengeToken = await storeChallenge(options.challenge, 'auth', userId);

    return { options, challengeToken };
  }

  /**
   * Verify a WebAuthn authentication response.
   * Returns the userId of the authenticated user.
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    challengeToken: string
  ): Promise<string> {
    const expectedChallenge = await consumeChallenge(challengeToken);

    if (!expectedChallenge) {
      throw new UnauthorizedError('Authentication session expired. Please try again.');
    }

    const passkey = await passkeyRepository.findByCredentialId(response.id);
    if (!passkey) {
      throw new UnauthorizedError('Passkey not found');
    }

    const publicKeyBuffer = Buffer.from(passkey.publicKey, 'base64url');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      authenticator: {
        credentialID: passkey.credentialId,
        credentialPublicKey: publicKeyBuffer,
        counter: passkey.counter,
        transports: (passkey.transports ?? []) as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedError('Passkey authentication verification failed');
    }

    // Update the counter to prevent replay attacks
    await passkeyRepository.updateCounter(
      passkey.credentialId,
      verification.authenticationInfo.newCounter,
      new Date()
    );

    loggers.auth('passkey_authenticated', passkey.userId, {
      credentialId: passkey.credentialId,
    });
    return passkey.userId;
  }
}

export const webauthnService = new WebAuthnService();
