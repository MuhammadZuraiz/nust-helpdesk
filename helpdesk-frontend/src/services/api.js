const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
  });

  const data = await response.json();

  if (!response.ok) {
    // If we get a 401, the token has expired.
    // Clear storage and redirect to login automatically.
    if (response.status === 401) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // User was logged in but token expired — clear and redirect
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      // User is not logged in — this is a credentials error.
      // Fall through and throw a normal error so the login
      // form can display it as a message instead of redirecting.
    }

    const message = Array.isArray(data.error)
      ? data.error.map(e => e.message).join(', ')
      : data.error || 'Something went wrong';

    throw new Error(message);
  }

  return data;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const login    = (body) => request('/auth/login',    { method: 'POST', body: JSON.stringify(body) });
export const register = (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
export const logout   = (body) => request('/auth/logout',   { method: 'POST', body: JSON.stringify(body) });

// ── Tickets (student) ───────────────────────────────────────────────────────
export const getMyTickets  = ()     => request('/tickets/my');
export const getTicket     = (id)   => request(`/tickets/${id}`);
export const createTicket  = (body) => request('/tickets', { method: 'POST', body: JSON.stringify(body) });

// ── Tickets (staff) ─────────────────────────────────────────────────────────
export const getQueue      = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/tickets/queue${qs ? '?' + qs : ''}`);
};
export const assignTicket  = (id, body) => request(`/tickets/${id}/assign`,  { method: 'PATCH', body: JSON.stringify(body) });

// ── Status ───────────────────────────────────────────────────────────────────
export const changeStatus  = (id, body) => request(`/tickets/${id}/status`,  { method: 'PATCH', body: JSON.stringify(body) });
export const cancelTicket  = (id)       => request(`/tickets/${id}/cancel`,  { method: 'PATCH' });
export const reopenTicket  = (id)       => request(`/tickets/${id}/reopen`,  { method: 'PATCH' });
export const closeTicket   = (id)       => request(`/tickets/${id}/close`,   { method: 'PATCH' });

// ── Comments ─────────────────────────────────────────────────────────────────
export const addComment      = (id, body) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(body) });
export const addInternalNote = (id, body) => request(`/tickets/${id}/notes`,    { method: 'POST', body: JSON.stringify(body) });

// ── Audit ────────────────────────────────────────────────────────────────────
export const getAuditLog   = (id)       => request(`/tickets/${id}/audit`);

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const runSlaCheck   = ()         => request('/jobs/run-sla-check', { method: 'POST' });

// ── Notifications ────────────────────────────────────────────────────────────
export const getNotifications   = () => request('/notifications');
export const markNotificationsRead = () => request('/notifications/read', { method: 'PATCH' });

export const getAgents = () => request('/users/agents');
export const getStats = () => request('/users/stats');