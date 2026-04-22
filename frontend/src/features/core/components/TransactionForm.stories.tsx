import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { mockAccounts, mockTransactionList } from '@features/dashboard/widgets/__fixtures__/mockData';
import type { Category } from '../types';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    householdId: 'hh-1',
    name: 'Groceries',
    color: '#22c55e',
    icon: null,
    isIncome: false,
    parentId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    householdId: 'hh-1',
    name: 'Coffee & Cafés',
    color: '#f97316',
    icon: null,
    isIncome: false,
    parentId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-income',
    householdId: 'hh-1',
    name: 'Salary & Wages',
    color: '#3b82f6',
    icon: null,
    isIncome: true,
    parentId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const meta: Meta<typeof TransactionForm> = {
  component: TransactionForm,
  title: 'Layout/TransactionForm',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => {
      const qc = useQueryClient();
      useEffect(() => {
        qc.setQueryData(['accounts'], mockAccounts);
        qc.setQueryData(['categories'], mockCategories);
        qc.setQueryData(['transactions', 'tags'], []);
      }, [qc]);
      return (
        <Dialog open>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction</DialogTitle>
            </DialogHeader>
            <Story />
          </DialogContent>
        </Dialog>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof TransactionForm>;

export const AddTransaction: Story = {
  args: {
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const AddWithDefaultAccount: Story = {
  args: {
    defaultAccountId: 'acct-1',
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditExpense: Story = {
  args: {
    transaction: mockTransactionList[0],
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditIncome: Story = {
  args: {
    transaction: { ...mockTransactionList[2]!, amount: 2500 },
    onSuccess: () => {},
    onCancel: () => {},
  },
};

export const EditWithTags: Story = {
  args: {
    transaction: { ...mockTransactionList[0]!, tags: ['vacation', 'dining'] },
    onSuccess: () => {},
    onCancel: () => {},
  },
};
