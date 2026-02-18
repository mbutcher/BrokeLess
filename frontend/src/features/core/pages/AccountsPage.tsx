import { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import type { Account } from '../types';

export function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const archivedAccounts = accounts.filter((a) => !a.isActive);
  const netWorth = activeAccounts.reduce(
    (sum, a) => sum + (a.isAsset ? a.currentBalance : -a.currentBalance),
    0
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Net worth: <span className={netWorth >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>${netWorth.toFixed(2)}</span>
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {(showForm || editing) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editing ? 'Edit Account' : 'New Account'}
          </h2>
          <AccountForm
            account={editing ?? undefined}
            onSuccess={() => { setShowForm(false); setEditing(null); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {activeAccounts.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No accounts yet. Add one to get started.</p>
            </div>
          )}

          <div className="space-y-3">
            {activeAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onClick={() => { setEditing(account); setShowForm(false); }}
              />
            ))}
          </div>

          {archivedAccounts.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                {archivedAccounts.length} archived account{archivedAccounts.length !== 1 ? 's' : ''}
              </summary>
              <div className="space-y-3 mt-3">
                {archivedAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
