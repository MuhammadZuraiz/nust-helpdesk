import { useNavigate } from 'react-router-dom';
import { logout } from '../services/api';
import NotificationBell from './NotificationBell';

function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  async function handleLogout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await logout({ refreshToken });
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      localStorage.clear();
      navigate('/');
    }
  }

  // Decide where the logo click goes based on role
  function handleHome() {
    const role = user.role;
    if (role === 'STUDENT')    navigate('/tickets');
    if (role === 'AGENT')      navigate('/agent/queue');
    if (role === 'SUPERVISOR') navigate('/supervisor/queue');
    if (role === 'ADMIN')      navigate('/admin');
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <button
          onClick={handleHome}
          className="text-lg font-bold text-gray-800 hover:text-blue-600 transition-colors"
        >
          NUST Helpdesk
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {user.role}
          </span>
          <span className="text-sm text-gray-500">{user.name}</span>

          {/* Bell — add this */}
          <NotificationBell />

          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto py-8 px-4">
        {children}
      </div>

    </div>
  );
}

export default Layout;