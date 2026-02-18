import { useLinkTransaction } from '../hooks/useTransactions';
import { getApiErrorMessage } from '@lib/api/errors';
import type { TransferCandidate } from '../types';

interface TransferLinkingDialogProps {
  transactionId: string;
  candidates: TransferCandidate[];
  onDismiss: () => void;
}

export function TransferLinkingDialog({
  transactionId,
  candidates,
  onDismiss,
}: TransferLinkingDialogProps) {
  const linkTx = useLinkTransaction();

  async function handleLink(targetId: string) {
    await linkTx.mutateAsync({ id: transactionId, targetTransactionId: targetId });
    onDismiss();
  }

  if (candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Transfer detected</h2>
        <p className="text-sm text-gray-500 mb-4">
          We found {candidates.length === 1 ? 'a transaction' : 'transactions'} that might be the other side of a transfer. Link them to keep your budgets accurate.
        </p>

        {linkTx.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            {getApiErrorMessage(linkTx.error)}
          </div>
        )}

        <div className="space-y-3 mb-4">
          {candidates.map(({ transaction: tx, account }) => (
            <div key={tx.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{account.name}</p>
                <p className="text-xs text-gray-500">
                  {tx.date.split('T')[0]} · {tx.payee ?? tx.description ?? 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => handleLink(tx.id)}
                  disabled={linkTx.isPending}
                  className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Link
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="w-full border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Skip — not a transfer
        </button>
      </div>
    </div>
  );
}
