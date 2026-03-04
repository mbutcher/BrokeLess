import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Check, X, UserPlus, Trash2 } from 'lucide-react';
import { useHousehold, useUpdateHousehold, useRemoveMember } from '../hooks/useHousehold';
import { AddMemberDialog } from '../components/AddMemberDialog';
import { useAuthStore } from '@features/auth/stores/authStore';
import { useFormatters } from '@lib/i18n/useFormatters';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import type { HouseholdRole } from '../types';

function RoleBadge({ role }: { role: HouseholdRole }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        role === 'owner'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground',
      ].join(' ')}
    >
      {t(`household.roles.${role}`)}
    </span>
  );
}

export function HouseholdSettingsPage() {
  const { t } = useTranslation();
  const { date: formatDate } = useFormatters();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: household, isLoading } = useHousehold();
  const updateHousehold = useUpdateHousehold();
  const removeMember = useRemoveMember();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  const isOwner = household?.members.find((m) => m.userId === currentUserId)?.role === 'owner';

  function startEditing() {
    setNameValue(household?.name ?? '');
    setEditingName(true);
  }

  function cancelEditing() {
    setEditingName(false);
  }

  function saveName() {
    if (!nameValue.trim()) return;
    updateHousehold.mutate(nameValue.trim(), {
      onSuccess: () => setEditingName(false),
    });
  }

  function handleRemove(userId: string) {
    setConfirmingRemove(userId);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('household.settings.title')}</h1>

      {/* Household name */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('household.settings.nameLabel')}
        </h2>
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              autoFocus
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') cancelEditing();
              }}
            />
            <Button
              size="sm"
              onClick={saveName}
              disabled={!nameValue.trim() || updateHousehold.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEditing}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">{household?.name}</span>
            {isOwner && (
              <Button size="sm" variant="ghost" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Member list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('household.settings.memberList')}
          </h2>
          {isOwner && (
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t('household.settings.addMember')}
            </Button>
          )}
        </div>
        <div className="divide-y divide-border">
          {household?.members.map((member) => (
            <div key={member.userId} className="px-5 py-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {member.displayName ?? member.email}
                  </span>
                  <RoleBadge role={member.role} />
                </div>
                {member.displayName && (
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('household.settings.memberSince', { date: formatDate(member.joinedAt) })}
                </p>
              </div>
              {isOwner && member.userId !== currentUserId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                  onClick={() => handleRemove(member.userId)}
                  disabled={removeMember.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <AddMemberDialog open={showAddMember} onClose={() => setShowAddMember(false)} />

      {/* Remove member confirmation dialog */}
      <Dialog open={confirmingRemove !== null} onOpenChange={(open) => { if (!open) setConfirmingRemove(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('household.settings.removeMember')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('household.settings.confirmRemove')}</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmingRemove(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={removeMember.isPending}
              onClick={() => {
                if (confirmingRemove) {
                  removeMember.mutate(confirmingRemove, {
                    onSuccess: () => setConfirmingRemove(null),
                  });
                }
              }}
            >
              {t('household.settings.removeMember')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
