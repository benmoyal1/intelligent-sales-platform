import { Link, useLocation } from 'react-router-dom';
import { Bot, Users, BarChart3, Calendar, LogOut } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onLogout: () => void;
}

export default function Layout({ children, onLogout }: Props) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-dark-panel border-r border-dark-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-dark-border">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-100">Outbound AI</h1>
                <p className="text-xs text-gray-400">Alta Demo</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              to="/"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/')
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-dark-hover hover:text-white'
              }`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
            <Link
              to="/prospects"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/prospects')
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-dark-hover hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Prospects
            </Link>
            <Link
              to="/meetings"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/meetings')
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-dark-hover hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5 mr-3" />
              Meetings
            </Link>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-dark-border">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-dark-hover hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">{children}</div>
    </div>
  );
}
