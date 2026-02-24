import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@hooks/usePWAInstall';

const DISMISSED_KEY = 'pwa-install-dismissed';

export function PWAInstallBanner() {
  const { canInstall, visitCount, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  );

  if (!canInstall || visitCount < 3 || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-blue-600 text-white px-4 py-3 text-sm shadow-lg max-w-sm w-full mx-4">
      <Download className="h-4 w-4 shrink-0" />
      <span className="flex-1">Install BudgetApp for offline access</span>
      <button
        onClick={() => void promptInstall()}
        className="font-semibold underline underline-offset-2 whitespace-nowrap hover:no-underline"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-0.5 rounded hover:bg-blue-500"
        aria-label="Dismiss install prompt"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
