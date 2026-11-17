import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HeartHandshake,
  Kanban,
  Users,
  CheckSquare,
  Calendar,
  LogOut,
  Shield,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Pipeline Board',
      icon: <Kanban className="w-5 h-5" />,
    },
    {
      path: '/candidates',
      label: 'Candidate List',
      icon: <Users className="w-5 h-5" />,
    },
    {
      path: '/checklist',
      label: 'Verification',
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      path: '/slots',
      label: 'Interview Slots',
      icon: <Calendar className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-ink text-white shrink-0 border-r border-gray-800">
        {/* Brand header */}
        <div className="h-18 px-6 flex items-center gap-3 border-b border-gray-800/80">
          <div className="w-9 h-9 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="font-heading font-bold text-base tracking-tight text-white">
              TheCarePal
            </div>
            <div className="text-[11px] font-medium text-brand-periwinkle -mt-0.5">
              Operations CRM
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-deepBlue text-white shadow-sm font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-gray-800/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center text-xs font-bold">
                OA
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Operations Admin</div>
                <div className="text-[10px] text-gray-400">admin@thecarepal.test</div>
              </div>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar on mobile & desktop */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-ink text-brand-teal flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="font-heading font-bold text-sm text-brand-heading">TheCarePal Ops</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
              <span>Operations</span>
              <span>/</span>
              <span className="font-semibold text-brand-heading">
                {navItems.find((n) => n.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
              <Shield className="w-3.5 h-3.5 text-brand-teal" /> Staff Portal
            </span>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-2 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'text-brand-action font-semibold' : 'text-gray-500'
                }`}
              >
                {item.icon}
                <span className="text-[11px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
