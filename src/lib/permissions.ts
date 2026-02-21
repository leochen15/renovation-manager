import { Role, RolePermission } from '../types';

type PermissionSet = Omit<RolePermission, 'id' | 'project_id' | 'created_at' | 'role'>;

export const defaultRolePermissions: Record<Role, PermissionSet> = {
  owner: {
    can_view_schedule: true,
    can_edit_schedule: true,
    can_view_noticeboard: true,
    can_edit_noticeboard: true,
    can_view_trades: true,
    can_edit_trades: true,
    can_view_budget: true,
    can_edit_budget: true,
    can_view_invites: true,
    can_edit_invites: true,
  },
  collaborator: {
    can_view_schedule: true,
    can_edit_schedule: true,
    can_view_noticeboard: true,
    can_edit_noticeboard: true,
    can_view_trades: true,
    can_edit_trades: true,
    can_view_budget: true,
    can_edit_budget: true,
    can_view_invites: false,
    can_edit_invites: false,
  },
  viewer: {
    can_view_schedule: true,
    can_edit_schedule: false,
    can_view_noticeboard: true,
    can_edit_noticeboard: false,
    can_view_trades: true,
    can_edit_trades: false,
    can_view_budget: false,
    can_edit_budget: false,
    can_view_invites: false,
    can_edit_invites: false,
  },
};

export const resolvePermissions = (role: Role, overrides?: Partial<PermissionSet> | null) => ({
  ...defaultRolePermissions[role],
  ...(overrides ?? {}),
});
