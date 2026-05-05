import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: Props) {
  const { pathname } = useLocation();

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/Trackly_Icon.png" alt="Trackly" className="h-14 w-auto" />
            <span className="text-xl font-bold text-indigo-600">Trackly</span>
            </Link>
            <div className="flex gap-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(l.to)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
            </div>
            <button onClick={onLogout} className="btn-secondary text-sm py-1.5">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
