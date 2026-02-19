const prisma = require('../prismaClient');
const { createAudit } = require('./audit.service');

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
function canUserChangeTo({ actorRole, actorId, ticket, newStatus }) {
  //Admin/Supervisor override allowed
  if (actorRole === 'ADMIN' || actorRole === 'SUPERVISOR') return { allowed: true, reason: 'supervisor_or_admin' };

  //student rules
  if (actorRole === 'STUDENT') {
    
    //students can only close if RESOLVED
    if (newStatus === 'CLOSED' && ticket.status === 'RESOLVED' && ticket.studentId === actorId) {
      return { allowed: true };
    }
    
    //students can only CANCEL only if ticket not IN_PROGRESS and ticket belongs to student
    if (newStatus === 'CANCELLED' && ticket.studentId === actorId && ticket.status !== 'IN_PROGRESS') {
      return { allowed: true };
    }
    
    //students can REOPEN within 7 days only if they are owner and ticket was RESOLVED
    if (newStatus === 'REOPENED' && ticket.studentId === actorId) {
      if (!ticket.resolvedAt) return { allowed: false, reason: 'ticket_not_resolved' };
      const diffMs = Date.now() - new Date(ticket.resolvedAt).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) return { allowed: true };
      return { allowed: false, reason: 'reopen_window_passed' };
    }
    
    //students cannot set IN_PROGRESS/NEEDS_INFO/RESOLVED
    return { allowed: false, reason: 'students_cannot_set_this_status' };
  }

  // Agent rules
  if (actorRole === 'AGENT') {
    // Agents may set IN_PROGRESS, NEEDS_INFO, RESOLVED if they are assigned OR department agent allowed
    if (['IN_PROGRESS','NEEDS_INFO','RESOLVED'].includes(newStatus)) {
      // assigned agent or unassigned but agent in same department? For now require either assigned or same department
      if (ticket.assigneeId === actorId) return { allowed: true };
      // If not assigned, allow agent only if same department (works for small teams)
        // If same department
        if (ticket.departmentId === actorDepartmentId) { return { allowed: true }; }
        
        return { allowed: false, reason: 'agent_must_be_assignee' };
    }
    // Agents cannot CLOSE or CANCEL or REOPEN (these are student or supervisor/admin)
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
  // actor: { id, role }
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  if (!ticket) throw new Error('Ticket not found');

  // Validate transition
  const v = validateTransition(ticket.status, newStatus);
  if (!v.ok) {
    // Allow override for supervisor/admin
    if (!(actor.role === 'SUPERVISOR' || actor.role === 'ADMIN')) {
      throw new Error(v.reason);
    }
  }

  // Permission check
  const perm = canUserChangeTo({ actorRole: actor.role, actorId: actor.id, ticket, newStatus });
  if (!perm.allowed) {
    // allow supervisors/admin even if transition validation failed above - but perm check fails only for non-supervisors
    throw new Error('Forbidden: ' + (perm.reason || 'insufficient_permissions'));
  }

  // Update time fields if relevant
  const updateData = { status: newStatus };
  if (newStatus === 'IN_PROGRESS' && !ticket.firstResponseAt) {
    updateData.firstResponseAt = new Date();
  }
  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }
  if (newStatus === 'CLOSED') {
    // closedAt field not added to Ticket model earlier; we can reuse resolvedAt or add closedAt in future phases. For now just update status.
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

  return updated;
}

module.exports = { changeTicketStatus, ALLOWED_TRANSITIONS };
