import type { Meta, StoryObj } from '@storybook/react';
import { WidgetShell } from './WidgetShell';
import { Button } from '@components/ui/button';

const meta: Meta<typeof WidgetShell> = {
  component: WidgetShell,
  title: 'Dashboard/WidgetShell',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-64 w-96 border border-border rounded-xl bg-card shadow-sm overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof WidgetShell>;

export const Default: Story = {
  args: {
    id: 'net-worth',
    title: 'Net Worth',
    children: <p className="text-sm text-muted-foreground">Widget content goes here.</p>,
  },
};

export const WithActions: Story = {
  args: {
    id: 'account-balances',
    title: 'Account Balances',
    actions: <Button size="sm" variant="outline">Settings</Button>,
    children: <p className="text-sm text-muted-foreground">Widget content goes here.</p>,
  },
};

export const Scrollable: Story = {
  args: {
    id: 'recent-transactions',
    title: 'Recent Transactions',
    scrollable: true,
    children: (
      <ul className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i} className="text-sm text-muted-foreground py-1 border-b border-border">
            Transaction {i + 1}
          </li>
        ))}
      </ul>
    ),
  },
};
