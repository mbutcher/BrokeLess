import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';

interface SetupInstructionsCardProps {
  /** Collapse by default when the user is already connected */
  defaultCollapsed?: boolean;
}

export function SetupInstructionsCard({ defaultCollapsed = false }: SetupInstructionsCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const steps = [
    {
      number: 1,
      title: 'Create a SimpleFIN Bridge account',
      description: (
        <>
          Visit{' '}
          <span className="font-medium text-blue-600">simplefin.org</span> and create a free
          SimpleFIN Bridge account if you don&apos;t already have one.
        </>
      ),
    },
    {
      number: 2,
      title: 'Connect your bank accounts',
      description:
        'In SimpleFIN Bridge, go to "Connect Accounts" and add the bank accounts you want to sync with BudgetApp.',
    },
    {
      number: 3,
      title: 'Generate a setup token',
      description:
        'In SimpleFIN Bridge, go to "Access" and click "+ Add access token". Copy the setup token (a long string of letters and numbers) that appears — you can only use it once.',
    },
    {
      number: 4,
      title: 'Paste the setup token into BudgetApp',
      description:
        'Paste the setup token into the field below and click "Connect". BudgetApp will exchange it for a permanent access URL that is stored encrypted.',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left w-full"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          )}
          <CardTitle className="text-base">How to set up SimpleFIN</CardTitle>
        </button>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-4">
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.number} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center mt-0.5">
                  {step.number}
                </span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>About 2FA prompts:</strong> Your bank may send a two-factor authentication
              request each time BudgetApp syncs. Use the schedule settings below to control when
              syncs happen so you&apos;re ready to respond to those prompts.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
