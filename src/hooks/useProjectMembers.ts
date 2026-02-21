import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ProjectMemberWithProfile } from '../types';

export const useProjectMembers = (projectId: string | null) => {
  return useQuery({
    queryKey: ['project-members', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return [] as ProjectMemberWithProfile[];
      const { data, error } = await supabase
        .from('project_members')
        .select('id, project_id, user_id, role, active, created_at, profile:profiles(full_name)')
        .eq('project_id', projectId)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProjectMemberWithProfile[];
    },
  });
};

