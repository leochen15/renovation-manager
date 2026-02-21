export type Role = 'owner' | 'collaborator' | 'viewer';
export type TaskStatus = 'planned' | 'in_progress' | 'blocked' | 'done';
export type BudgetStatus = 'planned' | 'committed' | 'paid';

export type Profile = {
  id: string;
  full_name: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  created_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  project?: Project;
};

export type ProjectInvite = {
  id: string;
  project_id: string;
  email: string;
  invited_by: string;
  role: Role;
  created_at: string;
  project?: Project;
};

export type RolePermission = {
  id: string;
  project_id: string;
  role: Role;
  can_view_schedule: boolean;
  can_edit_schedule: boolean;
  can_view_noticeboard: boolean;
  can_edit_noticeboard: boolean;
  can_view_trades: boolean;
  can_edit_trades: boolean;
  can_view_budget: boolean;
  can_edit_budget: boolean;
  can_view_invites: boolean;
  can_edit_invites: boolean;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  trade_id: string | null;
  sort_order: number | null;
  created_at: string;
};

export type Notice = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  tags: string[];
  created_by: string;
  created_at: string;
};

export type Trade = {
  id: string;
  project_id: string;
  name: string;
  trade: string;
  phone: string;
  email: string;
  created_at: string;
};

export type BudgetItem = {
  id: string;
  project_id: string;
  name: string;
  category: string;
  estimated_cost: number;
  actual_cost: number | null;
  status: BudgetStatus;
  notes: string | null;
  created_at: string;
};
