import { useState, useEffect } from 'react';
import { Task, ProjectMember, TaskStatus, Priority } from '../types';

interface Props {
  task?: Task | null;
  members: ProjectMember[];
  onSave: (data: Partial<Task> & { assigneeIds: string[] }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function TaskModal({ task, members, onSave, onClose, isLoading }: Props) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: (task?.status ?? 'TODO') as TaskStatus,
    priority: (task?.priority ?? 'MEDIUM') as Priority,
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    assigneeIds: task?.assignees.map((a) => a.userId) ?? [],
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        assigneeIds: task.assignees.map((a) => a.userId),
      });
    }
  }, [task]);

  const toggleAssignee = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter((id) => id !== userId)
        : [...prev.assigneeIds, userId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      assigneeIds: form.assigneeIds,
    });
  };

  const selectedNames = members
    .filter((m) => form.assigneeIds.includes(m.userId))
    .map((m) => m.user.name);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{task ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              className="input"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          {/* Multi-select assignees */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignees
              {form.assigneeIds.length > 0 && (
                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {form.assigneeIds.length} selected
                </span>
              )}
            </label>
            <button
              type="button"
              className="input text-left flex items-center justify-between"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <span className="text-sm text-gray-600 truncate">
                {selectedNames.length > 0 ? selectedNames.join(', ') : 'Select assignees...'}
              </span>
              <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">No members yet</p>
                ) : (
                  members.map((m) => (
                    <label
                      key={m.userId}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.assigneeIds.includes(m.userId)}
                        onChange={() => toggleAssignee(m.userId)}
                        className="accent-indigo-600"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {m.user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{m.user.name}</p>
                          <p className="text-xs text-gray-400">{m.role}</p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
                <div className="border-t p-2">
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
