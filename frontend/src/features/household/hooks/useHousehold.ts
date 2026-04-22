import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/stores/authStore';
import {
  fetchRegistrationStatus,
  setupHousehold,
  fetchHousehold,
  updateHousehold,
  addMember,
  removeMember,
  fetchAccountShares,
  putAccountShares,
  patchAccountShare,
  completeOnboarding,
} from '../api/householdApi';
import type { AddMemberInput, PutSharesInput, AccountShareAccessLevel, OnboardingOptions } from '../types';

export const HOUSEHOLD_KEY = ['household'] as const;
export const REGISTRATION_STATUS_KEY = ['registration-status'] as const;

export function useRegistrationStatus() {
  return useQuery({
    queryKey: REGISTRATION_STATUS_KEY,
    queryFn: fetchRegistrationStatus,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHousehold() {
  return useQuery({
    queryKey: HOUSEHOLD_KEY,
    queryFn: fetchHousehold,
    staleTime: 60 * 1000,
  });
}

export function useSetupHousehold() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (name: string) => setupHousehold(name),
    onSuccess: (household) => {
      queryClient.setQueryData(HOUSEHOLD_KEY, household);
      // Clear householdSetupRequired from the user in the auth store
      if (user) {
        updateUser({ ...user, householdSetupRequired: false });
      }
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts: OnboardingOptions) => completeOnboarding(opts),
    onSuccess: () => {
      // Invalidate categories so any cached empty list is refreshed
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => updateHousehold(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddMemberInput) => addMember(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

export function useAccountShares(accountId: string) {
  return useQuery({
    queryKey: ['account-shares', accountId],
    queryFn: () => fetchAccountShares(accountId),
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
}

export function usePutAccountShares(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PutSharesInput) => putAccountShares(accountId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account-shares', accountId] });
    },
  });
}

export function usePatchAccountShare(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, accessLevel }: { userId: string; accessLevel: AccountShareAccessLevel }) =>
      patchAccountShare(accountId, userId, accessLevel),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account-shares', accountId] });
    },
  });
}
