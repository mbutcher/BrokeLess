import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, KeyRound, X } from 'lucide-react';
import { useNetworkStore } from '@stores/networkStore';
import { hasIndexedDbKey } from '@lib/db/crypto';

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const pendingCount = useNetworkStore((s) => s.pendingCount);
  const passkeyPromptVisible = useNetworkStore((s) => s.passkeyPromptVisible);
  const hidePasskeyPrompt = useNetworkStore((s) => s.hidePasskeyPrompt);
  const [dismissed, setDismissed] = useState(false);

  const hasKey = hasIndexedDbKey();

  // Passkey prompt: shown after a failed offline write attempt, even when online
  if (passkeyPromptVisible && !hasKey) {
    return (
      <div className="sticky top-0 z-50 flex items-center gap-2 bg-orange-50 border-b border-orange-200 px-4 py-2 text-sm text-orange-800">
        <KeyRound className="h-4 w-4 shrink-0" />
        <span>
          Offline writes require a passkey.{' '}
          <Link to="/settings/security" className="underline font-medium">
            Add a passkey
          </Link>{' '}
          to save changes while offline.
        </span>
        <button
          onClick={hidePasskeyPrompt}
          className="ml-auto p-0.5 rounded hover:bg-orange-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Offline banner: shown whenever offline and not dismissed this session
  if (isOnline || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You&apos;re offline — changes will sync when you reconnect.</span>
      {pendingCount > 0 && (
        <span className="font-medium">&middot; {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending</span>
      )}
      {!hasKey && (
        <span className="ml-1">
          &middot;{' '}
          <Link to="/settings/security" className="underline font-medium">
            Add a passkey
          </Link>{' '}
          to enable offline writes.
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto p-0.5 rounded hover:bg-amber-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
