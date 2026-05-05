import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';
import api from '../lib/api';
import { Project, Task } from '../types';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

function statusBadge(status: Task['status']) {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' } as const;
  return <span className={map[status]}>{status.replace('_', ' ')}</span>;
}

function priorityBadge(p: Task['priority']) {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high' } as const;
  return <span className={map[p]}>{p}</span>;
}

const STATUS_COLUMNS: Task['status'][] = ['TODO', 'IN_PROGRESS', 'DONE'];
const STATUS_LABELS: Record<Task['status'], string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null }>({ open: false });
  const [memberModal, setMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'MEMBER' as 'ADMIN' | 'MEMBER' });
  const [memberError, setMemberError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
  });

  const tasksKey = ['tasks', id, filterStatus, filterPriority];
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: tasksKey,
    queryFn: () =>
      api
        .get(`/projects/${id}/tasks`, {
          params: {
            ...(filterStatus ? { status: filterStatus } : {}),
            ...(filterPriority ? { priority: filterPriority } : {}),
          },
        })
        .then((r) => r.data),
    enabled: !!id,
  });

  const createTask = useMutation({
    mutationFn: (data: Partial<Task> & { assigneeIds: string[] }) => api.post(`/projects/${id}/tasks`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); setTaskModal({ open: false }); },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> & { assigneeIds?: string[] } }) =>
      api.put(`/projects/${id}/tasks/${taskId}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); setTaskModal({ open: false }); },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => api.delete(`/projects/${id}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', id] }),
  });

  const addMember = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post(`/projects/${id}/members`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setMemberModal(false);
      setMemberForm({ email: '', role: 'MEMBER' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setMemberError(msg ?? 'Failed to add member');
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${id}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const updateMemberRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      api.patch(`/projects/${id}/members/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => navigate('/projects'),
  });

  const isAdmin = project?.myRole === 'ADMIN';

  const handleTaskSave = (data: Partial<Task> & { assigneeIds: string[] }) => {
    if (taskModal.task) {
      updateTask.mutate({ taskId: taskModal.task.id, data });
    } else {
      createTask.mutate(data);
    }
  };

  const tasksByStatus = (status: Task['status']) => tasks.filter((t) => t.status === status);

  if (projectLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-200 rounded w-96" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-gray-500">Project not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTaskModal({ open: true })} className="btn-primary">
            + Add Task
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setMemberModal(true)} className="btn-secondary">
                Manage Members
              </button>
              <button
                onClick={() => { if (confirm('Delete this project?')) deleteProject.mutate(); }}
                className="btn-danger"
              >
                Delete Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Members strip */}
      <div className="flex items-center gap-2 flex-wrap">
        {project.members?.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {m.user.name[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-700">{m.user.name}</span>
            <span className="text-xs text-gray-400">· {m.role}</span>
          </div>
        ))}
      </div>

      {/* Filters & view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input w-auto text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select className="input w-auto text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Tasks */}
      {tasksLoading ? (
        <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />
      ) : viewMode === 'board' ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <div key={col} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">{STATUS_LABELS[col]}</h3>
                <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {tasksByStatus(col).length}
                </span>
              </div>
              <div className="space-y-2">
                {tasksByStatus(col).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    currentUserId={user!.id}
                    onEdit={() => setTaskModal({ open: true, task })}
                    onDelete={() => { if (confirm('Delete task?')) deleteTask.mutate(task.id); }}
                    onStatusChange={(status) => updateTask.mutate({ taskId: task.id, data: { status } })}
                  />
                ))}
                {tasksByStatus(col).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No tasks found.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{task.title}</p>
                  {task.dueDate && (
                    <p className={`text-xs mt-0.5 ${isPast(new Date(task.dueDate)) && task.status !== 'DONE' ? 'text-red-500' : 'text-gray-400'}`}>
                      Due {format(new Date(task.dueDate), 'MMM d')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 3).map((a) => (
                        <div key={a.userId} title={a.user.name} className="w-5 h-5 rounded-full bg-indigo-500 border border-white flex items-center justify-center text-white text-xs font-bold">
                          {a.user.name[0].toUpperCase()}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center text-gray-600 text-xs font-bold">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  {priorityBadge(task.priority)}
                  {statusBadge(task.status)}
                  <button onClick={() => setTaskModal({ open: true, task })} className="text-gray-400 hover:text-indigo-600 text-xs">
                    Edit
                  </button>
                  {isAdmin && (
                    <button onClick={() => { if (confirm('Delete?')) deleteTask.mutate(task.id); }} className="text-gray-400 hover:text-red-600 text-xs">
                      Del
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task modal */}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          members={project.members ?? []}
          onSave={handleTaskSave}
          onClose={() => setTaskModal({ open: false })}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      )}

      {/* Member modal */}
      {memberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Manage Members</h2>

            {/* Current members */}
            <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
              {project.members?.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.userId !== user!.id && (
                      <>
                        <select
                          className="input w-auto text-xs py-1"
                          value={m.role}
                          onChange={(e) => updateMemberRole.mutate({ userId: m.userId, role: e.target.value as 'ADMIN' | 'MEMBER' })}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                        <button
                          onClick={() => removeMember.mutate(m.userId)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {m.userId === user!.id && <span className="text-xs text-gray-400">You ({m.role})</span>}
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-4" />
            <h3 className="font-medium text-sm mb-3">Add Member</h3>
            <div className="space-y-3">
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              />
              <select
                className="input"
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as 'ADMIN' | 'MEMBER' })}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              {memberError && <p className="text-red-600 text-sm">{memberError}</p>}
              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={() => { setMemberModal(false); setMemberError(''); }}>
                  Close
                </button>
                <button
                  className="btn-primary"
                  onClick={() => { setMemberError(''); addMember.mutate(memberForm); }}
                  disabled={addMember.isPending}
                >
                  {addMember.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isAdmin: boolean;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
}

function TaskCard({ task, isAdmin, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 space-y-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="text-gray-300 hover:text-indigo-600 text-xs transition-colors">✏</button>
          {isAdmin && <button onClick={onDelete} className="text-gray-300 hover:text-red-500 text-xs transition-colors">✕</button>}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1">
        {priorityBadge(task.priority)}
      </div>
      {task.assignees.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {task.assignees.map((a) => (
            <span key={a.userId} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
              <span className="w-3.5 h-3.5 rounded-full bg-purple-400 text-white flex items-center justify-center font-bold" style={{ fontSize: '8px' }}>
                {a.user.name[0].toUpperCase()}
              </span>
              {a.user.name}
            </span>
          ))}
        </div>
      )}

      {task.dueDate && (
        <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {isOverdue ? '⚠ ' : ''}Due {format(new Date(task.dueDate), 'MMM d')}
        </p>
      )}

      <select
        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        value={task.status}
        onChange={(e) => onStatusChange(e.target.value as Task['status'])}
      >
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
      </select>
    </div>
  );
}
