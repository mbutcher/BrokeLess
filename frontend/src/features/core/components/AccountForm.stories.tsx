import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AccountForm } from './AccountForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { mockUser, mockAccounts } from '@features/dashboard/widgets/__fixtures__/mockData';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { Account } from '../types';

const mockAccount: Account = mockAccounts[0]!;

const archivedAccount: Account = {
  ...mockAccount,
  id: 'acct-archived',
  name: 'Old Chequing',
  isActive: false,
};

const sharedAccount: Account = {
  ...mockAccount,
  id: 'acct-shared',
  userId: 'other-user',
  name: 'Shared Savings',
};

const meta: Meta<typeof AccountForm> = {
  component: AccountForm,
  title: 'Layout/AccountForm',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => {
      const qc = useQueryClient();
      useEffect(() => {
        useAuthStore.setState({
          user: mockUser as Parameters<typeof useAuthStore.setState>[0]['user'],
          isAuthenticated: true,
        });
        qc.setQueryData(['accounts'], mockAccounts);
        // Seed a transaction count so the Delete button is enabled
        qc.setQueryData(['accounts', mockAccount.id, 'transaction-count'], 12);
        qc.setQueryData(['accounts', archivedAccount.id, 'transaction-count'], 0);
        qc.setQueryData(['accounts', sharedAccount.id, 'transaction-count'], 5);
      }, [qc]);
      return (
        <Dialog open>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
            </DialogHeader>
            <Story />
          </DialogContent>
        </Dialog>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof AccountForm>;

export const CreateAccount: Story = {
  args: {
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditChequing: Story = {
  args: {
    account: mockAccount,
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditWithShare: Story = {
  args: {
    account: mockAccount,
    onSuccess: () => {},
    onCancel: () => {},
    onShare: () => alert('Manage shares clicked'),
  },
};

export const EditCreditCard: Story = {
  args: {
    account: {
      ...mockAccount,
      id: 'acct-cc',
      name: 'Visa Infinite',
      type: 'credit_card',
      isAsset: false,
      currentBalance: -2841.5,
      color: '#f43f5e',
      annualRate: 0.1999,
    },
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditMortgage: Story = {
  args: {
    account: {
      ...mockAccount,
      id: 'acct-mortgage',
      name: 'Home Mortgage',
      type: 'mortgage',
      isAsset: false,
      currentBalance: -312000,
      color: '#8b5cf6',
      annualRate: 0.0549,
      institution: 'First National',
    },
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditArchived: Story = {
  args: {
    account: archivedAccount,
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditSharedAccount: Story = {
  args: {
    account: sharedAccount,
    onSuccess: () => {},
    onCancel: () => {},
  },
};
