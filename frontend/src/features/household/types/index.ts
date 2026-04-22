export type HouseholdRole = 'owner' | 'member';
export type AccountShareAccessLevel = 'view' | 'write';

export interface HouseholdMember {
  userId: string;
  displayName: string | null;
  email: string;
  role: HouseholdRole;
  joinedAt: string;
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
}

export interface AccountShare {
  id: string;
  accountId: string;
  sharedWithUserId: string;
  accessLevel: AccountShareAccessLevel;
  createdAt: string;
}

export interface AddMemberInput {
  email: string;
  password: string;
  displayName?: string | null;
}

export interface PutSharesInput {
  shares: Array<{ userId: string; accessLevel: AccountShareAccessLevel }>;
}

export interface OnboardingOptions {
  region: 'CA' | 'US' | 'EU';
  isFreelancer: boolean;
  hasPets: boolean;
  hasKids: boolean;
  isStudent: boolean;
}
