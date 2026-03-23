import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationsRead } from '../services/api';

// Icon map — different emoji per notification type
const TYPE_ICONS = {
  TICKET_ASSIGNED: '📋',
  STATUS_CHANGED:  '🔄',
  COMMENT_ADDED:   '💬',
  SLA_BREACHED:    '⚠️',
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]                   = useState(false);
  const [loading, setLoading]             = useState(false);
  const navigate  = useNavigate();
  const dropdownRef = useRef(null);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  // Close dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // silently fail — don't break the UI if polling fails
    }
  }

  async function handleOpen() {
    const wasOpen = open;
    setOpen(prev => !prev);

    // When opening — mark all as read
    if (!wasOpen && notifications.length > 0) {
      try {
        await markNotificationsRead();
        // Clear the badge immediately so it feels responsive
        // The next poll will confirm they're read
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch {
        // silently fail
      }
    }
  }

  async function handleClick(notification) {
    setOpen(false);
    if (notification.ticketId) {
      navigate(`/tickets/${notification.ticketId}`);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        {/* Bell icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50">

          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-blue-600">{unreadCount} unread</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-400 text-sm">No new notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    !n.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="text-lg shrink-0 mt-0.5">
                      {TYPE_ICONS[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// Converts a timestamp to a human-readable relative time
// e.g. "2 minutes ago", "3 hours ago", "yesterday"
function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default NotificationBell;