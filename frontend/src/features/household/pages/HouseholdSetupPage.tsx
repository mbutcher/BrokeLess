import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSetupHousehold, useCompleteOnboarding } from '../hooks/useHousehold';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { OnboardingOptions } from '../types';

// ─── Step 1: Household Name ───────────────────────────────────────────────────

interface NameStepProps {
  onComplete: () => void;
}

function NameStep({ onComplete }: NameStepProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const setupHousehold = useSetupHousehold();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setupHousehold.mutate(name.trim(), { onSuccess: onComplete });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('household.setup.title')}</CardTitle>
        <CardDescription>{t('household.setup.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="household-name">{t('household.settings.nameLabel')}</Label>
            <Input
              id="household-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('household.setup.namePlaceholder')}
              autoFocus
              maxLength={100}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || setupHousehold.isPending}>
            {setupHousehold.isPending ? t('common.saving') : t('household.setup.submit')}
          </Button>
          {setupHousehold.isError && (
            <p className="text-sm text-destructive text-center">
              {(setupHousehold.error as Error).message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Onboarding Questions ────────────────────────────────────────────

interface OnboardingStepProps {
  onComplete: () => void;
}

type YesNo = 'yes' | 'no';

function YesNoToggle({
  value,
  onChange,
}: {
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      {(['yes', 'no'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
            value === opt
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border hover:bg-muted',
          ].join(' ')}
        >
          {t(`household.onboarding.${opt}`)}
        </button>
      ))}
    </div>
  );
}

function OnboardingStep({ onComplete }: OnboardingStepProps) {
  const { t } = useTranslation();
  const completeOnboarding = useCompleteOnboarding();

  const [region, setRegion] = useState<'CA' | 'US' | 'EU'>('CA');
  const [isFreelancer, setIsFreelancer] = useState<YesNo>('no');
  const [hasPets, setHasPets] = useState<YesNo>('no');
  const [hasKids, setHasKids] = useState<YesNo>('no');
  const [isStudent, setIsStudent] = useState<YesNo>('no');

  function buildOpts(): OnboardingOptions {
    return {
      region,
      isFreelancer: isFreelancer === 'yes',
      hasPets: hasPets === 'yes',
      hasKids: hasKids === 'yes',
      isStudent: isStudent === 'yes',
    };
  }

  function handleSubmit() {
    completeOnboarding.mutate(buildOpts(), { onSuccess: onComplete });
  }

  function handleSkip() {
    // Default: Canadian, no conditional flags
    completeOnboarding.mutate(
      { region: 'CA', isFreelancer: false, hasPets: false, hasKids: false, isStudent: false },
      { onSuccess: onComplete }
    );
  }

  const REGIONS: Array<{ value: 'CA' | 'US' | 'EU'; label: string }> = [
    { value: 'CA', label: t('household.onboarding.regionCA') },
    { value: 'US', label: t('household.onboarding.regionUS') },
    { value: 'EU', label: t('household.onboarding.regionEU') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('household.onboarding.title')}</CardTitle>
        <CardDescription>{t('household.onboarding.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Region */}
        <div className="space-y-2">
          <Label>{t('household.onboarding.region')}</Label>
          <div className="flex gap-2">
            {REGIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRegion(value)}
                className={[
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  region === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Is Freelancer */}
        <div className="space-y-2">
          <Label>{t('household.onboarding.isFreelancer')}</Label>
          <YesNoToggle value={isFreelancer} onChange={setIsFreelancer} />
        </div>

        {/* Has Pets */}
        <div className="space-y-2">
          <Label>{t('household.onboarding.hasPets')}</Label>
          <YesNoToggle value={hasPets} onChange={setHasPets} />
        </div>

        {/* Has Kids */}
        <div className="space-y-2">
          <Label>{t('household.onboarding.hasKids')}</Label>
          <YesNoToggle value={hasKids} onChange={setHasKids} />
        </div>

        {/* Is Student */}
        <div className="space-y-2">
          <Label>{t('household.onboarding.isStudent')}</Label>
          <YesNoToggle value={isStudent} onChange={setIsStudent} />
        </div>

        {completeOnboarding.isError && (
          <p className="text-sm text-destructive text-center">
            {(completeOnboarding.error as Error).message}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full"
            isLoading={completeOnboarding.isPending}
            onClick={handleSubmit}
          >
            {t('household.onboarding.submit')}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={completeOnboarding.isPending}
            onClick={handleSkip}
          >
            {t('household.onboarding.skip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HouseholdSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'name' | 'onboarding'>('name');

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">BudgetApp</h1>
          <div className="flex justify-center gap-2 mt-3">
            {(['name', 'onboarding'] as const).map((s) => (
              <div
                key={s}
                className={[
                  'h-1.5 rounded-full transition-all',
                  step === s ? 'w-8 bg-primary' : 'w-4 bg-muted-foreground/30',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {step === 'name' ? (
          <NameStep onComplete={() => setStep('onboarding')} />
        ) : (
          <OnboardingStep onComplete={() => void navigate('/dashboard')} />
        )}
      </div>
    </div>
  );
}
