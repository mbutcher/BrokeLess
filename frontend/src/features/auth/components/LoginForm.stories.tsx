import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  component: LoginForm,
  title: 'Auth/LoginForm',
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-96 p-8 border border-border rounded-xl bg-card shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Sign in</h1>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};
