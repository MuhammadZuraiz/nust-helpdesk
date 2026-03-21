import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTickets } from '../services/api';
import Layout from '../components/Layout';
import { PriorityBadge, StatusBadge } from '../components/Badge';

function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTickets() {
      try {
        const data = await getMyTickets();
        setTickets(data.tickets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  if (loading) return (
    <Layout>
      <p className="text-gray-500">Loading tickets...</p>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">My Tickets</h2>
        <button
          onClick={() => navigate('/tickets/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Ticket
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!error && tickets.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-400 mb-4">You have no tickets yet.</p>
          <button
            onClick={() => navigate('/tickets/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Submit your first ticket
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {tickets.map(ticket => (
          <div
            key={ticket.id}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            className={`bg-white rounded-lg shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${
              ticket.isResponseBreached || ticket.isResolveBreached
                ? 'border-l-4 border-red-400'
                : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-800 text-sm">{ticket.title}</h3>
              <div className="flex gap-2 ml-4 shrink-0">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <p className="text-gray-400 text-xs">
              {ticket.department?.name ?? 'No department'} ·{' '}
              {new Date(ticket.createdAt).toLocaleDateString()}
            </p>

            {/* Breach warning */}
            {(ticket.isResponseBreached || ticket.isResolveBreached) && (
              <p className="text-xs text-red-500 mt-2 font-medium">
                ⚠ SLA breached — this ticket needs attention
              </p>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default MyTicketsPage;