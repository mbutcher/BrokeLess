import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '../api/budgetApi';
import type { BudgetCategoryEntry, CreateBudgetInput, UpdateBudgetInput } from '../types';

export const BUDGETS_KEY = ['budgets'] as const;

export function useBudgets() {
  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: async () => {
      const res = await budgetApi.list();
      return res.data.data.budgets;
    },
  });
}

export function useBudgetProgress(id: string) {
  return useQuery({
    queryKey: [...BUDGETS_KEY, id],
    queryFn: async () => {
      const res = await budgetApi.get(id);
      return res.data.data.budget;
    },
    enabled: Boolean(id),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => budgetApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetInput }) =>
      budgetApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useUpsertBudgetCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categories }: { id: string; categories: BudgetCategoryEntry[] }) =>
      budgetApi.upsertCategories(id, categories),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...BUDGETS_KEY, variables.id] });
    },
  });
}
