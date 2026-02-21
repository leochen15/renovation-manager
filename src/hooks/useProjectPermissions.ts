import { useMemo } from 'react';
import { useProjectContext } from '../core/ProjectContext';
import { defaultRolePermissions, resolvePermissions } from '../lib/permissions';
import { Role } from '../types';
import { useRolePermissions } from './useRolePermissions';

export const useProjectPermissions = () => {
  const { selectedProjectId, selectedRole } = useProjectContext();
  const { data } = useRolePermissions(selectedProjectId);

  const role = (selectedRole ?? 'viewer') as Role;

  const permissionOverrides = useMemo(() => {
    const match = data?.find((item) => item.role === role);
    if (!match) return null;
    const {
      can_view_schedule,
      can_edit_schedule,
      can_view_noticeboard,
      can_edit_noticeboard,
      can_view_trades,
      can_edit_trades,
      can_view_budget,
      can_edit_budget,
      can_view_invites,
      can_edit_invites,
    } = match;
    return {
      can_view_schedule,
      can_edit_schedule,
      can_view_noticeboard,
      can_edit_noticeboard,
      can_view_trades,
      can_edit_trades,
      can_view_budget,
      can_edit_budget,
      can_view_invites,
      can_edit_invites,
    };
  }, [data, role]);

  const permissions = useMemo(() => resolvePermissions(role, permissionOverrides), [role, permissionOverrides]);

  return {
    role,
    permissions,
    defaultRolePermissions,
    hasProject: !!selectedProjectId,
    canViewSchedule: permissions.can_view_schedule,
    canEditSchedule: permissions.can_edit_schedule,
    canViewNoticeboard: permissions.can_view_noticeboard,
    canEditNoticeboard: permissions.can_edit_noticeboard,
    canViewTrades: permissions.can_view_trades,
    canEditTrades: permissions.can_edit_trades,
    canViewBudget: permissions.can_view_budget,
    canEditBudget: permissions.can_edit_budget,
    canViewInvites: permissions.can_view_invites,
    canEditInvites: permissions.can_edit_invites,
  };
};
