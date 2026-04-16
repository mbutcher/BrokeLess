import type { Meta, StoryObj } from '@storybook/react';
import { CategoryBadge } from './CategoryBadge';
import type { Category } from '../types';

const mockCategory: Category = {
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
};

const meta: Meta<typeof CategoryBadge> = {
  component: CategoryBadge,
  title: 'Core/CategoryBadge',
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CategoryBadge>;

export const Default: Story = {
  args: { category: mockCategory },
};

export const Income: Story = {
  args: {
    category: { ...mockCategory, id: 'cat-income', name: 'Salary & Wages', color: '#3b82f6', isIncome: true },
  },
};

export const NoColor: Story = {
  args: {
    category: { ...mockCategory, name: 'Uncategorized', color: null },
  },
};

export const Uncategorized: Story = {
  args: { category: null },
};
