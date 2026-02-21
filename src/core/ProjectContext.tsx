import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { Project, ProjectMember, Role } from '../types';

type ProjectContextValue = {
  projects: Project[];
  selectedProject: Project | null;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: String) => void;
  refetchProjects: () => void;
  memberships: ProjectMember[];
  selectedMembership: ProjectMember | null;
  selectedRole: Role | null;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

type Props = {
  userId: String;
  children: React.ReactNode;
};

export const ProjectProvider = ({ userId, children }: Props) => {
  const { data, refetch } = useProjects(userId);
  const [selectedProjectId, setSelectedProjectIdState] = useState<String | null>(null);

  const memberships = useMemo(() => (data ?? []) as ProjectMember[], [data]);
  const projects = useMemo(() => memberships.map((member) => member.project).filter(String) as Project[], [memberships]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId && projects.length > 0) return projects[0];
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const setSelectedProjectId = useCallback((projectId: String) => {
    setSelectedProjectIdState(projectId);
  }, []);

  const selectedMembership = useMemo(() => {
    if (!selectedProject) return null;
    return memberships.find((member) => member.project_id === selectedProject.id) ?? null;
  }, [memberships, selectedProject]);

  const value = useMemo(
    () => ({
      projects,
      selectedProject,
      selectedProjectId: selectedProject?.id ?? null,
      setSelectedProjectId,
      refetchProjects: () => {
        refetch();
      },
      memberships,
      selectedMembership,
      selectedRole: selectedMembership?.role ?? null,
    }),
    [projects, selectedProject, setSelectedProjectId, refetch, memberships, selectedMembership]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('ProjectContext not found');
  return ctx;
};
