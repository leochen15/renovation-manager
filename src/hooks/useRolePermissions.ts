import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { RolePermission } from '../types';

export const useRolePermissions = (projectId?: string | null) => {
  return useQuery({
    queryKey: ['role-permissions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return [] as RolePermission[];
      const { data, error } = await supabase
        .from('project_role_permissions')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as RolePermission[];
    },
  });
};
