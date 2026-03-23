const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');
const AppError = require('../utils/AppError');
const { createNotification } = require('./notification.service');

const ALLOWED_TRANSITIONS = {
  OPEN: ['IN_PROGRESS','NEEDS_INFO','CANCELLED'],
  NEEDS_INFO: ['OPEN','CANCELLED'],
  IN_PROGRESS: ['RESOLVED','NEEDS_INFO'],
  RESOLVED: ['CLOSED','REOPENED'],
  CLOSED: [],
  CANCELLED: [],
  REOPENED: ['IN_PROGRESS','NEEDS_INFO','RESOLVED']
};

/*
 * Permissions per role for certain actions.
 * - Students: can OPEN (create), CANCEL (if not IN_PROGRESS), REOPEN within 7 days, CLOSE (confirm).
 * - Agents: can set IN_PROGRESS, NEEDS_INFO, RESOLVED (but not CLOSE)
 * - Supervisors/Admin: can assign, change priority, and override status.
 */
function canUserChangeTo({ actorRole, actorId, actorDepartmentId, ticket, newStatus }) {
  // Admin/Supervisor override allowed
  if (actorRole === 'ADMIN' || actorRole === 'SUPERVISOR') return { allowed: true, reason: 'supervisor_or_admin' };

  // Student rules
  if (actorRole === 'STUDENT') {

    // Students can only close if RESOLVED and ticket belongs to them
    if (newStatus === 'CLOSED' && ticket.status === 'RESOLVED' && ticket.studentId === actorId) {
      return { allowed: true };
    }

    // Students can only CANCEL if ticket not IN_PROGRESS and ticket belongs to student
    if (newStatus === 'CANCELLED' && ticket.studentId === actorId && ticket.status !== 'IN_PROGRESS') {
      return { allowed: true };
    }

    // Students can REOPEN within 7 days only if they are owner and ticket was RESOLVED
    if (newStatus === 'REOPENED' && ticket.studentId === actorId) {
      if (!ticket.resolvedAt) return { allowed: false, reason: 'ticket_not_resolved' };
      const diffMs = Date.now() - new Date(ticket.resolvedAt).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) return { allowed: true };
      return { allowed: false, reason: 'reopen_window_passed' };
    }

    // Students cannot set IN_PROGRESS/NEEDS_INFO/RESOLVED
    return { allowed: false, reason: 'students_cannot_set_this_status' };
  }

  // Agent rules
  if (actorRole === 'AGENT') {
    // Agents may set IN_PROGRESS, NEEDS_INFO, RESOLVED if they are assigned or in same department
    if (['IN_PROGRESS', 'NEEDS_INFO', 'RESOLVED'].includes(newStatus)) {
      if (ticket.assigneeId === actorId) return { allowed: true };
      // If not assigned, allow agent only if same department
      if (ticket.departmentId && ticket.departmentId === actorDepartmentId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'agent_must_be_assignee_or_same_department' };
    }
    // Agents cannot CLOSE or CANCEL or REOPEN
    return { allowed: false, reason: 'agent_limited_permissions' };
  }

  // Default: deny
  return { allowed: false, reason: 'no_rule_matched' };
}

/**
 * Validate allowed transition from current to newStatus.
 */
function validateTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (allowed.includes(newStatus)) return { ok: true };
  return { ok: false, reason: `transition_not_allowed: ${currentStatus} -> ${newStatus}` };
}

/**
 * Change status central method.
 */
async function changeTicketStatus({ ticketId, actor, newStatus, reason = null }) {
  // actor: { id, role, departmentId }
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', 404);

  // Validate transition
  const v = validateTransition(ticket.status, newStatus);
  if (!v.ok) {
    // Allow override for supervisor/admin
    if (!(actor.role === 'SUPERVISOR' || actor.role === 'ADMIN')) {
      throw new AppError(v.reason, 422);
    }
  }

  // Permission check — pass actorDepartmentId from actor object
  const perm = canUserChangeTo({
    actorRole: actor.role,
    actorId: actor.id,
    actorDepartmentId: actor.departmentId || null,
    ticket,
    newStatus
  });
  if (!perm.allowed) {
    throw new AppError('Forbidden: ' + (perm.reason || 'insufficient_permissions'), 403);
  }

  // Update time fields if relevant
  const updateData = { status: newStatus };
  if (newStatus === 'IN_PROGRESS' && !ticket.firstResponseAt) {
    updateData.firstResponseAt = new Date();
  }
  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }

  const oldValue = ticket.status;
  const updated = await prisma.ticket.update({ where: { id: ticketId }, data: updateData });

  // Audit log
  await createAudit({
    ticketId,
    actorId: actor.id,
    action: 'STATUS_CHANGE',
    oldValue,
    newValue: newStatus,
    meta: reason ? { reason } : null
  });

  // Notify the student their ticket status changed
  // but only if the actor is not the student themselves
  if (actor.id !== ticket.studentId) {
    await createNotification({
      userId:   ticket.studentId,
      ticketId: ticketId,
      type:     'STATUS_CHANGED',
      message:  `Your ticket "${ticket.title}" status changed from ${oldValue} to ${newStatus}.`
    });
  }

  // If reopened or moved to IN_PROGRESS, notify the assignee too
  if (ticket.assigneeId && ticket.assigneeId !== actor.id &&
      ['IN_PROGRESS', 'REOPENED'].includes(newStatus)) {
    await createNotification({
      userId:   ticket.assigneeId,
      ticketId: ticketId,
      type:     'STATUS_CHANGED',
      message:  `Ticket "${ticket.title}" has been updated to ${newStatus}.`
    });
  }

  return updated;
}

module.exports = { changeTicketStatus, ALLOWED_TRANSITIONS };
