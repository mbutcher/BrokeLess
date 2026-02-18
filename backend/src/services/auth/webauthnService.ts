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
import { createClient } from 'redis';
import { env } from '@config/env';
import { loggers } from '@utils/logger';
import { UnauthorizedError, ConflictError } from '@middleware/errorHandler';
import { userRepository } from '@repositories/userRepository';
import { passkeyRepository } from '@repositories/passkeyRepository';
import type { Passkey } from '@types/auth.types';

const CHALLENGE_TTL_SECONDS = 300; // 5 minutes
const CHALLENGE_KEY_PREFIX = 'webauthn:challenge:';

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedis(): Promise<ReturnType<typeof createClient>> {
  if (!redisClient) {
    redisClient = createClient({
      socket: { host: env.redis.host, port: env.redis.port },
      password: env.redis.password,
    });
    await redisClient.connect();
  }
  return redisClient;
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
   * The challenge is stored in Redis with a 5-min TTL.
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

    const redis = await getRedis();
    const key = `${CHALLENGE_KEY_PREFIX}reg:${userId}`;
    await redis.setEx(key, CHALLENGE_TTL_SECONDS, options.challenge);

    return options;
  }

  /**
   * Verify a registration response and persist the new passkey.
   * The Redis challenge is deleted immediately after verification.
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string
  ): Promise<Passkey> {
    const redis = await getRedis();
    const key = `${CHALLENGE_KEY_PREFIX}reg:${userId}`;
    const expectedChallenge = await redis.get(key);

    // Delete the challenge immediately regardless of outcome
    await redis.del(key);

    if (!expectedChallenge) {
      throw new UnauthorizedError('Registration session expired. Please try again.');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedError('Passkey registration verification failed');
    }

    const { credential, aaguid } = verification.registrationInfo;

    // Check if this credential is already registered (to another account)
    if (await passkeyRepository.existsByCredentialId(credential.id)) {
      throw new ConflictError('This passkey is already registered');
    }

    const passkey = await passkeyRepository.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
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
   * The challenge is stored in Redis keyed by a random token.
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

    // Store challenge with a random token as key (userId may not be known yet)
    const challengeToken = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
    const redis = await getRedis();
    const key = `${CHALLENGE_KEY_PREFIX}auth:${challengeToken}`;
    await redis.setEx(key, CHALLENGE_TTL_SECONDS, options.challenge);

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
    const redis = await getRedis();
    const key = `${CHALLENGE_KEY_PREFIX}auth:${challengeToken}`;
    const expectedChallenge = await redis.get(key);

    // Delete challenge immediately regardless of outcome
    await redis.del(key);

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
      credential: {
        id: passkey.credentialId,
        publicKey: publicKeyBuffer,
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
