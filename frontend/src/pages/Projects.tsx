import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../lib/api';
import { Project } from '../types';

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="card block hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        <span
          className={`ml-2 shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            project.myRole === 'ADMIN'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {project.myRole}
        </span>
      </div>
      <div className="flex gap-4 mt-4 text-sm text-gray-500">
        <span>{project._count?.tasks ?? 0} tasks</span>
        <span>{project._count?.members ?? 0} members</span>
        <span className="ml-auto">{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
      </div>
    </Link>
  );
}

export default function Projects() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });

  const createProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post('/projects', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
      setForm({ name: '', description: '' });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Failed to create project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    createProject.mutate(form);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No projects yet.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project name"
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
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setFormError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
