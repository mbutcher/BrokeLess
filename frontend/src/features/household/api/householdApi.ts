import { apiClient } from '@lib/api/client';
import type {
  HouseholdWithMembers,
  Household,
  AccountShare,
  AddMemberInput,
  PutSharesInput,
  AccountShareAccessLevel,
} from '../types';
import type { User } from '@features/auth/types';

interface HouseholdResponse {
  status: 'success';
  data: { household: HouseholdWithMembers };
}

interface UpdateHouseholdResponse {
  status: 'success';
  data: { household: Household };
}

interface AddMemberResponse {
  status: 'success';
  data: { user: User };
}

interface SharesResponse {
  status: 'success';
  data: { shares: AccountShare[] };
}

interface RegistrationStatusResponse {
  status: 'success';
  data: { registrationOpen: boolean };
}

export async function fetchRegistrationStatus(): Promise<{ registrationOpen: boolean }> {
  const res = await apiClient.get<RegistrationStatusResponse>('/auth/registration-status');
  return res.data.data;
}

export async function setupHousehold(name: string): Promise<HouseholdWithMembers> {
  const res = await apiClient.post<HouseholdResponse>('/household/setup', { name });
  return res.data.data.household;
}

export interface OnboardingOptions {
  region: 'CA' | 'US' | 'EU';
  isFreelancer: boolean;
  hasPets: boolean;
  hasKids: boolean;
  isStudent: boolean;
}

export async function completeOnboarding(opts: OnboardingOptions): Promise<void> {
  await apiClient.post('/household/onboarding', opts);
}

export async function fetchHousehold(): Promise<HouseholdWithMembers> {
  const res = await apiClient.get<HouseholdResponse>('/household');
  return res.data.data.household;
}

export async function updateHousehold(name: string): Promise<Household> {
  const res = await apiClient.patch<UpdateHouseholdResponse>('/household', { name });
  return res.data.data.household;
}

export async function addMember(data: AddMemberInput): Promise<User> {
  const res = await apiClient.post<AddMemberResponse>('/household/members', data);
  return res.data.data.user;
}

export async function removeMember(userId: string): Promise<void> {
  await apiClient.delete(`/household/members/${userId}`);
}

export async function fetchAccountShares(accountId: string): Promise<AccountShare[]> {
  const res = await apiClient.get<SharesResponse>(`/accounts/${accountId}/shares`);
  return res.data.data.shares;
}

export async function putAccountShares(
  accountId: string,
  input: PutSharesInput
): Promise<AccountShare[]> {
  const res = await apiClient.put<SharesResponse>(`/accounts/${accountId}/shares`, input);
  return res.data.data.shares;
}

export async function patchAccountShare(
  accountId: string,
  userId: string,
  accessLevel: AccountShareAccessLevel
): Promise<void> {
  await apiClient.patch(`/accounts/${accountId}/shares/${userId}`, { accessLevel });
}
