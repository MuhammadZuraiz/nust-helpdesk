import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getQueue, runSlaCheck } from '../services/api';
import Layout from '../components/Layout';
import { PriorityBadge, StatusBadge } from '../components/Badge';

function AdminPage() {
  const [stats, setStats]                   = useState(null);
  const [tickets, setTickets]               = useState([]);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [slaLoading, setSlaLoading]         = useState(false);
  const [slaResult, setSlaResult]           = useState(null);
  const [error, setError]                   = useState(null);

  const navigate = useNavigate();

  // Fetch stats and recent tickets simultaneously on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, queueData] = await Promise.all([
          getStats(),
          getQueue({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
        ]);
        setStats(statsData);
        setTickets(queueData.tickets);
      } catch (err) {
        setError(err.message);
      } finally {
        setStatsLoading(false);
        setTicketsLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSlaCheck() {
    setSlaLoading(true);
    setSlaResult(null);
    try {
      const result = await runSlaCheck();
      setSlaResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSlaLoading(false);
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800">Admin Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">System-wide overview</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Stats grid */}
      {statsLoading ? (
        <p className="text-gray-400 mb-8">Loading stats...</p>
      ) : stats && (
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <StatCard
            label="Total Tickets"
            value={stats.totalTickets}
            color="blue"
          />
          <StatCard
            label="Open"
            value={stats.openTickets}
            color="green"
          />
          <StatCard
            label="Response Breaches"
            value={stats.responseBreaches}
            color={stats.responseBreaches > 0 ? 'red' : 'gray'}
          />
          <StatCard
            label="Resolve Breaches"
            value={stats.resolveBreaches}
            color={stats.resolveBreaches > 0 ? 'red' : 'gray'}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgressTickets}
            color="blue"
          />
          <StatCard
            label="Resolved"
            value={stats.resolvedTickets}
            color="purple"
          />
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            color="gray"
          />
        </div>
      )}

      {/* SLA check panel */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-1">SLA Management</h3>
        <p className="text-sm text-gray-400 mb-4">
          The cron job runs every 5 minutes automatically.
          Use this to trigger a manual check immediately.
        </p>

        <button
          onClick={handleSlaCheck}
          disabled={slaLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {slaLoading ? 'Running check...' : 'Run SLA Check Now'}
        </button>

        {/* SLA result */}
        {slaResult && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Check complete
            </p>
            <p className="text-sm text-gray-600">
              Response breaches detected:{' '}
              <span className={`font-medium ${slaResult.result.responseBreaches.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {slaResult.result.responseBreaches.length}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Resolve breaches detected:{' '}
              <span className={`font-medium ${slaResult.result.resolveBreaches.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {slaResult.result.resolveBreaches.length}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Recent tickets */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Recent Tickets</h3>
          <button
            onClick={() => navigate('/agent/queue')}
            className="text-sm text-blue-600 hover:underline"
          >
            View all →
          </button>
        </div>

        {ticketsLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : tickets.length === 0 ? (
          <p className="text-gray-400 text-sm">No tickets yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
              >
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-gray-800">
                    {ticket.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ticket.student?.name} ·{' '}
                    {ticket.department?.name ?? 'No dept'} ·{' '}
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Stat card helper component
const COLOR_MAP = {
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-green-50 text-green-700',
  red:    'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
  gray:   'bg-gray-50 text-gray-600',
};

function StatCard({ label, value, color = 'gray' }) {
  return (
    <div className={`rounded-lg p-4 ${COLOR_MAP[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}

export default AdminPage;