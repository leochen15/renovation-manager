import { BudgetItem, Notice, Project, ProjectInvite, ProjectMember, Task, Trade } from '../types';
import { defaultRolePermissions } from '../lib/permissions';

const now = () => new Date().toISOString();

export const mockUser = {
  id: 'mock-user-1',
  email: 'renovator@example.com',
};

export const mockViewer = {
  id: 'mock-viewer-1',
  email: 'viewer@example.com',
};

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Coastal Kitchen Reno',
    address: '123 Seaside Ave',
    start_date: '2026-02-01',
    end_date: '2026-04-15',
    owner_id: mockUser.id,
    created_at: now(),
  },
  {
    id: 'project-2',
    name: 'Main Bath Refresh',
    address: '88 Granite St',
    start_date: '2026-03-10',
    end_date: '2026-05-05',
    owner_id: mockUser.id,
    created_at: now(),
  },
];

export const mockMembers: ProjectMember[] = mockProjects.map((project) => ({
  id: `member-${project.id}`,
  project_id: project.id,
  user_id: mockUser.id,
  role: 'owner',
  created_at: now(),
  project,
}));

export const mockViewerMembers: ProjectMember[] = [
  {
    id: 'member-viewer-project-1',
    project_id: mockProjects[0].id,
    user_id: mockViewer.id,
    role: 'viewer',
    created_at: now(),
    project: mockProjects[0],
  },
];

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'project-1',
    title: 'Demo + cleanup',
    start_date: '2026-02-03',
    end_date: '2026-02-07',
    status: 'done',
    trade_id: null,
    sort_order: 1,
    created_at: now(),
  },
  {
    id: 'task-2',
    project_id: 'project-1',
    title: 'Electrical rough-in',
    start_date: '2026-02-10',
    end_date: '2026-02-14',
    status: 'in_progress',
    trade_id: null,
    sort_order: 2,
    created_at: now(),
  },
  {
    id: 'task-3',
    project_id: 'project-1',
    title: 'Cabinet install',
    start_date: '2026-02-18',
    end_date: '2026-02-23',
    status: 'planned',
    trade_id: null,
    sort_order: 3,
    created_at: now(),
  },
];

export const mockNotices: Notice[] = [
  {
    id: 'notice-1',
    project_id: 'project-1',
    title: 'Tile delivery delayed',
    body: 'Supplier pushed delivery by 3 days. Adjusting install sequence.',
    tags: ['issue', 'schedule'],
    created_by: mockUser.id,
    created_at: now(),
  },
];

export const mockTrades: Trade[] = [
  {
    id: 'trade-1',
    project_id: 'project-1',
    name: 'Jamie Lee',
    trade: 'Electrician',
    phone: '(555) 010-204',
    email: 'jamie@trade.com',
    created_at: now(),
  },
];

export const mockBudget: BudgetItem[] = [
  {
    id: 'budget-1',
    project_id: 'project-1',
    name: 'Cabinetry',
    category: 'Materials',
    estimated_cost: 9500,
    actual_cost: 9200,
    status: 'paid',
    notes: null,
    created_at: now(),
  },
  {
    id: 'budget-2',
    project_id: 'project-1',
    name: 'Plumbing labor',
    category: 'Labor',
    estimated_cost: 3200,
    actual_cost: null,
    status: 'committed',
    notes: null,
    created_at: now(),
  },
];

export const mockInvites: ProjectInvite[] = [
  {
    id: 'invite-1',
    project_id: 'project-2',
    email: mockUser.email,
    invited_by: mockUser.id,
    role: 'collaborator',
    created_at: now(),
  },
];

export const mockDb = {
  profiles: [
    { id: mockUser.id, full_name: 'Renovator', created_at: now() },
    { id: mockViewer.id, full_name: 'Read Only Viewer', created_at: now() },
  ],
  projects: [...mockProjects],
  project_members: [...mockMembers, ...mockViewerMembers],
  project_invites: [...mockInvites],
  project_role_permissions: mockProjects.flatMap((project) =>
    (['owner', 'collaborator', 'viewer'] as const).map((role) => ({
      id: `perm-${project.id}-${role}`,
      project_id: project.id,
      role,
      ...defaultRolePermissions[role],
      created_at: now(),
    }))
  ),
  tasks: [...mockTasks],
  notices: [...mockNotices],
  trades: [...mockTrades],
  budget_items: [...mockBudget],
};
