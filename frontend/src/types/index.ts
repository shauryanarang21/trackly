export type MemberRole = 'ADMIN' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProjectMember {
  id: string;
  role: MemberRole;
  user: User;
  userId: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdById: string;
  myRole: MemberRole;
  members?: ProjectMember[];
  _count?: { tasks: number; members: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assignees: { user: User; userId: string; taskId: string }[];
  createdBy: User;
  createdById: string;
}

export interface DashboardData {
  totalProjects: number;
  totalTasks: number;
  myTasksCount: number;
  overdueCount: number;
  statusCounts: { TODO: number; IN_PROGRESS: number; DONE: number };
  priorityCounts: { LOW: number; MEDIUM: number; HIGH: number };
  recentTasks: Task[];
  overdueTasks: Task[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
}
