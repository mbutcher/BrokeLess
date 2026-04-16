import type { Meta, StoryObj } from '@storybook/react';
import { FrequencyBadge } from './FrequencyBadge';

const meta: Meta<typeof FrequencyBadge> = {
  component: FrequencyBadge,
  title: 'Core/FrequencyBadge',
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof FrequencyBadge>;

export const Monthly: Story = {
  args: { frequency: 'monthly' },
};

export const Biweekly: Story = {
  args: { frequency: 'biweekly' },
};

export const Weekly: Story = {
  args: { frequency: 'weekly' },
};

export const SemiMonthly: Story = {
  args: { frequency: 'semi_monthly' },
};

export const TwiceMonthly: Story = {
  args: { frequency: 'twice_monthly', dayOfMonth1: 1, dayOfMonth2: 15 },
};

export const TwiceMonthlyEndOfMonth: Story = {
  args: { frequency: 'twice_monthly', dayOfMonth1: 15, dayOfMonth2: 31 },
};

export const EveryNDays: Story = {
  args: { frequency: 'every_n_days', interval: 14 },
};

export const Annually: Story = {
  args: { frequency: 'annually' },
};

export const OneTime: Story = {
  args: { frequency: 'one_time' },
};
