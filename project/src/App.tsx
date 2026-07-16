import { useState, useCallback } from 'react';
import { Sidebar, type ViewType } from './components/Sidebar';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { mockUser, type UserProfile } from './mockData';
import Dashboard from './components/Dashboard';
import TaskBoardPage from './components/TaskBoardPage';
import ProfilePage from './components/ProfilePage';

/* ─── Placeholder for views not yet built ─── */
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="flex items-center justify-center rounded-3xl mb-5"
        style={{ width: 72, height: 72, background: '#DDF3DF' }}
      >
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>{title}</h2>
      <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [user, setUser] = useState<UserProfile>(mockUser);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: ToastMessage) => {
    setToasts((prev) => [...prev, t]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNavigate = useCallback((view: ViewType) => {
    setActiveView(view);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <TaskBoardPage onToast={addToast} />;
      case 'profile':
        return <ProfilePage user={user} onUserChange={setUser} onToast={addToast} />;
      case 'schedule':
        return <ComingSoon title="Lịch trình" />;
      case 'pomodoro':
        return <ComingSoon title="Pomodoro Sessions" />;
      case 'analytics':
        return <ComingSoon title="Analytics" />;
      case 'ai-insights':
        return <ComingSoon title="AI Insights" />;
      case 'notifications':
        return <ComingSoon title="Thông báo" />;
      case 'settings':
        return <ComingSoon title="Cài đặt" />;
      case 'help':
        return <ComingSoon title="Help & Support" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#F4FAF4', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <Sidebar activeView={activeView} onNavigate={handleNavigate} user={user} />

      <main
        className="flex-1 min-w-0 overflow-y-auto pb-16 lg:pb-0"
        style={{ background: '#F4FAF4' }}
      >
        {renderView()}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
