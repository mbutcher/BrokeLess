import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useNetworkStore } from '@stores/networkStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';

export function SyncNotification() {
  const conflicts = useNetworkStore((s) => s.conflicts);
  const clearConflicts = useNetworkStore((s) => s.clearConflicts);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (conflicts.length === 0) return null;

  return (
    <>
      {/* Toast-style notification */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-white border border-gray-200 shadow-lg px-4 py-3 text-sm max-w-sm">
        <RefreshCw className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-gray-700">
          {conflicts.length} change{conflicts.length !== 1 ? 's' : ''} reconciled after reconnecting.
        </span>
        <button
          onClick={() => setDetailsOpen(true)}
          className="text-blue-600 hover:underline font-medium whitespace-nowrap"
        >
          View details
        </button>
        <button
          onClick={clearConflicts}
          className="ml-1 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reconciled changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            These mutations could not be applied after reconnecting. Server values took
            precedence — your local changes for the items below were not saved to the server.
          </p>
          <ul className="space-y-2 max-h-72 overflow-y-auto text-sm">
            {conflicts.map((c, i) => (
              <li key={i} className="flex gap-2 border rounded-md p-2 bg-muted/40">
                <span className="font-medium capitalize text-gray-700 shrink-0">{c.entityType}</span>
                <span className="text-gray-500">{c.details}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => { setDetailsOpen(false); clearConflicts(); }}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Dismiss all
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
