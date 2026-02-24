import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api/categoryApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedCategories,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { CreateCategoryInput, UpdateCategoryInput } from '../types';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      try {
        const res = await categoryApi.list();
        const categories = res.data.data.categories;
        void db.categories.bulkPut(categories);
        return categories;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return getDecryptedCategories(userId);
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        await db.categories.put({
          id: localId,
          userId,
          name: data.name,
          color: data.color ?? null,
          icon: data.icon ?? null,
          isIncome: data.isIncome ?? false,
          parentId: data.parentId ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        await queueMutation({
          method: 'POST',
          url: '/categories',
          body: JSON.stringify(data),
          entityType: 'category',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof categoryApi.create>>;
      }
      return categoryApi.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.categories.get(id);
        if (existing) {
          await db.categories.put({
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/categories/${id}`,
          body: JSON.stringify(data),
          entityType: 'category',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof categoryApi.update>>;
      }
      return categoryApi.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useArchiveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.categories.get(id);
        if (existing) {
          await db.categories.put({
            ...existing,
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'DELETE',
          url: `/categories/${id}`,
          body: null,
          entityType: 'category',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof categoryApi.archive>>;
      }
      return categoryApi.archive(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
