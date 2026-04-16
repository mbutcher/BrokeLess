import type { Meta, StoryObj } from '@storybook/react';
import { FlexibilityBadge } from './FlexibilityBadge';

const meta: Meta<typeof FlexibilityBadge> = {
  component: FlexibilityBadge,
  title: 'Core/FlexibilityBadge',
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof FlexibilityBadge>;

export const Fixed: Story = {
  args: { flexibility: 'fixed' },
};

export const Flexible: Story = {
  args: { flexibility: 'flexible' },
};
