import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ProjectInvite } from '../types';

export const usePendingInvites = () => {
  return useQuery({
    queryKey: ['pending-invites'],
    enabled: true,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return [] as ProjectInvite[];

      const { data, error } = await supabase
        .from('project_invites')
        .select('*, project:projects(*)')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as ProjectInvite[];
    },
  });
};

