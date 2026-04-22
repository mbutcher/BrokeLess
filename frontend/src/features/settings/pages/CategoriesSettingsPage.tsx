import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Alert, AlertDescription } from '@components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useArchiveCategory,
  useCategoryUsage,
  useReassignAndArchiveCategory,
} from '@features/core/hooks/useCategories';
import {
  useCategorizationRules,
  useDeleteCategorizationRule,
} from '@features/core/hooks/useTransactions';
import { useBudgetLines } from '@features/core/hooks/useBudgetLines';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@features/core/types';
import { getApiErrorMessage } from '@lib/api/errors';

// ─── Icon picker ─────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  'briefcase', 'laptop', 'trending-up', 'home', 'house', 'shopping-cart',
  'utensils', 'car', 'zap', 'heart-pulse', 'shield', 'film', 'shirt',
  'sparkles', 'book-open', 'repeat', 'plane', 'gift', 'more-horizontal',
  'plus-circle', 'wallet', 'coffee', 'music', 'gamepad-2', 'dumbbell',
  'baby', 'dog', 'tree-pine', 'wrench', 'smartphone', 'wifi', 'bus',
  'train', 'bicycle', 'pizza', 'wine', 'stethoscope', 'pill', 'graduation-cap',
  'building', 'store', 'scissors', 'paint-brush', 'camera', 'headphones',
] as const;

// ─── Color picker ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
  '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f',
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
  '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
  '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843',
  '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
  '#0891b2', '#0e7490', '#155e75', '#164e63', '#0c4a6e',
  '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827',
];

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  editTarget?: Category;
  parentCategory?: Category;
}

function CategoryFormDialog({ open, onClose, editTarget, parentCategory }: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEdit = !!editTarget;
  const [name, setName] = useState(editTarget?.name ?? '');
  const [color, setColor] = useState(editTarget?.color ?? parentCategory?.color ?? '#6b7280');
  const [icon, setIcon] = useState(editTarget?.icon ?? 'more-horizontal');
  const [isIncome, setIsIncome] = useState(editTarget?.isIncome ?? parentCategory?.isIncome ?? false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) { setError(t('categories.nameRequired')); return; }
    setError('');
    try {
      if (isEdit) {
        const data: UpdateCategoryInput = { name: name.trim(), color, icon };
        await updateCategory.mutateAsync({ id: editTarget.id, data });
      } else {
        const data: CreateCategoryInput = {
          name: name.trim(),
          color,
          icon,
          isIncome,
          parentId: parentCategory?.id ?? undefined,
        };
        await createCategory.mutateAsync(data);
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('categories.editCategory')
              : parentCategory
              ? t('categories.addSubcategory')
              : t('categories.addCategory')}
          </DialogTitle>
          {parentCategory && (
            <DialogDescription>
              {t('categories.subcategoryOf', { parent: parentCategory.name })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>{t('categories.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('categories.namePlaceholder')}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
            />
          </div>

          {!isEdit && !parentCategory && (
            <div className="space-y-1">
              <Label>{t('categories.type')}</Label>
              <div className="flex gap-3">
                {(['expense', 'income'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isIncome === (type === 'income')}
                      onChange={() => setIsIncome(type === 'income')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{t(`categories.${type}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('categories.color')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('categories.icon')}</Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={[
                    'w-8 h-8 rounded text-xs flex items-center justify-center border transition-colors',
                    icon === ic
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted hover:bg-muted/80 border-border text-muted-foreground',
                  ].join(' ')}
                  title={ic}
                >
                  {ic.slice(0, 2)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('categories.selectedIcon', { icon })}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button isLoading={isPending} onClick={() => void handleSubmit()}>
              {isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Archive Dialog ───────────────────────────────────────────────────────────

interface ArchiveDialogProps {
  category: Category;
  allCategories: Category[];
  onClose: () => void;
}

function ArchiveDialog({ category, allCategories, onClose }: ArchiveDialogProps) {
  const { t } = useTranslation();
  const { data: usage, isLoading } = useCategoryUsage(category.id);
  const archiveCategory = useArchiveCategory();
  const reassignAndArchive = useReassignAndArchiveCategory();
  const [targetId, setTargetId] = useState<string>('');
  const [error, setError] = useState('');

  const candidates = allCategories.filter(
    (c) => c.id !== category.id && c.isActive && c.isIncome === category.isIncome && !c.parentId
  );

  const hasBudgetLines = (usage?.budgetLineCount ?? 0) > 0;
  const hasTransactions = (usage?.transactionCount ?? 0) > 0;

  async function handleArchive(withReassign: boolean) {
    setError('');
    try {
      if (withReassign) {
        await reassignAndArchive.mutateAsync({
          id: category.id,
          targetCategoryId: targetId || null,
        });
      } else {
        await archiveCategory.mutateAsync(category.id);
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const isPending = archiveCategory.isPending || reassignAndArchive.isPending;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('categories.archiveTitle', { name: category.name })}</DialogTitle>
          <DialogDescription>{t('categories.archiveDescription')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Usage summary */}
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1 text-sm">
              <p>{t('categories.usageTransactions', { count: usage?.transactionCount ?? 0 })}</p>
              <p>{t('categories.usageBudgetLines', { count: usage?.budgetLineCount ?? 0 })}</p>
            </div>

            {hasBudgetLines && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  {t('categories.budgetLineWarning')}
                </AlertDescription>
              </Alert>
            )}

            {hasTransactions && (
              <div className="space-y-2">
                <Label>{t('categories.reassignTransactions')}</Label>
                <select
                  className="w-full border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">{t('categories.reassignNone')}</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{t('categories.reassignHint')}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
              <Button
                variant="destructive"
                isLoading={isPending}
                onClick={() => void handleArchive(hasTransactions)}
              >
                {hasTransactions && targetId
                  ? t('categories.reassignAndArchive')
                  : t('categories.archiveOnly')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: Category;
  subcategories: Category[];
  allCategories: Category[];
  onEdit: (cat: Category) => void;
  onArchive: (cat: Category) => void;
  onAddSub: (parent: Category) => void;
}

function CategoryRow({ category, subcategories, onEdit, onArchive, onAddSub }: CategoryRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground shrink-0 w-4"
        >
          {subcategories.length > 0
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
            : <span className="w-3.5" />}
        </button>

        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.color ?? '#6b7280' }}
        />

        <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>

        {subcategories.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('categories.subcategoryCount', { count: subcategories.length })}
          </span>
        )}

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddSub(category)}
            className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
            title={t('categories.addSubcategory')}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(category)}
            className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
            title={t('common.edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onArchive(category)}
            className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-muted"
            title={t('categories.archive')}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && subcategories.length > 0 && (
        <div className="ml-8 space-y-1 border-l border-border pl-3">
          {subcategories.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 group">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sub.color ?? '#6b7280' }}
              />
              <span className="flex-1 text-sm text-foreground">{sub.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(sub)}
                  className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                  title={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onArchive(sub)}
                  className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-muted"
                  title={t('categories.archive')}
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CategoriesSettingsPage() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useCategories();
  const { data: rules = [] } = useCategorizationRules();
  const deleteRule = useDeleteCategorizationRule();
  const { data: budgetLinesData } = useBudgetLines();

  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    editTarget?: Category;
    parentCategory?: Category;
  }>({ open: false });
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);

  const budgetLines = budgetLinesData ?? [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const budgetLineMap = new Map(budgetLines.map((bl) => [bl.id, bl]));

  const active = categories.filter((c) => c.isActive);
  const archived = categories.filter((c) => !c.isActive);

  const topLevel = active.filter((c) => !c.parentId);
  const income = topLevel.filter((c) => c.isIncome);
  const expense = topLevel.filter((c) => !c.isIncome);

  function subcategoriesOf(parentId: string) {
    return active.filter((c) => c.parentId === parentId);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('categories.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('categories.subtitle')}</p>
        </div>
        <Button onClick={() => setFormDialog({ open: true })}>
          <Plus className="h-4 w-4 mr-2" />
          {t('categories.addCategory')}
        </Button>
      </div>

      {/* Income */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-green-600">{t('categories.incomeCategories')}</CardTitle>
          <CardDescription>{t('categories.incomeCategoriesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {income.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">{t('categories.none')}</p>
          )}
          {income.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              subcategories={subcategoriesOf(cat.id)}
              allCategories={active}
              onEdit={(c) => setFormDialog({ open: true, editTarget: c })}
              onArchive={setArchiveTarget}
              onAddSub={(parent) => setFormDialog({ open: true, parentCategory: parent })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Expense */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">{t('categories.expenseCategories')}</CardTitle>
          <CardDescription>{t('categories.expenseCategoriesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {expense.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">{t('categories.none')}</p>
          )}
          {expense.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              subcategories={subcategoriesOf(cat.id)}
              allCategories={active}
              onEdit={(c) => setFormDialog({ open: true, editTarget: c })}
              onArchive={setArchiveTarget}
              onAddSub={(parent) => setFormDialog({ open: true, parentCategory: parent })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Archived */}
      {archived.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">{t('categories.archived')}</CardTitle>
            <CardDescription>{t('categories.archivedDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {archived.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2 opacity-50">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? '#6b7280' }}
                />
                <span className="flex-1 text-sm line-through text-muted-foreground">{cat.name}</span>
                {cat.parentId && (
                  <span className="text-xs text-muted-foreground">{t('categories.subcategory')}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Auto-Categorize Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('categorizationRules.title')}</CardTitle>
          <CardDescription>{t('categorizationRules.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-2">{t('categorizationRules.none')}</p>
          ) : (
            <div className="space-y-1">
              {rules.map((rule) => {
                const category = rule.categoryId ? categoryMap.get(rule.categoryId) : null;
                const budgetLine = rule.budgetLineId ? budgetLineMap.get(rule.budgetLineId) : null;
                const appliesToParts: string[] = [];
                if (category) appliesToParts.push(category.name);
                if (budgetLine) appliesToParts.push(budgetLine.name);
                const appliesTo = appliesToParts.join(' / ') || t('categorizationRules.noCategory');

                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rule.payee}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('categorizationRules.appliesTo')}: {appliesTo}
                      </p>
                    </div>
                    <button
                      onClick={() => void deleteRule.mutate(rule.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-muted"
                      title={t('categorizationRules.deleteRule')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {formDialog.open && (
        <CategoryFormDialog
          open
          editTarget={formDialog.editTarget}
          parentCategory={formDialog.parentCategory}
          onClose={() => setFormDialog({ open: false })}
        />
      )}

      {archiveTarget && (
        <ArchiveDialog
          category={archiveTarget}
          allCategories={active}
          onClose={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
}
