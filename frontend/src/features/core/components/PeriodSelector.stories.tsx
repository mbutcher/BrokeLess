import type { Meta, StoryObj } from '@storybook/react';
import { PeriodSelector } from './PeriodSelector';
import type { PayPeriod } from '../types';

const mockPayPeriod: PayPeriod = {
  start: '2026-02-01',
  end: '2026-02-28',
  budgetLineId: 'bl-income',
  frequency: 'monthly',
};

const meta: Meta<typeof PeriodSelector> = {
  component: PeriodSelector,
  title: 'Core/PeriodSelector',
  parameters: { layout: 'padded' },
  args: {
    onPeriodChange: () => {},
    onViewModeChange: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof PeriodSelector>;

export const Monthly: Story = {
  args: {
    start: '2026-02-01',
    end: '2026-02-28',
    viewMode: 'monthly',
    payPeriod: mockPayPeriod,
  },
};

export const Weekly: Story = {
  args: {
    start: '2026-02-17',
    end: '2026-02-23',
    viewMode: 'weekly',
    payPeriod: mockPayPeriod,
  },
};

export const PayPeriodMode: Story = {
  args: {
    start: '2026-02-01',
    end: '2026-02-28',
    viewMode: 'pay-period',
    payPeriod: mockPayPeriod,
  },
};

export const NoPayPeriod: Story = {
  args: {
    start: '2026-02-01',
    end: '2026-02-28',
    viewMode: 'monthly',
    payPeriod: null,
  },
};
