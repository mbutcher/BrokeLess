import type { Meta, StoryObj, Decorator } from '@storybook/react';
import { AccountCard } from './AccountCard';
import { useAuthStore } from '@features/auth/stores/authStore';
import { mockUser } from '@features/dashboard/widgets/__fixtures__/mockData';
import type { Account } from '../types';

const withAuthStore: Decorator = (Story) => {
  useAuthStore.setState({ user: mockUser as Parameters<typeof useAuthStore.setState>[0]['user'] });
  return <Story />;
};

const meta: Meta<typeof AccountCard> = {
  component: AccountCard,
  title: 'Layout/AccountCard',
  decorators: [withAuthStore],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof AccountCard>;

const base: Account = {
  id: 'acct-1',
  userId: 'u1',
  name: '',
  type: 'checking',
  isAsset: true,
  startingBalance: 0,
  currentBalance: 0,
  currency: 'CAD',
  color: '#3b82f6',
  institution: 'TD Bank',
  annualRate: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
};

export const AssetAccount: Story = {
  args: {
    account: { ...base, name: 'TD Chequing', type: 'checking', currentBalance: 3421.5 },
  },
};

export const Clickable: Story = {
  args: {
    account: { ...base, name: 'TD Chequing', type: 'checking', currentBalance: 3421.5 },
    onClick: () => alert('Card clicked'),
  },
};

export const SavingsAccount: Story = {
  args: {
    account: {
      ...base,
      id: 'acct-2',
      name: 'TFSA Savings',
      type: 'savings',
      currentBalance: 12500,
      color: '#22c55e',
      annualRate: 0.035,
    },
  },
};

export const CreditCard: Story = {
  args: {
    account: {
      ...base,
      id: 'acct-3',
      name: 'Visa Credit Card',
      type: 'credit_card',
      isAsset: false,
      currentBalance: -1842.3,
      color: '#f43f5e',
      annualRate: 0.1999,
    },
  },
};

export const NegativeBalance: Story = {
  args: {
    account: {
      ...base,
      id: 'acct-neg',
      name: 'Overdrawn Chequing',
      type: 'checking',
      currentBalance: -124.5,
      color: '#ef4444',
    },
  },
};

export const Archived: Story = {
  args: {
    account: {
      ...base,
      id: 'acct-archived',
      name: 'Old Savings',
      type: 'savings',
      currentBalance: 0,
      isActive: false,
      color: '#6b7280',
    },
  },
};

export const NoColor: Story = {
  args: {
    account: { ...base, name: 'No Colour Account', color: null },
  },
};
