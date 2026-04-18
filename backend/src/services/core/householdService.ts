import { logger } from '@utils/logger';
import { AppError, ConflictError } from '@middleware/errorHandler';
import { encryptionService } from '@services/encryption/encryptionService';
import { passwordService } from '@services/auth/passwordService';
import { userRepository } from '@repositories/userRepository';
import { householdRepository } from '@repositories/householdRepository';
import { householdMemberRepository } from '@repositories/householdMemberRepository';
import { accountShareRepository } from '@repositories/accountShareRepository';
import { categoryService } from './categoryService';
import type { Household, HouseholdWithMembers, CreateMemberData } from '@typings/core.types';
import type { PublicUser } from '@typings/auth.types';

class HouseholdService {
  /**
   * Create a new household and add the requesting user as owner.
   * Seeds default categories for the household (non-fatal).
   * Throws ConflictError if the user already belongs to a household.
   */
  async setup(userId: string, name: string): Promise<HouseholdWithMembers> {
    const existing = await householdMemberRepository.getHouseholdId(userId);
    if (existing) {
      throw new ConflictError('User already belongs to a household');
    }

    const household = await householdRepository.create({ name, ownerUserId: userId });
    await householdMemberRepository.addMember(household.id, userId, 'owner');

    // Seed default categories for the new household (non-fatal if this fails)
    categoryService.seedDefaultsForHousehold(household.id).catch((err: unknown) => {
      logger.error('Failed to seed default categories for household', {
        householdId: household.id,
        err,
      });
    });

    const members = await householdMemberRepository.findAllByHouseholdId(household.id);
    return { ...household, members };
  }

  /** Fetch the household and its member list for a user. */
  async getHousehold(userId: string): Promise<HouseholdWithMembers> {
    const household = await householdRepository.findByUserId(userId);
    if (!household) {
      throw new AppError('Household not found', 404);
    }
    const members = await householdMemberRepository.findAllByHouseholdId(household.id);
    return { ...household, members };
  }

  /** Rename the household. */
  async updateHousehold(householdId: string, name: string): Promise<Household> {
    return householdRepository.update(householdId, name);
  }

  /**
   * Create a new user account and add them to the household as a member.
   * Returns the new user as PublicUser.
   */
  async addMember(ownerUserId: string, data: CreateMemberData): Promise<PublicUser> {
    const member = await householdMemberRepository.findByUserId(ownerUserId);
    if (!member) throw new AppError('Household not found', 404);
    if (member.role !== 'owner') throw new AppError('Owner role required', 403);

    const normalizedEmail = data.email.toLowerCase().trim();
    const emailHash = encryptionService.hash(normalizedEmail);

    const alreadyExists = await userRepository.existsByEmailHash(emailHash);
    if (alreadyExists) {
      throw new ConflictError('An account with that email already exists');
    }

    const { errors } = passwordService.validate(data.password);
    if (errors.length > 0) {
      throw new ConflictError(errors.join('. '));
    }

    const emailEncrypted = encryptionService.encrypt(normalizedEmail);
    const passwordHash = await passwordService.hash(data.password);

    const newUser = await userRepository.create({ username: null, emailEncrypted, emailHash, passwordHash });

    // Set displayName if provided
    if (data.displayName) {
      await userRepository.updatePreferences(newUser.id, { displayName: data.displayName });
    }

    await householdMemberRepository.addMember(member.householdId, newUser.id, 'member');

    logger.info('Household member added', {
      householdId: member.householdId,
      newUserId: newUser.id,
    });

    return {
      id: newUser.id,
      username: null,
      email: normalizedEmail,
      displayName: data.displayName ?? null,
      totpEnabled: false,
      webauthnEnabled: false,
      emailVerified: false,
      defaultCurrency: newUser.defaultCurrency,
      locale: newUser.locale,
      dateFormat: newUser.dateFormat,
      timeFormat: newUser.timeFormat,
      timezone: newUser.timezone,
      weekStart: newUser.weekStart,
      theme: newUser.theme,
      pushEnabled: false,
      pushPreferences: null,
      householdSetupRequired: false,
      createdAt: newUser.createdAt,
    };
  }

  /**
   * Remove a member from the household, clean up their account shares,
   * and deactivate their account.
   */
  async removeMember(ownerUserId: string, targetUserId: string): Promise<void> {
    const ownerMember = await householdMemberRepository.findByUserId(ownerUserId);
    if (!ownerMember) throw new AppError('Household not found', 404);
    if (ownerMember.role !== 'owner') throw new AppError('Owner role required', 403);
    if (ownerUserId === targetUserId) {
      throw new AppError('Cannot remove the owner from the household', 400);
    }

    const targetMember = await householdMemberRepository.findByUserId(targetUserId);
    if (!targetMember || targetMember.householdId !== ownerMember.householdId) {
      throw new AppError('Member not found in this household', 404);
    }

    // Clean up account shares for the removed user
    await accountShareRepository.deleteByUser(targetUserId);
    // Remove from household
    await householdMemberRepository.removeMember(ownerMember.householdId, targetUserId);
    // Deactivate account
    await userRepository.deactivate(targetUserId);

    logger.info('Household member removed', {
      householdId: ownerMember.householdId,
      removedUserId: targetUserId,
    });
  }

  /** Returns whether registration is open (no household exists yet). */
  async getRegistrationStatus(): Promise<{ registrationOpen: boolean }> {
    const count = await householdRepository.count();
    return { registrationOpen: count === 0 };
  }
}

export const householdService = new HouseholdService();
