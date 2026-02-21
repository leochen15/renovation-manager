import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ProjectMember } from '../types';

export const useProjects = (userId?: String) => {
  return useQuery({
    queryKey: ['projects', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as ProjectMember[];
      const { data, error } = await supabase
        .from('project_members')
        .select('id, project_id, user_id, role, active, created_at, project:projects(*)')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProjectMember[];
    },
  });
};
