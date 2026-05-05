import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import api from '../lib/api';
import { DashboardData, Task } from '../types';


function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function statusBadge(status: Task['status']) {
  const map = {
    TODO: 'badge-todo',
    IN_PROGRESS: 'badge-in-progress',
    DONE: 'badge-done',
  } as const;
  return <span className={map[status]}>{status.replace('_', ' ')}</span>;
}

function priorityBadge(priority: Task['priority']) {
  const map = {
    LOW: 'badge-low',
    MEDIUM: 'badge-medium',
    HIGH: 'badge-high',
  } as const;
  return <span className={map[priority]}>{priority}</span>;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projects" value={data.totalProjects} color="text-indigo-600" />
        <StatCard label="Total Tasks" value={data.totalTasks} color="text-gray-900" />
        <StatCard label="My Tasks" value={data.myTasksCount} color="text-blue-600" />
        <StatCard label="Overdue" value={data.overdueCount} color="text-red-600" />
      </div>

      {/* Status breakdown */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Task Status Breakdown</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-gray-700">{data.statusCounts.TODO}</p>
            <p className="text-sm text-gray-500 mt-1">To Do</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-700">{data.statusCounts.IN_PROGRESS}</p>
            <p className="text-sm text-gray-500 mt-1">In Progress</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-700">{data.statusCounts.DONE}</p>
            <p className="text-sm text-gray-500 mt-1">Done</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My recent tasks */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">My Recent Tasks</h2>
          {data.recentTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">No tasks assigned to you yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 space-y-0">
              {data.recentTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${t.projectId}`}
                      className="text-sm font-medium text-gray-800 hover:text-indigo-600 truncate block"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.dueDate
                        ? `Due ${format(new Date(t.dueDate), 'MMM d')}`
                        : 'No due date'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {statusBadge(t.status)}
                    {priorityBadge(t.priority)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card border-red-100">
          <h2 className="font-semibold text-red-600 mb-4">Overdue Tasks</h2>
          {data.overdueTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">No overdue tasks.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.overdueTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${t.projectId}`}
                      className="text-sm font-medium text-gray-800 hover:text-indigo-600 truncate block"
                    >
                      {t.title}
                    </Link>
                    {t.dueDate && (
                      <p className={`text-xs mt-0.5 ${isPast(new Date(t.dueDate)) ? 'text-red-500' : 'text-gray-400'}`}>
                        Due {format(new Date(t.dueDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {statusBadge(t.status)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
