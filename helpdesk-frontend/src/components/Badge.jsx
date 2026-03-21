const PRIORITY_STYLES = {
  LOW:    'bg-gray-100 text-gray-600',
  MED:    'bg-blue-100 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_STYLES = {
  OPEN:        'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  NEEDS_INFO:  'bg-yellow-100 text-yellow-700',
  RESOLVED:    'bg-purple-100 text-purple-700',
  CLOSED:      'bg-gray-100 text-gray-500',
  CANCELLED:   'bg-red-100 text-red-500',
  REOPENED:    'bg-orange-100 text-orange-700',
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}