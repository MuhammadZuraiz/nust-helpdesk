import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const navigate  = useNavigate();
  const token     = localStorage.getItem('accessToken');
  const savedUser = localStorage.getItem('user');

  // If already logged in, redirect immediately
  useEffect(() => {
    if (token && savedUser) {
      const { role } = JSON.parse(savedUser);
      if (role === 'STUDENT')    navigate('/tickets',         { replace: true });
      if (role === 'AGENT')      navigate('/agent/queue',     { replace: true });
      if (role === 'SUPERVISOR') navigate('/supervisor/queue',{ replace: true });
      if (role === 'ADMIN')      navigate('/admin',           { replace: true });
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();   // stops the browser's default form reload behaviour
    setError(null);
    setLoading(true);

    try {
      const data = await login({ email, password });

      // Store tokens and basic user info in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      const { role } = data.user;
      if (role === 'STUDENT')    navigate('/tickets');
      if (role === 'AGENT')      navigate('/agent/queue');
      if (role === 'SUPERVISOR') navigate('/supervisor/queue');
      if (role === 'ADMIN')      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          NUST Helpdesk
        </h1>
        <p className="text-gray-500 mb-6">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;