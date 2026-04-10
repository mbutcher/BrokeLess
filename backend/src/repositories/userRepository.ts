import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { User, CreateUserData, UpdateProfileData } from '@typings/auth.types';

// Map snake_case DB row to camelCase User interface
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row['id'] as string,
    emailEncrypted: row['email_encrypted'] as string,
    emailHash: row['email_hash'] as string,
    displayName: (row['display_name'] as string | null | undefined) ?? null,
    passwordHash: row['password_hash'] as string,
    isActive: Boolean(row['is_active']),
    emailVerified: Boolean(row['email_verified']),
    totpEnabled: Boolean(row['totp_enabled']),
    totpSecretEncrypted: (row['totp_secret_encrypted'] as string | null) ?? null,
    webauthnEnabled: Boolean(row['webauthn_enabled']),
    failedLoginAttempts: Number(row['failed_login_attempts']),
    lockedUntil: row['locked_until'] ? new Date(row['locked_until'] as string) : null,
    lastLoginAt: row['last_login_at'] ? new Date(row['last_login_at'] as string) : null,
    defaultCurrency: (row['default_currency'] as string | undefined) ?? 'CAD',
    locale: (row['locale'] as string | undefined) ?? 'en-CA',
    dateFormat: ((row['date_format'] as string | undefined) ?? 'DD/MM/YYYY') as User['dateFormat'],
    timeFormat: ((row['time_format'] as string | undefined) ?? '12h') as User['timeFormat'],
    timezone: (row['timezone'] as string | undefined) ?? 'America/Toronto',
    weekStart: ((row['week_start'] as string | undefined) ?? 'sunday') as User['weekStart'],
    theme: ((row['theme'] as string | undefined) ?? 'default') as User['theme'],
    pushEnabled: Boolean(row['push_enabled']),
    pushPreferences: (() => {
      const raw = row['push_preferences'];
      if (!raw) return null;
      try {
        return (typeof raw === 'string' ? JSON.parse(raw) : raw) as User['pushPreferences'];
      } catch {
        return null;
      }
    })(),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class UserRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string): Promise<User | null> {
    const row: unknown = await this.db('users').where({ id }).first();
    return row ? rowToUser(row as Record<string, unknown>) : null;
  }

  async findByEmailHash(emailHash: string): Promise<User | null> {
    const row: unknown = await this.db('users').where({ email_hash: emailHash }).first();
    return row ? rowToUser(row as Record<string, unknown>) : null;
  }

  async existsByEmailHash(emailHash: string): Promise<boolean> {
    const result = await this.db('users')
      .where({ email_hash: emailHash })
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0) > 0;
  }

  async create(data: CreateUserData): Promise<User> {
    const db = this.db;
    const id = randomUUID();
    await db('users').insert({
      id,
      email_encrypted: data.emailEncrypted,
      email_hash: data.emailHash,
      password_hash: data.passwordHash,
    });
    const row: unknown = await db('users').where({ id }).first();
    return rowToUser(row as Record<string, unknown>);
  }

  async updateFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null
  ): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
    });
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      failed_login_attempts: 0,
      locked_until: null,
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      last_login_at: new Date(),
    });
  }

  async updateTotpSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      totp_secret_encrypted: encryptedSecret,
    });
  }

  async enableTotp(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      totp_enabled: true,
    });
  }

  async disableTotp(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      totp_enabled: false,
      totp_secret_encrypted: null,
    });
  }

  async enableWebAuthn(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      webauthn_enabled: true,
    });
  }

  async updatePreferences(userId: string, data: UpdateProfileData): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) updates['display_name'] = data.displayName ?? null;
    if (data.defaultCurrency !== undefined) updates['default_currency'] = data.defaultCurrency;
    if (data.locale !== undefined) updates['locale'] = data.locale;
    if (data.dateFormat !== undefined) updates['date_format'] = data.dateFormat;
    if (data.timeFormat !== undefined) updates['time_format'] = data.timeFormat;
    if (data.timezone !== undefined) updates['timezone'] = data.timezone;
    if (data.weekStart !== undefined) updates['week_start'] = data.weekStart;
    if (data.theme !== undefined) updates['theme'] = data.theme;
    if (data.pushEnabled !== undefined) updates['push_enabled'] = data.pushEnabled;
    if (data.pushPreferences !== undefined)
      updates['push_preferences'] = JSON.stringify(data.pushPreferences);

    if (Object.keys(updates).length > 0) {
      await this.db('users').where({ id: userId }).update(updates);
    }
  }

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({
      password_hash: newPasswordHash,
    });
  }

  async deactivate(userId: string): Promise<void> {
    await this.db('users').where({ id: userId }).update({ is_active: false });
  }
}

export const userRepository = new UserRepository();
