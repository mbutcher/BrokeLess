import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { TransactionListItem } from './TransactionListItem';
import { mockAccounts, mockTransactionList } from '@features/dashboard/widgets/__fixtures__/mockData';

const account = mockAccounts[0]!;

const meta: Meta<typeof TransactionListItem> = {
  component: TransactionListItem,
  title: 'Layout/TransactionListItem',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => {
      const qc = useQueryClient();
      useEffect(() => {
        qc.setQueryData(['accounts'], mockAccounts);
      }, [qc]);
      return (
        <div className="max-w-2xl space-y-1">
          <Story />
        </div>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof TransactionListItem>;

const tx = mockTransactionList[0]!;

export const Expense: Story = {
  args: {
    transaction: tx,
    account,
    onEdit: () => {},
  },
};

export const Income: Story = {
  args: {
    transaction: { ...mockTransactionList[2]!, amount: 2500 },
    account,
    onEdit: () => {},
  },
};

export const Transfer: Story = {
  args: {
    transaction: { ...tx, id: 'tx-transfer', isTransfer: true, payee: 'Credit Card Payment', amount: -1200 },
    account,
    onEdit: () => {},
  },
};

export const WithTags: Story = {
  args: {
    transaction: { ...tx, tags: ['vacation', 'dining', 'client'], isCleared: false },
    account,
    onEdit: () => {},
  },
};

export const ManyTags: Story = {
  args: {
    transaction: { ...tx, tags: ['vacation', 'dining', 'client', 'q1', 'reimbursable'] },
    account,
    onEdit: () => {},
  },
};

export const Uncleared: Story = {
  args: {
    transaction: { ...tx, isCleared: false },
    account,
    onEdit: () => {},
  },
};

export const NoBudgetLine: Story = {
  args: {
    transaction: { ...tx, budgetLineId: null },
    account,
    onEdit: () => {},
  },
};

export const ReadOnly: Story = {
  args: {
    transaction: tx,
    account,
  },
};
