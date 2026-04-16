import type { Meta, StoryObj } from '@storybook/react';
import { BudgetSummaryBar } from './BudgetSummaryBar';

const meta: Meta<typeof BudgetSummaryBar> = {
  component: BudgetSummaryBar,
  title: 'Core/BudgetSummaryBar',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof BudgetSummaryBar>;

export const UnderBudget: Story = {
  args: {
    totalProratedIncome: 5000,
    totalProratedExpenses: 3200,
    totalActualIncome: 5000,
    totalActualExpenses: 2105.9,
  },
};

export const OverBudget: Story = {
  args: {
    totalProratedIncome: 5000,
    totalProratedExpenses: 3200,
    totalActualIncome: 5000,
    totalActualExpenses: 3850,
  },
};

export const NegativeNet: Story = {
  args: {
    totalProratedIncome: 3000,
    totalProratedExpenses: 3200,
    totalActualIncome: 3000,
    totalActualExpenses: 3100,
  },
};

export const ZeroSpend: Story = {
  args: {
    totalProratedIncome: 5000,
    totalProratedExpenses: 3200,
    totalActualIncome: 0,
    totalActualExpenses: 0,
  },
};
