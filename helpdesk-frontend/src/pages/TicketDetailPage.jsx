import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTicket, addComment, addInternalNote, changeStatus, assignTicket, getAgents, getAuditLog } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import Layout from '../components/Layout';

function TicketDetailPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStaff = ['AGENT', 'SUPERVISOR', 'ADMIN'].includes(user.role);

  const isSupervisorOrAdmin = ['SUPERVISOR', 'ADMIN'].includes(user.role);

  const backPath = user.role === 'STUDENT'
  ? '/tickets'
  : user.role === 'ADMIN'
    ? '/admin'
    : `/${user.role.toLowerCase()}/queue`;

  const [agents, setAgents]           = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError]     = useState(null);

  const [activeTab, setActiveTab]         = useState('public');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError]     = useState(null);
  const [ticket, setTicket]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [comment, setComment]           = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError]     = useState(null);
  const [auditLog, setAuditLog]   = useState([]);

  const { id } = useParams();
  const navigate = useNavigate();

  // fetchTicket lives inside useEffect — only runs on mount
  useEffect(() => {
    async function fetchTicket() {
      try {
        const data = await getTicket(id);
        setTicket(data);
        if (data.assigneeId) setSelectedAgent(data.assigneeId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function fetchAgents() {
      try {
        const data = await getAgents();
        setAgents(data);
      } catch {
        // silently fail
      }
    }

    async function fetchAudit() {
      if (!isStaff) return;
      try {
        const data = await getAuditLog(id);
        setAuditLog(data);
      } catch {
        // silently fail
      }
    }

    fetchTicket();
    fetchAgents();
    fetchAudit();
  }, [id]);

  // handleCommentSubmit lives at component level — accessible by the form
  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentError(null);
    setCommentLoading(true);

    try {
      await addComment(ticket.id, { content: comment });
      setComment('');
      const data = await getTicket(id);
      setTicket(data);
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setStatusError(null);
    setStatusLoading(true);
    try {
      await changeStatus(ticket.id, { newStatus });
      const data = await getTicket(id);
      setTicket(data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedAgent) return;
    setAssignError(null);
    setAssignLoading(true);
    try {
      await assignTicket(ticket.id, { assigneeId: selectedAgent });
      const data = await getTicket(id);
      setTicket(data);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading ticket...</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate(backPath)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6 block"
          >
            ← Back to {user.role === 'STUDENT' ? 'my tickets' : 'queue'}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate(backPath)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 block"
      >
        ← Back to {user.role === 'STUDENT' ? 'my tickets' : 'queue'}
      </button>
        {/* Ticket header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">

          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mr-4">
              {ticket.title}
            </h2>
            <div className="flex gap-2 shrink-0">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            {ticket.description}
          </p>

            {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-1">Department</p>
              <p className="text-sm text-gray-700">
                {ticket.department?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm text-gray-700">
                {ticket.category?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Assigned to</p>
              <p className="text-sm text-gray-700">
                {ticket.assignee?.name ?? 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Submitted</p>
              <p className="text-sm text-gray-700">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Student status actions */}
          {!isStaff && (
            <div className="pt-4 mt-4 border-t border-gray-100 flex gap-2">
              {ticket.status === 'OPEN' && (
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={statusLoading}
                  className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Cancel Ticket
                </button>
              )}
              {ticket.status === 'RESOLVED' && (
                <>
                  <button
                    onClick={() => handleStatusChange('CLOSED')}
                    disabled={statusLoading}
                    className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    Close Ticket
                  </button>
                  <button
                    onClick={() => handleStatusChange('REOPENED')}
                    disabled={statusLoading}
                    className="px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded hover:bg-orange-100 disabled:opacity-50 transition-colors"
                  >
                    Reopen Ticket
                  </button>
                </>
              )}
            </div>
          )}

          {/* Status actions — staff only */}
          {isStaff && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Change status</p>

              {statusError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-2">
                  {statusError}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {getAvailableTransitions(ticket.status).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusLoading}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    → {status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assign panel — supervisor/admin only */}
          {isSupervisorOrAdmin && agents.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Assign to agent</p>

              {assignError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-2">
                  {assignError}
                </div>
              )}

              <form onSubmit={handleAssign} className="flex gap-2">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={assignLoading || !selectedAgent}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assignLoading ? 'Assigning...' : 'Assign'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* SLA panel — shows for everyone */}
        <SlaPanel ticket={ticket} />

        {/* Timeline */}
        <Timeline ticket={ticket} />

        {/* Comments section */}
        <div className="bg-white rounded-lg shadow-sm p-6">

          {/* Tabs — staff sees both, students only see public */}
          {isStaff && (
            <div className="flex gap-4 mb-6 border-b border-gray-100">
              <TabButton
                label={`Public Comments (${ticket.comments.filter(c => !c.isInternal).length})`}
                active={activeTab === 'public'}
                color="blue"
                onClick={() => setActiveTab('public')}
              />
              <TabButton
                label={`Internal Notes (${ticket.comments.filter(c => c.isInternal).length})`}
                active={activeTab === 'internal'}
                color="purple"
                onClick={() => setActiveTab('internal')}
              />
              <TabButton
                label={`Audit Log (${auditLog.length})`}
                active={activeTab === 'audit'}
                color="gray"
                onClick={() => setActiveTab('audit')}
              />
            </div>
          )}

          {/* Filtered comment list */}
          {(() => {
            const filtered = isStaff
              ? ticket.comments.filter(c => activeTab === 'public' ? !c.isInternal : c.isInternal)
              : ticket.comments;

            return (
              <>
                {filtered.length === 0 && (
                  <p className="text-gray-400 text-sm mb-4">
                    {activeTab === 'internal' ? 'No internal notes yet.' : 'No comments yet.'}
                  </p>
                )}

                <div className="flex flex-col gap-4 mb-6">
                  {filtered.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        comment.isInternal
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {comment.author.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {comment.author.name}
                          </span>
                          {comment.isInternal && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                              internal
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Audit log tab */}
          {isStaff && activeTab === 'audit' && (
            <div className="flex flex-col gap-3 mb-6">
              {auditLog.length === 0 && (
                <p className="text-gray-400 text-sm">No audit entries.</p>
              )}
              {auditLog.map(entry => (
                <div key={entry.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 font-mono">
                        {entry.action}
                      </span>
                      {entry.actor && (
                        <span className="text-xs text-gray-400">
                          by {entry.actor.name}
                        </span>
                      )}
                    </div>
                    {entry.oldValue && entry.newValue && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.oldValue} → {entry.newValue}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment / note form */}
          {/* Only show comment form on public/internal tabs */}
          {activeTab !== 'audit' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              setCommentError(null);
              setCommentLoading(true);
              try {
                if (isStaff && activeTab === 'internal') {
                  await addInternalNote(ticket.id, { content: comment });
                } else {
                  await addComment(ticket.id, { content: comment });
                }
                setComment('');
                const data = await getTicket(id);
                setTicket(data);
              } catch (err) {
                setCommentError(err.message);
              } finally {
                setCommentLoading(false);
              }
            }}
            className="pt-4 border-t border-gray-100"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isStaff && activeTab === 'internal' ? 'Add internal note' : 'Add a comment'}
            </label>

            {commentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">
                {commentError}
              </div>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                isStaff && activeTab === 'internal'
                  ? 'border-purple-200 focus:ring-purple-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder={
                isStaff && activeTab === 'internal'
                  ? 'Write an internal note (only visible to staff)...'
                  : 'Write your comment here...'
              }
              rows={3}
            />

            <button
              type="submit"
              disabled={commentLoading || !comment.trim()}
              className={`mt-2 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isStaff && activeTab === 'internal'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {commentLoading
                ? 'Posting...'
                : isStaff && activeTab === 'internal'
                  ? 'Post Internal Note'
                  : 'Post Comment'}
            </button>
          </form>
          )}

        </div>

      </div>
    </Layout>
  );
}

// Mirrors the ALLOWED_TRANSITIONS from the backend
// so we only show buttons for valid transitions
function getAvailableTransitions(currentStatus) {
  const transitions = {
    OPEN:        ['IN_PROGRESS', 'NEEDS_INFO', 'CANCELLED'],
    NEEDS_INFO:  ['OPEN', 'CANCELLED'],
    IN_PROGRESS: ['RESOLVED', 'NEEDS_INFO'],
    RESOLVED:    ['CLOSED', 'REOPENED'],
    CLOSED:      [],
    CANCELLED:   [],
    REOPENED:    ['IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'],
  };
  return transitions[currentStatus] || [];
}

function SlaPanel({ ticket }) {
  const now = new Date();

  function formatDeadline(dateStr) {
    if (!dateStr) return null;
    const due     = new Date(dateStr);
    const diffMs  = due - now;
    const overdue = diffMs < 0;
    const abs     = Math.abs(diffMs);

    const days  = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (days > 0)        text += `${days}d `;
    if (hours > 0)       text += `${hours}h `;
    if (mins > 0 || !text) text += `${mins}m`;
    text = text.trim();

    return {
      date:    due.toLocaleString(),
      text:    overdue ? `Overdue by ${text}` : `${text} remaining`,
      overdue,
    };
  }

  const response = formatDeadline(ticket.responseDueAt);
  const resolve  = formatDeadline(ticket.resolveDueAt);

  // Don't show if no SLA policy was applied
  if (!response && !resolve) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <h3 className="font-semibold text-gray-800 mb-3 text-sm">
        SLA Deadlines
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {response && !ticket.firstResponseAt && (
          <div>
            <p className="text-xs text-gray-400 mb-1">First response due</p>
            <p className={`text-sm font-medium ${
              ticket.isResponseBreached ? 'text-red-600' : 'text-gray-700'
            }`}>
              {response.text}
            </p>
            <p className="text-xs text-gray-400">{response.date}</p>
          </div>
        )}
        {ticket.firstResponseAt && (
          <div>
            <p className="text-xs text-gray-400 mb-1">First response</p>
            <p className="text-sm font-medium text-green-600">✓ Responded</p>
            <p className="text-xs text-gray-400">
              {new Date(ticket.firstResponseAt).toLocaleString()}
            </p>
          </div>
        )}
        {resolve && !['RESOLVED','CLOSED','CANCELLED'].includes(ticket.status) && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Resolution due</p>
            <p className={`text-sm font-medium ${
              ticket.isResolveBreached ? 'text-red-600' : 'text-gray-700'
            }`}>
              {resolve.text}
            </p>
            <p className="text-xs text-gray-400">{resolve.date}</p>
          </div>
        )}
        {['RESOLVED','CLOSED'].includes(ticket.status) && ticket.resolvedAt && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Resolved</p>
            <p className="text-sm font-medium text-green-600">✓ Resolved</p>
            <p className="text-xs text-gray-400">
              {new Date(ticket.resolvedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Timeline({ ticket }) {
  // Build timeline events from ticket data we already have
  const events = [];

  events.push({
    label: 'Ticket submitted',
    time:  ticket.createdAt,
    icon:  '📋',
  });

  if (ticket.assignee) {
    events.push({
      label: `Assigned to ${ticket.assignee.name}`,
      time:  ticket.updatedAt,
      icon:  '👤',
    });
  }

  if (ticket.firstResponseAt) {
    events.push({
      label: 'First response received',
      time:  ticket.firstResponseAt,
      icon:  '💬',
    });
  }

  if (ticket.resolvedAt) {
    events.push({
      label: 'Ticket resolved',
      time:  ticket.resolvedAt,
      icon:  '✅',
    });
  }

  if (ticket.status === 'CLOSED') {
    events.push({
      label: 'Ticket closed',
      time:  ticket.updatedAt,
      icon:  '🔒',
    });
  }

  if (ticket.status === 'CANCELLED') {
    events.push({
      label: 'Ticket cancelled',
      time:  ticket.updatedAt,
      icon:  '❌',
    });
  }

  if (ticket.status === 'REOPENED') {
    events.push({
      label: 'Ticket reopened',
      time:  ticket.updatedAt,
      icon:  '🔄',
    });
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm">Timeline</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

        <div className="flex flex-col gap-4">
          {events.map((event, i) => (
            <div key={i} className="flex gap-4 items-start">
              {/* Icon sits on the line */}
              <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs shrink-0 relative z-10">
                {event.icon}
              </div>
              <div className="pt-0.5">
                <p className="text-sm text-gray-700">{event.label}</p>
                <p className="text-xs text-gray-400">
                  {new Date(event.time).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, color, onClick }) {
  const activeColors = {
    blue:   'border-blue-600 text-blue-600',
    purple: 'border-purple-600 text-purple-600',
    gray:   'border-gray-600 text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? activeColors[color]
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default TicketDetailPage;