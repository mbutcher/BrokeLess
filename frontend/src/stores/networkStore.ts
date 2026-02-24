import { create } from 'zustand';
import type { ConflictRecord } from '@lib/db/syncEngine';

interface NetworkState {
  /** Mirrors navigator.onLine — updated by online/offline event listeners. */
  isOnline: boolean;
  /** Number of mutations currently queued in Dexie pendingMutations. */
  pendingCount: number;
  /** Conflicts auto-resolved during the last push flush. Cleared on dismiss. */
  conflicts: ConflictRecord[];
  /** True while a sync (push + pull) is in progress. */
  isSyncing: boolean;
  /**
   * True after the user tries to write offline without a PRF-capable passkey.
   * Drives a targeted "add a passkey" callout in the offline banner.
   * Cleared when the user dismisses or comes back online.
   */
  passkeyPromptVisible: boolean;

  setOnline: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  addConflicts: (conflicts: ConflictRecord[]) => void;
  clearConflicts: () => void;
  setSyncing: (v: boolean) => void;
  showPasskeyPrompt: () => void;
  hidePasskeyPrompt: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  conflicts: [],
  isSyncing: false,
  passkeyPromptVisible: false,

  setOnline: (v) => set({ isOnline: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
  addConflicts: (conflicts) => set((s) => ({ conflicts: [...s.conflicts, ...conflicts] })),
  clearConflicts: () => set({ conflicts: [] }),
  setSyncing: (v) => set({ isSyncing: v }),
  showPasskeyPrompt: () => set({ passkeyPromptVisible: true }),
  hidePasskeyPrompt: () => set({ passkeyPromptVisible: false }),
}));
