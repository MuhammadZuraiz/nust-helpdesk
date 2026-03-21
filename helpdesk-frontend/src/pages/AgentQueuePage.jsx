import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueue } from '../services/api';
import Layout from '../components/Layout';
import { PriorityBadge, StatusBadge } from '../components/Badge';

// These are the statuses an agent actually cares about.
// CLOSED and CANCELLED are terminal — no action needed.
const FILTER_STATUSES = [
  'ALL',
  'OPEN',
  'IN_PROGRESS',
  'NEEDS_INFO',
  'RESOLVED',
];

function AgentQueuePage() {
  const [tickets, setTickets]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Filter state — what the agent has selected
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy]             = useState('createdAt');
  const [page, setPage]                 = useState(1);

  const navigate = useNavigate();
  const LIMIT = 20;

  // Fetch whenever filters or page change
  useEffect(() => {
    async function fetchQueue() {
      setLoading(true);
      try {
        const params = {
          page,
          limit: LIMIT,
          sortBy,
          sortOrder: sortBy === 'priority' ? 'asc' : 'desc',
          ...(statusFilter !== 'ALL' && { status: statusFilter })
        };
        const data = await getQueue(params);
        setTickets(data.tickets);
        setTotal(data.meta.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, [statusFilter, sortBy, page]);

  // When a filter changes, reset to page 1
  function handleStatusChange(status) {
    setStatusFilter(status);
    setPage(1);
  }

  function handleSortChange(e) {
    setSortBy(e.target.value);
    setPage(1);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Ticket Queue</h2>
          <p className="text-sm text-gray-400 mt-1">{total} tickets</p>
        </div>

        {/* Sort control */}
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="createdAt">Newest first</option>
          <option value="priority">Priority</option>
          <option value="slaDueSoon">SLA due soon</option>
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading queue...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tickets.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400">No tickets found for this filter.</p>
        </div>
      )}

      {/* Ticket list */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="bg-white rounded-lg shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium text-gray-800 text-sm mb-1">
                    {ticket.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {ticket.student?.name} ·{' '}
                    {ticket.department?.name ?? 'No department'} ·{' '}
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              {/* SLA indicator */}
              {ticket.responseDueAt && !ticket.firstResponseAt && (
                <SlaIndicator
                  label="Response due"
                  dueAt={ticket.responseDueAt}
                  breached={ticket.isResponseBreached}
                />
              )}
              {ticket.resolveDueAt && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                <SlaIndicator
                  label="Resolve due"
                  dueAt={ticket.resolveDueAt}
                  breached={ticket.isResolveBreached}
                />
              )}

              {/* Assignee */}
              <p className="text-xs text-gray-400 mt-2">
                {ticket.assignee
                  ? `Assigned to ${ticket.assignee.name}`
                  : 'Unassigned'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </Layout>
  );
}

// Small helper component — shows SLA deadline and whether it's breached
function SlaIndicator({ label, dueAt, breached }) {
  const due = new Date(dueAt);
  const now = new Date();

  const diffMs = due - now;
  const abs = Math.abs(diffMs);

  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

  const isOverdue = diffMs < 0;
  const isUrgent = !isOverdue && (days === 0 && diffHours < 2);

  // Build time string
  let timeText = '';
  if (days > 0) timeText += `${days}d `;
  if (diffHours > 0) timeText += `${diffHours}h `;
  if (diffMins > 0 || !timeText) timeText += `${diffMins}m`;
  timeText = timeText.trim();

  if (isOverdue) {
    timeText = `Overdue by ${timeText}`;
  } else {
    timeText = `${timeText} remaining`;
  }

  const colorClass =
    breached || isOverdue
      ? 'text-red-600 bg-red-50'
      : isUrgent
      ? 'text-orange-600 bg-orange-50'
      : 'text-gray-500 bg-gray-50';

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mt-1 mr-2 ${colorClass}`}
    >
      <span>⏱</span>
      <span>
        {label}: {timeText}
      </span>
    </div>
  );
}

export default AgentQueuePage;